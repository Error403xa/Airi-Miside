import type { WebSocketBaseEvent, WebSocketEvents } from '@proj-airi/server-sdk'

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useConfiguratorByModsChannelServer } from '../configurator'
import { useModsServerChannelStore } from '../mods/api/channel-server'

type DiscordStatusKind = 'disabled' | 'missing-token' | 'idle' | 'syncing' | 'waiting-for-service' | 'connecting' | 'ready' | 'error'
type ModuleStatusEvent = WebSocketBaseEvent<'module:status', WebSocketEvents['module:status']>

export const useDiscordStore = defineStore('discord', () => {
  const configurator = useConfiguratorByModsChannelServer()
  const modsChannel = useModsServerChannelStore()
  const { connected: serverConnected } = storeToRefs(modsChannel)
  const enabled = useLocalStorageManualReset<boolean>('settings/discord/enabled', false)
  const token = useLocalStorageManualReset<string>('settings/discord/token', '')
  const statusKind = ref<DiscordStatusKind>('idle')
  const statusMessage = ref('')
  const lastError = ref('')
  const botUsername = ref('')
  const lastSyncAt = ref<number>()
  const lastStatusAt = ref<number>()
  let backendSyncTimer: ReturnType<typeof setInterval> | undefined
  let statusTimeout: ReturnType<typeof setTimeout> | undefined
  let statusListenerDisposer: (() => void) | undefined
  let statusListenerReady: Promise<void> | undefined

  const configured = computed(() => !!token.value.trim())
  const isConnecting = computed(() => ['syncing', 'waiting-for-service', 'connecting'].includes(statusKind.value))

  async function syncSettingsToBackend() {
    await ensureStatusListener()
    clearStatusTimeout()
    lastError.value = ''

    if (!enabled.value) {
      statusKind.value = 'disabled'
      statusMessage.value = 'Discord integration is disabled.'
    }
    else if (!configured.value) {
      statusKind.value = 'missing-token'
      statusMessage.value = 'Enter a Discord bot token to connect.'
    }
    else {
      statusKind.value = 'syncing'
      statusMessage.value = 'Sending Discord configuration to the local bot service.'
    }

    try {
      await configurator.updateFor('discord', {
        token: token.value,
        enabled: enabled.value,
      })
      lastSyncAt.value = Date.now()

      if (!enabled.value || !configured.value)
        return

      statusKind.value = 'waiting-for-service'
      statusMessage.value = 'Waiting for Discord bot service to validate the token.'
      startStatusTimeout()
    }
    catch (error) {
      statusKind.value = 'error'
      statusMessage.value = 'Failed to send Discord configuration.'
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('Failed to synchronize Discord settings:', error)
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
    token.reset()
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
          ? 'Discord bot service did not report back.'
          : 'Local messaging server is not connected.'
        lastError.value = serverConnected.value
          ? 'Check that @proj-airi/discord-bot is running, then retry.'
          : 'Check that @proj-airi/server-runtime is running on ws://localhost:6121/ws, then retry.'
      }
    }, 8_000)
  }

  function handleModuleStatus(event: ModuleStatusEvent) {
    const identity = event.data.identity
    const source = event.metadata?.source
    const isDiscord = identity?.plugin?.id === 'discord' || source?.plugin?.id === 'discord'
    if (!isDiscord)
      return

    clearStatusTimeout()
    lastStatusAt.value = Date.now()

    const details = event.data.details ?? {}
    const state = typeof details.state === 'string' ? details.state : ''
    const username = typeof details.username === 'string' ? details.username : ''
    const error = typeof details.error === 'string' ? details.error : ''

    botUsername.value = username
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

    if (state === 'waiting-for-token') {
      statusKind.value = 'missing-token'
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

  watch([enabled, token], () => startBackendSync())
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
    token,
    configured,
    statusKind,
    statusMessage,
    lastError,
    botUsername,
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
