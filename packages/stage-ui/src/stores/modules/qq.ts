import type { WebSocketBaseEvent, WebSocketEvents } from '@proj-airi/server-sdk'

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useConfiguratorByModsChannelServer } from '../configurator'
import { useModsServerChannelStore } from '../mods/api/channel-server'

type QQStatusKind = 'disabled' | 'missing-config' | 'idle' | 'syncing' | 'waiting-for-service' | 'connecting' | 'ready' | 'error'
type ModuleStatusEvent = WebSocketBaseEvent<'module:status', WebSocketEvents['module:status']>

export const useQQStore = defineStore('qq', () => {
  const configurator = useConfiguratorByModsChannelServer()
  const modsChannel = useModsServerChannelStore()
  const { connected: serverConnected } = storeToRefs(modsChannel)
  const enabled = useLocalStorageManualReset<boolean>('settings/qq/enabled', false)
  const wsUrl = useLocalStorageManualReset<string>('settings/qq/wsUrl', '')
  const accessToken = useLocalStorageManualReset<string>('settings/qq/accessToken', '')
  const statusKind = ref<QQStatusKind>('idle')
  const statusMessage = ref('')
  const lastError = ref('')
  const lastSyncAt = ref<number>()
  const lastStatusAt = ref<number>()
  let backendSyncTimer: ReturnType<typeof setInterval> | undefined
  let statusTimeout: ReturnType<typeof setTimeout> | undefined
  let statusListenerDisposer: (() => void) | undefined
  let statusListenerReady: Promise<void> | undefined

  const configured = computed(() => !!wsUrl.value.trim())
  const isConnecting = computed(() => ['syncing', 'waiting-for-service', 'connecting'].includes(statusKind.value))

  async function syncSettingsToBackend() {
    await ensureStatusListener()
    clearStatusTimeout()
    lastError.value = ''

    if (!enabled.value) {
      statusKind.value = 'disabled'
      statusMessage.value = 'QQ integration is disabled.'
    }
    else if (!configured.value) {
      statusKind.value = 'missing-config'
      statusMessage.value = 'Enter the NapCat WebSocket URL to connect.'
    }
    else {
      statusKind.value = 'syncing'
      statusMessage.value = 'Sending QQ configuration to the local bot service.'
    }

    try {
      await configurator.updateFor('qq', {
        wsUrl: wsUrl.value,
        accessToken: accessToken.value,
        enabled: enabled.value,
      })
      lastSyncAt.value = Date.now()

      if (!enabled.value || !configured.value)
        return

      statusKind.value = 'waiting-for-service'
      statusMessage.value = 'Waiting for QQ bot service to connect to NapCat.'
      startStatusTimeout()
    }
    catch (error) {
      statusKind.value = 'error'
      statusMessage.value = 'Failed to send QQ configuration.'
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('Failed to synchronize QQ settings:', error)
    }
  }

  function startBackendSync() {
    stopBackendSync()
    void syncSettingsToBackend()

    if (!enabled.value || !configured.value)
      return

    backendSyncTimer = setInterval(() => {
      if (!enabled.value || !configured.value) {
        stopBackendSync()
        return
      }

      void syncSettingsToBackend()
    }, 10_000)
  }

  function stopBackendSync() {
    if (!backendSyncTimer)
      return

    clearInterval(backendSyncTimer)
    backendSyncTimer = undefined
  }

  function saveSettings() {
    startBackendSync()
  }

  function retryConnection() {
    saveSettings()
  }

  function resetState() {
    enabled.reset()
    wsUrl.reset()
    accessToken.reset()
    saveSettings()
  }

  function clearStatusTimeout() {
    if (!statusTimeout)
      return

    clearTimeout(statusTimeout)
    statusTimeout = undefined
  }

  function startStatusTimeout() {
    clearStatusTimeout()
    statusTimeout = setTimeout(() => {
      if (!enabled.value || !configured.value)
        return

      if (statusKind.value === 'waiting-for-service' || statusKind.value === 'syncing') {
        statusKind.value = 'error'
        statusMessage.value = serverConnected.value
          ? 'QQ bot service did not report back.'
          : 'Local messaging server is not connected.'
        lastError.value = serverConnected.value
          ? 'Check that @proj-airi/qq-bot is running, then retry.'
          : 'Check that @proj-airi/server-runtime is running on ws://localhost:6121/ws, then retry.'
      }
    }, 8_000)
  }

  function handleModuleStatus(event: ModuleStatusEvent) {
    const identity = event.data.identity
    const source = event.metadata?.source
    const isQQ = identity?.plugin?.id === 'qq' || source?.plugin?.id === 'qq'
    if (!isQQ)
      return

    clearStatusTimeout()
    lastStatusAt.value = Date.now()

    const details = event.data.details ?? {}
    const state = typeof details.state === 'string' ? details.state : ''
    const error = typeof details.error === 'string' ? details.error : ''

    statusMessage.value = event.data.reason ?? ''
    lastError.value = error

    if (event.data.phase === 'ready') {
      statusKind.value = 'ready'
      lastError.value = ''
      return
    }

    if (event.data.phase === 'failed') {
      statusKind.value = 'error'
      return
    }

    if (state === 'disabled') {
      statusKind.value = 'disabled'
      return
    }

    if (state === 'waiting-for-config') {
      statusKind.value = 'missing-config'
      return
    }

    if (event.data.phase === 'preparing') {
      statusKind.value = 'connecting'
      return
    }

    statusKind.value = enabled.value ? 'waiting-for-service' : 'disabled'
  }

  function ensureStatusListener() {
    if (statusListenerReady)
      return statusListenerReady

    statusListenerReady = modsChannel.ensureConnected()
      .catch(() => undefined)
      .then(() => {
        if (!statusListenerDisposer)
          statusListenerDisposer = modsChannel.onEvent('module:status', handleModuleStatus)
      })

    return statusListenerReady
  }

  function stopStatusListener() {
    statusListenerDisposer?.()
    statusListenerDisposer = undefined
    statusListenerReady = undefined
  }

  watch([enabled, wsUrl, accessToken], () => startBackendSync())
  watch(serverConnected, (connected) => {
    if (!enabled.value || !configured.value)
      return

    if (!connected) {
      clearStatusTimeout()
      statusKind.value = 'error'
      statusMessage.value = 'Local messaging server is not connected.'
      lastError.value = 'Check that @proj-airi/server-runtime is running on ws://localhost:6121/ws, then retry.'
      return
    }

    if (lastError.value.includes('@proj-airi/server-runtime'))
      startBackendSync()
  })

  return {
    enabled,
    wsUrl,
    accessToken,
    configured,
    statusKind,
    statusMessage,
    lastError,
    lastSyncAt,
    lastStatusAt,
    serverConnected,
    isConnecting,
    saveSettings,
    retryConnection,
    startBackendSync,
    stopBackendSync,
    stopStatusListener,
    resetState,
  }
})
