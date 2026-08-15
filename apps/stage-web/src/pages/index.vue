<script setup lang="ts">
import type { ChatProvider } from '@xsai-ext/providers/utils'

import Header from '@proj-airi/stage-layouts/components/Layouts/Header.vue'
import InteractiveArea from '@proj-airi/stage-layouts/components/Layouts/InteractiveArea.vue'
import MobileHeader from '@proj-airi/stage-layouts/components/Layouts/MobileHeader.vue'
import MobileInteractiveArea from '@proj-airi/stage-layouts/components/Layouts/MobileInteractiveArea.vue'
import workletUrl from '@proj-airi/stage-ui/workers/vad/process.worklet?worker&url'

import { BackgroundProvider } from '@proj-airi/stage-layouts/components/Backgrounds'
import { useBackgroundThemeColor } from '@proj-airi/stage-layouts/composables/theme-color'
import { useBackgroundStore } from '@proj-airi/stage-layouts/stores/background'
import { WidgetStage } from '@proj-airi/stage-ui/components/scenes'
import { useAudioRecorder } from '@proj-airi/stage-ui/composables/audio/audio-recorder'
import { useVAD } from '@proj-airi/stage-ui/stores/ai/models/vad'
import { useAutoGLMStore } from '@proj-airi/stage-ui/stores/autoglm'
import { useChatOrchestratorStore } from '@proj-airi/stage-ui/stores/chat'
import { useLive2d } from '@proj-airi/stage-ui/stores/live2d'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useHearingSpeechInputPipeline } from '@proj-airi/stage-ui/stores/modules/hearing'
import { useProvidersStore } from '@proj-airi/stage-ui/stores/providers'
import { useSettingsAudioDevice } from '@proj-airi/stage-ui/stores/settings'
import { useStageDisplayStore } from '@proj-airi/stage-ui/stores/stage-display'
import { breakpointsTailwind, useBreakpoints, useMouse } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

const paused = ref(false)
const stageDisplayStore = useStageDisplayStore()

function handleSettingsOpen(open: boolean) {
  paused.value = open
}

const positionCursor = useMouse()
const stageFocusAt = ref({ x: 0, y: 0 })
const { scale, position, positionInPercentageString } = storeToRefs(useLive2d())
const { immersiveStageEnabled } = storeToRefs(stageDisplayStore)
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')
const focusDeadzone = computed(() => isMobile.value ? { x: 12, y: 12 } : { x: 18, y: 18 })
const focusSmoothing = computed(() => isMobile.value ? { x: 0.12, y: 0.1 } : { x: 0.08, y: 0.07 })

watch([() => positionCursor.x.value, () => positionCursor.y.value], ([x, y]) => {
  const previous = stageFocusAt.value
  const deltaX = x - previous.x
  const deltaY = y - previous.y

  stageFocusAt.value = {
    x: Math.abs(deltaX) <= focusDeadzone.value.x ? previous.x : previous.x + (deltaX * focusSmoothing.value.x),
    y: Math.abs(deltaY) <= focusDeadzone.value.y ? previous.y : previous.y + (deltaY * focusSmoothing.value.y),
  }
}, { immediate: true })

const backgroundStore = useBackgroundStore()
const { selectedOption, sampledColor } = storeToRefs(backgroundStore)
const backgroundSurface = useTemplateRef<InstanceType<typeof BackgroundProvider>>('backgroundSurface')

const { syncBackgroundTheme } = useBackgroundThemeColor({ backgroundSurface, selectedOption, sampledColor })
onMounted(() => syncBackgroundTheme())

// Audio + transcription pipeline (mirrors stage-tamagotchi)
const settingsAudioDeviceStore = useSettingsAudioDevice()
const { stream, enabled } = storeToRefs(settingsAudioDeviceStore)
const { startRecord, stopRecord, onStopRecord } = useAudioRecorder(stream)
const hearingPipeline = useHearingSpeechInputPipeline()
const { transcribeForRecording } = hearingPipeline
const { supportsStreamInput } = storeToRefs(hearingPipeline)
const providersStore = useProvidersStore()
const consciousnessStore = useConsciousnessStore()
const { activeProvider: activeChatProvider, activeModel: activeChatModel } = storeToRefs(consciousnessStore)
const chatStore = useChatOrchestratorStore()
const autoGLM = useAutoGLMStore()

const shouldUseStreamInput = computed(() => supportsStreamInput.value && !!stream.value)

const {
  init: initVAD,
  dispose: disposeVAD,
  start: startVAD,
  loaded: vadLoaded,
} = useVAD(workletUrl, {
  threshold: ref(0.6),
  onSpeechStart: () => handleSpeechStart(),
  onSpeechEnd: () => handleSpeechEnd(),
})

let stopOnStopRecord: (() => void) | undefined

async function startAudioInteraction() {
  try {
    await initVAD()
    if (stream.value)
      await startVAD(stream.value)

    // Hook once
    stopOnStopRecord = onStopRecord(async (recording) => {
      const text = await transcribeForRecording(recording)
      if (!text || !text.trim())
        return

      try {
        if (autoGLM.shouldHandleChat) {
          await chatStore.ingest(text, {})
          return
        }

        const provider = await providersStore.getProviderInstance(activeChatProvider.value)
        if (!provider || !activeChatModel.value)
          return

        await chatStore.ingest(text, { model: activeChatModel.value, chatProvider: provider as ChatProvider })
      }
      catch (err) {
        console.error('Failed to send chat from voice:', err)
      }
    })
  }
  catch (e) {
    console.error('Audio interaction init failed:', e)
  }
}

async function handleSpeechStart() {
  // For streaming providers, ChatArea component handles transcription manually
  // The main page should not start automatic transcription to avoid duplicate sessions
  if (shouldUseStreamInput.value) {
    return
  }

  startRecord()
}

async function handleSpeechEnd() {
  if (shouldUseStreamInput.value) {
    // Keep streaming session alive; idle timer in pipeline will handle teardown.
    return
  }

  stopRecord()
}

function stopAudioInteraction() {
  try {
    stopOnStopRecord?.()
    stopOnStopRecord = undefined
    disposeVAD()
  }
  catch {}
}

watch(enabled, async (val) => {
  if (val) {
    await startAudioInteraction()
  }
  else {
    stopAudioInteraction()
  }
}, { immediate: true })

onUnmounted(() => {
  stopAudioInteraction()
})

watch([stream, () => vadLoaded.value], async ([s, loaded]) => {
  if (enabled.value && loaded && s) {
    try {
      await startVAD(s)
    }
    catch (e) {
      console.error('Failed to start VAD with stream:', e)
    }
  }
})

const stageVisibilityTitle = computed(() => immersiveStageEnabled.value
  ? 'Restore interface'
  : 'Show character only')
</script>

<template>
  <BackgroundProvider
    ref="backgroundSurface"
    class="widgets top-widgets"
    :background="selectedOption"
    :top-color="sampledColor"
  >
    <div relative flex="~ col" z-2 h-100dvh w-100vw of-hidden>
      <!-- header -->
      <div v-if="!immersiveStageEnabled" class="px-0 py-1 md:px-3 md:py-3" w-full gap-2>
        <Header class="hidden md:flex" />
        <MobileHeader class="flex md:hidden" />
      </div>
      <!-- page -->
      <div relative flex="~ 1 row gap-y-0 gap-x-2 <md:col">
        <WidgetStage
          flex-1 min-w="1/2"
          :paused="paused"
          :focus-at="{
            x: stageFocusAt.x,
            y: stageFocusAt.y,
          }"
          :x-offset="`${isMobile ? position.x : position.x - 10}%`"
          :y-offset="positionInPercentageString.y"
          :scale="scale"
        />
        <InteractiveArea
          v-if="!isMobile && !immersiveStageEnabled"
          h="85dvh"
          absolute
          right-4
          w="[min(420px,38vw)]"
          max-w="[420px]"
          min-w-0
          flex
          flex-col
        />
        <MobileInteractiveArea v-if="isMobile && !immersiveStageEnabled" @settings-open="handleSettingsOpen" />
        <button
          v-if="immersiveStageEnabled"
          :class="[
            'absolute right-3 top-3 z-30',
            'flex items-center justify-center rounded-xl',
            'bg-neutral-50/45 p-1.5 backdrop-blur-md dark:bg-neutral-900/45',
            'transition-opacity duration-200 ease-in-out hover:op-100',
            'op-65',
          ]"
          :title="stageVisibilityTitle"
          :aria-label="stageVisibilityTitle"
          @click="stageDisplayStore.toggleImmersiveStage()"
        >
          <div class="i-solar:eye-outline size-3.5 text-neutral-700 dark:text-neutral-200" />
        </button>
      </div>
    </div>
  </BackgroundProvider>
</template>

<route lang="yaml">
name: IndexScenePage
meta:
  layout: stage
  stageTransition:
    name: bubble-wave-out
</route>
