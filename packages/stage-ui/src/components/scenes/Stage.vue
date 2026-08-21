<script setup lang="ts">
import type { DuckDBWasmDrizzleDatabase } from '@proj-airi/drizzle-duckdb-wasm'
import type { Live2DLipSync, Live2DLipSyncOptions } from '@proj-airi/model-driver-lipsync'
import type { Profile } from '@proj-airi/model-driver-lipsync/shared/wlipsync'
import type { SpeechProviderWithExtraOptions } from '@xsai-ext/providers/utils'
import type { UnElevenLabsOptions } from 'unspeech'

import type { EmotionPayload } from '../../constants/emotions'
import type { DisplayModel } from '../../stores/display-models'

import { drizzle } from '@proj-airi/drizzle-duckdb-wasm'
import { getImportUrlBundles } from '@proj-airi/drizzle-duckdb-wasm/bundles/import-url-browser'
import { createLive2DLipSync } from '@proj-airi/model-driver-lipsync'
import { wlipsyncProfile } from '@proj-airi/model-driver-lipsync/shared/wlipsync'
import { createPlaybackManager, createSpeechPipeline } from '@proj-airi/pipelines-audio'
import { Live2DScene, useLive2d } from '@proj-airi/stage-ui-live2d'
import { MINECRAFT_EMOTIONS, MinecraftScene, ThreeScene, useModelStore } from '@proj-airi/stage-ui-three'
import { animations } from '@proj-airi/stage-ui-three/assets/vrm'
import { createQueue } from '@proj-airi/stream-kit'
import { Button } from '@proj-airi/ui'
import { useBroadcastChannel } from '@vueuse/core'
// import { createTransformers } from '@xsai-transformers/embed'
// import embedWorkerURL from '@xsai-transformers/embed/worker?worker&url'
// import { embed } from '@xsai/embed'
import { generateSpeech } from '@xsai/generate-speech'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useDelayMessageQueue, useEmotionsMessageQueue } from '../../composables/queues'
import { llmInferenceEndToken } from '../../constants'
import { EMOTION_EmotionMotionName_value, EMOTION_VRMExpressionName_value, EmotionThinkMotionName } from '../../constants/emotions'
import {
  findLive2DExpressionFile,
  live2dExpressionControlPrompts,
  parseLive2DExpressionControlSpecial,
} from '../../constants/live2d-expression-controls'
import {
  minecraftExpressionControlPrompt,
  minecraftExpressionControls,
  parseMinecraftExpressionControlSpecial,
} from '../../constants/minecraft-expression-controls'
import { useAudioContext, useSpeakingStore } from '../../stores/audio'
import { useChatOrchestratorStore } from '../../stores/chat'
import { DisplayModelFormat, useDisplayModelsStore } from '../../stores/display-models'
import { useAiriCardStore } from '../../stores/modules'
import { useSpeechStore } from '../../stores/modules/speech'
import { useProvidersStore } from '../../stores/providers'
import { useSettings } from '../../stores/settings'
import { useSpeechRuntimeStore } from '../../stores/speech-runtime'
import { useStageDisplayStore } from '../../stores/stage-display'

const props = withDefaults(defineProps<{
  paused?: boolean
  focusAt: { x: number, y: number }
  xOffset?: number | string
  yOffset?: number | string
  scale?: number
}>(), { paused: false, scale: 1 })

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

const db = ref<DuckDBWasmDrizzleDatabase>()
// const transformersProvider = createTransformers({ embedWorkerURL })

const vrmViewerRef = ref<InstanceType<typeof ThreeScene>>()
const live2dSceneRef = ref<InstanceType<typeof Live2DScene>>()
const minecraftSceneRef = ref<InstanceType<typeof MinecraftScene>>()
const interactiveOverlayRef = ref<HTMLElement>()

const settingsStore = useSettings()
const {
  stageModelRenderer,
  stageViewControlsEnabled,
  live2dDisableFocus,
  stageModelSelectedUrl,
  stageModelSelected,
  themeColorsHue,
  themeColorsHueDynamic,
  live2dIdleAnimationEnabled,
  live2dAutoBlinkEnabled,
  live2dForceAutoBlinkEnabled,
  live2dShadowEnabled,
  live2dMaxFps,
} = storeToRefs(settingsStore)
const displayModelsStore = useDisplayModelsStore()
const { displayModels } = storeToRefs(displayModelsStore)
const { mouthOpenSize } = storeToRefs(useSpeakingStore())
const { audioContext } = useAudioContext()
const currentAudioSource = ref<AudioBufferSourceNode>()

const { onBeforeMessageComposed, onAfterMessageComposed, onBeforeSend, onTokenLiteral, onTokenSpecial, onStreamEnd, onAssistantResponseEnd } = useChatOrchestratorStore()
const chatHookCleanups: Array<() => void> = []
// WORKAROUND: clear previous handlers on unmount to avoid duplicate calls when this component remounts.
//             We keep per-hook disposers instead of wiping the global chat hooks to play nicely with
//             cross-window broadcast wiring.

const providersStore = useProvidersStore()
const live2dStore = useLive2d()
const vrmStore = useModelStore()
const {
  currentExpression,
  availableExpressions,
  activeExpressions,
} = storeToRefs(live2dStore)

const showStage = ref(true)
const viewUpdateCleanups: Array<() => void> = []
const showModelDrawer = ref(false)
const showExpressionDrawer = ref(false)
const { immersiveStageEnabled } = storeToRefs(useStageDisplayStore())

const fallbackLive2DModelId = 'preset-live2d-2'
const live2dModelFallbackInProgress = ref(false)

/*
 * Display order for the "switch character" drawer, most-used first: the Mita
 * family, then every Minecraft skin, then anything the user imported, with the
 * bundled Hiyori samples parked at the bottom.
 *
 * Ranked explicitly rather than by relying on the order of `displayModelsPresets`,
 * so adding a preset elsewhere cannot silently reshuffle this list.
 */
const CHARACTER_ORDER: Record<string, number> = {
  'preset-live2d-mita': 0,
  'preset-live2d-xiaomita': 1,
  'preset-live2d-xiaomita-pro': 2,
  'preset-live2d-1': 100, // Hiyori (Pro)
  'preset-live2d-2': 101, // Hiyori (Free)
}

const CHARACTER_RANK_MINECRAFT = 10
const CHARACTER_RANK_IMPORTED = 50

function characterRank(model: DisplayModel): number {
  const pinned = CHARACTER_ORDER[model.id]
  if (pinned !== undefined)
    return pinned

  return model.format === DisplayModelFormat.MinecraftSkin
    ? CHARACTER_RANK_MINECRAFT
    : CHARACTER_RANK_IMPORTED
}

// Live2D and Minecraft skins are both fully driven from a chat session, so they
// share one list; VRM stays out of it because it is selected from the settings
// pane instead.
const characterModels = computed(() => displayModels.value
  .filter(model =>
    model.format === DisplayModelFormat.Live2dZip
    || model.format === DisplayModelFormat.Live2dDirectory
    || model.format === DisplayModelFormat.MinecraftSkin,
  )
  // Equal ranks keep their existing relative order, which is what preserves the
  // alphabetical sort the Minecraft presets are built with.
  .sort((a, b) => characterRank(a) - characterRank(b)),
)
const mitaSelected = computed(() => stageModelSelected.value === 'preset-live2d-mita')
const xiaoMitaSelected = computed(() => stageModelSelected.value === 'preset-live2d-xiaomita')
const xiaoMitaProSelected = computed(() => stageModelSelected.value === 'preset-live2d-xiaomita-pro')
const xiaoMitaLikeSelected = computed(() => xiaoMitaSelected.value || xiaoMitaProSelected.value)
const hasExpressionDrawer = computed(() =>
  stageModelRenderer.value === 'live2d'
  && (mitaSelected.value || xiaoMitaProSelected.value)
  && availableExpressions.value.length > 0,
)
const expressionDrawerTitle = computed(() => xiaoMitaProSelected.value ? '小米塔(pro)表情' : '米塔表情')
const live2dExpressionLabels: Record<string, { displayName: string, emoji: string }> = {
  default: { displayName: '默认表情', emoji: '😐' },
  smile: { displayName: '微笑', emoji: '😊' },
  happy: { displayName: '开心', emoji: '😄' },
  sad: { displayName: '悲伤', emoji: '😢' },
  surprised: { displayName: '惊讶', emoji: '😲' },
  angry: { displayName: '生气', emoji: '😠' },
}
function getExpressionDisplayName(expressionName: string) {
  const label = live2dExpressionLabels[expressionName]
  return label ? `${label.emoji} ${label.displayName}` : expressionName
}
function isExpressionActive(expressionFile: string) {
  return mitaSelected.value
    ? activeExpressions.value.includes(expressionFile)
    : currentExpression.value === expressionFile
}

/*
 * The Minecraft rig has no expression files to enumerate — its nine postures are
 * defined in code — so it gets its own drawer rather than reusing the Live2D one.
 * Being able to trigger a pose by hand also matters more here: emotions otherwise
 * only fire when the model emits an emotion token mid-conversation.
 */
const hasMinecraftEmoteDrawer = computed(() => stageModelRenderer.value === 'minecraft')
const minecraftEmotion = ref<string>('neutral')

/*
 * The drawer and the control-marker prompt list the same nine poses, so both read
 * from `minecraftExpressionControls` rather than keeping parallel label tables that
 * could drift apart.
 */
function getMinecraftEmotionLabel(emotion: string) {
  const control = minecraftExpressionControls.find(entry => entry.id === emotion)
  return control ? `${control.emoji} ${control.label}` : emotion
}

function selectMinecraftEmotion(emotion: string) {
  minecraftEmotion.value = emotion
  minecraftSceneRef.value?.setExpression(emotion)
}
const live2dDisableFocusForSelectedModel = computed(() => mitaSelected.value || xiaoMitaLikeSelected.value || live2dDisableFocus.value)
const live2dDisableIdleEyeFocus = computed(() => mitaSelected.value)
const live2dFocusIgnoreLeftRatio = computed(() => {
  if (mitaSelected.value)
    return 0.38
  if (xiaoMitaLikeSelected.value)
    return 0.28

  return 0
})
const live2dFocusTrackingStrengthX = computed(() => {
  if (mitaSelected.value)
    return 0.72
  if (xiaoMitaLikeSelected.value)
    return 0.85

  return 1
})
const live2dFocusTrackingStrengthY = computed(() => {
  if (mitaSelected.value)
    return 0.58
  if (xiaoMitaLikeSelected.value)
    return 0.78

  return 1
})
const live2dScaleForSelectedModel = computed(() => {
  if (xiaoMitaLikeSelected.value)
    return props.scale * 0.8
  if (mitaSelected.value)
    return props.scale * 0.96

  return props.scale
})
const live2dYOffsetForSelectedModel = computed(() => {
  if (mitaSelected.value)
    return '2%'
  if (xiaoMitaLikeSelected.value)
    return '-3%'

  return props.yOffset
})
const live2dForceAutoBlinkEnabledForSelectedModel = computed(() =>
  mitaSelected.value || xiaoMitaLikeSelected.value || live2dForceAutoBlinkEnabled.value,
)

// Caption + Presentation broadcast channels
type CaptionChannelEvent
  = | { type: 'caption-speaker', text: string }
    | { type: 'caption-assistant', text: string }
const { post: postCaption } = useBroadcastChannel<CaptionChannelEvent, CaptionChannelEvent>({ name: 'airi-caption-overlay' })
const assistantCaption = ref('')

type PresentEvent
  = | { type: 'assistant-reset' }
    | { type: 'assistant-append', text: string }
const { post: postPresent } = useBroadcastChannel<PresentEvent, PresentEvent>({ name: 'airi-chat-present' })

viewUpdateCleanups.push(live2dStore.onShouldUpdateView(async () => {
  showStage.value = false
  await settingsStore.updateStageModel()
  setTimeout(() => {
    showStage.value = true
  }, 100)
}))

viewUpdateCleanups.push(vrmStore.onShouldUpdateView(async () => {
  showStage.value = false
  await settingsStore.updateStageModel()
  setTimeout(() => {
    showStage.value = true
  }, 100)
}))

const audioAnalyser = ref<AnalyserNode>()
const nowSpeaking = ref(false)
const lipSyncStarted = ref(false)
const lipSyncLoopId = ref<number>()
const live2dLipSync = ref<Live2DLipSync>()
const live2dLipSyncOptions: Live2DLipSyncOptions = { mouthUpdateIntervalMs: 50, mouthLerpWindowMs: 50 }

const { activeCard } = storeToRefs(useAiriCardStore())
const speechStore = useSpeechStore()
const { ssmlEnabled, activeSpeechProvider, activeSpeechModel, activeSpeechVoice, pitch } = storeToRefs(speechStore)
const activeCardId = computed(() => activeCard.value?.name ?? 'default')
const speechRuntimeStore = useSpeechRuntimeStore()

const { currentMotion } = storeToRefs(useLive2d())

const emotionsQueue = createQueue<EmotionPayload>({
  handlers: [
    async (ctx) => {
      if (stageModelRenderer.value === 'vrm') {
        // console.debug('VRM emotion anime: ', ctx.data)
        const value = EMOTION_VRMExpressionName_value[ctx.data.name]
        if (!value)
          return

        await vrmViewerRef.value!.setExpression(value, ctx.data.intensity)
      }
      else if (stageModelRenderer.value === 'live2d') {
        currentMotion.value = { group: EMOTION_EmotionMotionName_value[ctx.data.name] }
      }
      else if (stageModelRenderer.value === 'minecraft') {
        // The Minecraft rig performs emotion as posture, and its profile table is
        // keyed by the Emotion enum values directly, so no mapping table is
        // needed here — unlike the VRM path, nothing gets dropped on the way.
        minecraftEmotion.value = ctx.data.name
        minecraftSceneRef.value?.setExpression(ctx.data.name, ctx.data.intensity)
      }
    },
  ],
})

const emotionMessageContentQueue = useEmotionsMessageQueue(emotionsQueue)
emotionMessageContentQueue.onHandlerEvent('emotion', (emotion) => {
  // eslint-disable-next-line no-console
  console.debug('emotion detected', emotion)
})

const delaysQueue = useDelayMessageQueue()
delaysQueue.onHandlerEvent('delay', (delay) => {
  // eslint-disable-next-line no-console
  console.debug('delay detected', delay)
})

// Play special token: delay or emotion
function playSpecialToken(special: string) {
  delaysQueue.enqueue(special)
  emotionMessageContentQueue.enqueue(special)
}

function resolveExpressionFile(expressionId: string, fallbackModel: 'mita' | 'xiaomita-pro') {
  const mappedExpressionFile = findLive2DExpressionFile(fallbackModel, expressionId)
  if (mappedExpressionFile === '')
    return ''

  return availableExpressions.value.find(expression =>
    expression.expressionFile === mappedExpressionFile
    || expression.expressionName === expressionId,
  )?.expressionFile
}

/*
 * Apply a Minecraft pose marker. Returns true when the special belonged to this
 * channel, so the caller can stop before forwarding it to the speech pipeline.
 */
function applyMinecraftExpressionControl(special: string) {
  const poseId = parseMinecraftExpressionControlSpecial(special)
  if (!poseId)
    return false

  // Swallow the marker even when another renderer is active: it was addressed to
  // this channel, and letting it fall through would read it out loud.
  if (hasMinecraftEmoteDrawer.value)
    selectMinecraftEmotion(poseId)

  return true
}

function applyLive2DExpressionControl(special: string) {
  const control = parseLive2DExpressionControlSpecial(special)
  if (!control)
    return false

  if (control.model === 'mita') {
    if (!mitaSelected.value)
      return true

    const expressionFiles = control.expressionIds
      .map(expressionId => resolveExpressionFile(expressionId, 'mita'))
      .filter((expressionFile): expressionFile is string => !!expressionFile)

    activeExpressions.value = expressionFiles
    currentExpression.value = expressionFiles.at(-1) ?? ''
    return true
  }

  if (control.model === 'xiaomita-pro') {
    if (!xiaoMitaProSelected.value)
      return true

    const expressionFile = resolveExpressionFile(control.expressionIds[0], 'xiaomita-pro') ?? ''
    activeExpressions.value = []
    currentExpression.value = expressionFile
    return true
  }

  return false
}
const lipSyncNode = ref<AudioNode>()

async function playFunction(item: Parameters<Parameters<typeof createPlaybackManager<AudioBuffer>>[0]['play']>[0], signal: AbortSignal): Promise<void> {
  if (!audioContext || !item.audio)
    return

  // Ensure audio context is resumed (browsers suspend it by default until user interaction)
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    }
    catch {
      return
    }
  }

  const source = audioContext.createBufferSource()
  currentAudioSource.value = source
  source.buffer = item.audio

  source.connect(audioContext.destination)
  if (audioAnalyser.value)
    source.connect(audioAnalyser.value)
  if (lipSyncNode.value)
    source.connect(lipSyncNode.value)

  return new Promise<void>((resolve) => {
    let settled = false
    const resolveOnce = () => {
      if (settled)
        return
      settled = true
      resolve()
    }

    const stopPlayback = () => {
      try {
        source.stop()
        source.disconnect()
      }
      catch {}
      if (currentAudioSource.value === source)
        currentAudioSource.value = undefined
      resolveOnce()
    }

    if (signal.aborted) {
      stopPlayback()
      return
    }

    signal.addEventListener('abort', stopPlayback, { once: true })
    source.onended = () => {
      signal.removeEventListener('abort', stopPlayback)
      stopPlayback()
    }

    try {
      source.start(0)
    }
    catch {
      stopPlayback()
    }
  })
}

const playbackManager = createPlaybackManager<AudioBuffer>({
  play: playFunction,
  maxVoices: 1,
  maxVoicesPerOwner: 1,
  overflowPolicy: 'queue',
  ownerOverflowPolicy: 'steal-oldest',
})

const speechPipeline = createSpeechPipeline<AudioBuffer>({
  tts: async (request, signal) => {
    if (signal.aborted)
      return null

    if (activeSpeechProvider.value === 'speech-noop')
      return null

    if (!activeSpeechProvider.value)
      return null

    const provider = await providersStore.getProviderInstance(activeSpeechProvider.value) as SpeechProviderWithExtraOptions<string, UnElevenLabsOptions>
    if (!provider) {
      console.error('Failed to initialize speech provider')
      return null
    }

    if (!request.text && !request.special)
      return null

    const providerConfig = providersStore.getProviderConfig(activeSpeechProvider.value)

    // For OpenAI Compatible providers, always use provider config for model and voice
    // since these are manually configured in provider settings
    let model = activeSpeechModel.value
    let voice = activeSpeechVoice.value

    // These providers store model/voice in the provider config (configured on the
    // provider settings page). Priority: the active selection made on the
    // Modules -> Speech page wins; provider config is a fallback; then a hardcoded default.
    if (activeSpeechProvider.value === 'openai-compatible-audio-speech' || activeSpeechProvider.value === 'airi-official-audio-speech') {
      if (!model) {
        model = (providerConfig?.model as string)
          || (activeSpeechProvider.value === 'airi-official-audio-speech' ? 'stepfun/stepaudio-2.5-tts' : 'tts-1')
      }

      if (!voice) {
        const fallbackVoiceId = (providerConfig?.voice as string)
          || (activeSpeechProvider.value === 'airi-official-audio-speech' ? 'yuanqishaonv' : 'alloy')
        voice = {
          id: fallbackVoiceId,
          name: fallbackVoiceId,
          description: fallbackVoiceId,
          previewURL: '',
          languages: [{ code: 'en', title: 'English' }],
          provider: activeSpeechProvider.value,
          gender: 'neutral',
        }
      }
    }

    if (!model || !voice)
      return null

    const input = ssmlEnabled.value
      ? speechStore.generateSSML(request.text, voice, { ...providerConfig, pitch: pitch.value })
      : request.text

    try {
      const res = await generateSpeech({
        ...provider.speech(model, providerConfig),
        input,
        voice: voice.id,
      })

      if (signal.aborted || !res || res.byteLength === 0)
        return null

      const audioBuffer = await audioContext.decodeAudioData(res)
      return audioBuffer
    }
    catch (error) {
      console.error('[Speech Pipeline] speech synthesis failed', error)
      return null
    }
  },
  playback: playbackManager,
})

void speechRuntimeStore.registerHost(speechPipeline)

speechPipeline.on('onSpecial', (segment) => {
  if (segment.special)
    playSpecialToken(segment.special)
})

playbackManager.onEnd(({ item }) => {
  if (item.special)
    playSpecialToken(item.special)

  nowSpeaking.value = false
  mouthOpenSize.value = 0
})

playbackManager.onStart(({ item }) => {
  nowSpeaking.value = true
  // NOTICE: postCaption and postPresent may throw errors if the BroadcastChannel is closed
  // (e.g., when navigating away from the page). We wrap these in try-catch to prevent
  // breaking playback when the channel is unavailable.
  assistantCaption.value += ` ${item.text}`
  try {
    postCaption({ type: 'caption-assistant', text: assistantCaption.value })
  }
  catch {
    // BroadcastChannel may be closed - don't break playback
  }
  try {
    postPresent({ type: 'assistant-append', text: item.text })
  }
  catch {
    // BroadcastChannel may be closed - don't break playback
  }
})

function startLipSyncLoop() {
  if (lipSyncLoopId.value)
    return

  const tick = () => {
    if (!nowSpeaking.value || !live2dLipSync.value) {
      mouthOpenSize.value = 0
    }
    else {
      mouthOpenSize.value = live2dLipSync.value.getMouthOpen()
    }
    lipSyncLoopId.value = requestAnimationFrame(tick)
  }

  lipSyncLoopId.value = requestAnimationFrame(tick)
}

async function setupLipSync() {
  if (lipSyncStarted.value)
    return

  try {
    const lipSync = await createLive2DLipSync(audioContext, wlipsyncProfile as Profile, live2dLipSyncOptions)
    live2dLipSync.value = lipSync
    lipSyncNode.value = lipSync.node
    await audioContext.resume()
    startLipSyncLoop()
    lipSyncStarted.value = true
  }
  catch (error) {
    lipSyncStarted.value = false
    console.error('Failed to setup Live2D lip sync', error)
  }
}

function setupAnalyser() {
  if (!audioAnalyser.value) {
    audioAnalyser.value = audioContext.createAnalyser()
  }
}

let currentChatIntent: ReturnType<typeof speechRuntimeStore.openIntent> | null = null

chatHookCleanups.push(onBeforeMessageComposed(async () => {
  playbackManager.stopAll('new-message')

  setupAnalyser()
  await setupLipSync()
  // Reset assistant caption for a new message
  assistantCaption.value = ''
  try {
    postCaption({ type: 'caption-assistant', text: '' })
  }
  catch (error) {
    // BroadcastChannel may be closed if user navigated away - don't break flow
    console.warn('[Stage] Failed to post caption reset (channel may be closed)', { error })
  }
  try {
    postPresent({ type: 'assistant-reset' })
  }
  catch (error) {
    // BroadcastChannel may be closed if user navigated away - don't break flow
    console.warn('[Stage] Failed to post present reset (channel may be closed)', { error })
  }

  if (currentChatIntent) {
    currentChatIntent.cancel('new-message')
    currentChatIntent = null
  }

  currentChatIntent = speechRuntimeStore.openIntent({
    ownerId: activeCardId.value,
    priority: 'normal',
    behavior: 'queue',
  })
}))

chatHookCleanups.push(onAfterMessageComposed(async (_message, context) => {
  // Every Minecraft skin shares the same nine code-defined poses, so the marker
  // prompt is keyed off the renderer rather than off a particular model id.
  const prompt = stageModelRenderer.value === 'minecraft'
    ? minecraftExpressionControlPrompt
    : mitaSelected.value
      ? live2dExpressionControlPrompts.mita
      : xiaoMitaProSelected.value
        ? live2dExpressionControlPrompts['xiaomita-pro']
        : ''

  if (!prompt)
    return

  context.composedMessage.unshift({
    role: 'system',
    content: prompt,
  })
}))

chatHookCleanups.push(onBeforeSend(async () => {
  currentMotion.value = { group: EmotionThinkMotionName }
}))

chatHookCleanups.push(onTokenLiteral(async (literal) => {
  currentChatIntent?.writeLiteral(literal)
}))

chatHookCleanups.push(onTokenSpecial(async (special) => {
  // console.debug('Stage received special token:', special)
  if (applyLive2DExpressionControl(special))
    return

  if (applyMinecraftExpressionControl(special))
    return

  currentChatIntent?.writeSpecial(special)
}))

chatHookCleanups.push(onStreamEnd(async () => {
  delaysQueue.enqueue(llmInferenceEndToken)
  currentChatIntent?.writeFlush()
}))

chatHookCleanups.push(onAssistantResponseEnd(async (_message) => {
  currentChatIntent?.end()
  currentChatIntent = null
  // const res = await embed({
  //   ...transformersProvider.embed('Xenova/nomic-embed-text-v1'),
  //   input: message,
  // })

  // await db.value?.execute(`INSERT INTO memory_test (vec) VALUES (${JSON.stringify(res.embedding)});`)
}))

onUnmounted(() => {
  lipSyncStarted.value = false
})

// Resume audio context on first user interaction (browser requirement)
let audioContextResumed = false
function resumeAudioContextOnInteraction() {
  if (audioContextResumed || !audioContext)
    return
  audioContextResumed = true
  audioContext.resume().catch(() => {
    // Ignore errors - audio context will be resumed when needed
  })
}

// Add event listeners for user interaction
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown']
  events.forEach((event) => {
    window.addEventListener(event, resumeAudioContextOnInteraction, { once: true, passive: true })
  })
}

onMounted(async () => {
  db.value = drizzle({ connection: { bundles: getImportUrlBundles() } })
  await db.value.execute(`CREATE TABLE memory_test (vec FLOAT[768]);`)
})

function canvasElement() {
  if (stageModelRenderer.value === 'live2d')
    return live2dSceneRef.value?.canvasElement()

  else if (stageModelRenderer.value === 'vrm')
    return vrmViewerRef.value?.canvasElement()
}

function readRenderTargetRegionAtClientPoint(clientX: number, clientY: number, radius: number) {
  if (stageModelRenderer.value !== 'vrm')
    return null

  return vrmViewerRef.value?.readRenderTargetRegionAtClientPoint?.(clientX, clientY, radius) ?? null
}

function interactiveOverlayElement() {
  return interactiveOverlayRef.value
}

async function selectDisplayModel(modelId: string) {
  if (stageModelSelected.value === modelId)
    return

  const model = await displayModelsStore.getDisplayModel(modelId)
  if (!model)
    return

  stageModelSelected.value = modelId
  await settingsStore.updateStageModel()

  // A freshly built Minecraft rig starts from neutral, so the drawer highlight
  // has to follow it back or it would point at the previous model's pose.
  minecraftEmotion.value = 'neutral'

  if (model.format === DisplayModelFormat.VRM)
    vrmStore.shouldUpdateView()
  else if (model.format !== DisplayModelFormat.MinecraftSkin)
    // The Minecraft renderer keeps its own camera and needs no view refresh, and
    // poking the Live2D store here would fire a reload for a model it never owned.
    live2dStore.shouldUpdateView()

  showModelDrawer.value = false
  showExpressionDrawer.value = false
}

async function handleLive2DModelError(error: unknown) {
  if (stageModelSelected.value === fallbackLive2DModelId) {
    console.error('[Stage] Fallback Live2D model failed to load.', error)
    return
  }

  if (live2dModelFallbackInProgress.value)
    return

  live2dModelFallbackInProgress.value = true
  try {
    console.warn('[Stage] Live2D model failed to load; switching to fallback model.', {
      failedModelId: stageModelSelected.value,
      fallbackModelId: fallbackLive2DModelId,
      error,
    })
    await selectDisplayModel(fallbackLive2DModelId)
  }
  finally {
    live2dModelFallbackInProgress.value = false
  }
}

function selectExpression(expressionFile: string) {
  if (mitaSelected.value) {
    const nextExpressions = activeExpressions.value.includes(expressionFile)
      ? activeExpressions.value.filter(activeExpression => activeExpression !== expressionFile)
      : [...activeExpressions.value, expressionFile]

    activeExpressions.value = nextExpressions
    currentExpression.value = nextExpressions.at(-1) ?? ''
    return
  }

  currentExpression.value = expressionFile
}

function clearExpression() {
  currentExpression.value = ''
  activeExpressions.value = []
}

onUnmounted(() => {
  if (lipSyncLoopId.value) {
    cancelAnimationFrame(lipSyncLoopId.value)
    lipSyncLoopId.value = undefined
  }

  chatHookCleanups.forEach(dispose => dispose?.())
  viewUpdateCleanups.forEach(dispose => dispose?.())
})

watch(immersiveStageEnabled, (enabled) => {
  if (!enabled)
    return

  showModelDrawer.value = false
  showExpressionDrawer.value = false
}, { immediate: true })

defineExpose({
  canvasElement,
  interactiveOverlayElement,
  readRenderTargetRegionAtClientPoint,
})
</script>

<template>
  <div :class="['relative h-full w-full']">
    <div
      v-if="!immersiveStageEnabled"
      ref="interactiveOverlayRef"
      :class="[
        'pointer-events-auto absolute left-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-start gap-2',
        'max-h-[calc(100vh-2rem)] pl-1',
      ]"
    >
      <Button
        variant="secondary"
        size="sm"
        :class="[
          'rounded-r-xl rounded-l-none px-2 py-3 shadow-lg',
          'bg-white/85 text-neutral-900 backdrop-blur-md dark:bg-neutral-950/85 dark:text-white',
        ]"
        @click="showModelDrawer = !showModelDrawer"
      >
        <div :class="['flex items-center gap-2']">
          <div :class="[showModelDrawer ? 'i-solar:alt-arrow-left-line-duotone' : 'i-solar:alt-arrow-right-line-duotone']" />
          <span>人物</span>
        </div>
      </Button>
      <Button
        v-if="hasExpressionDrawer || hasMinecraftEmoteDrawer"
        variant="secondary"
        size="sm"
        :class="[
          'rounded-r-xl rounded-l-none px-2 py-3 shadow-lg',
          'bg-white/85 text-neutral-900 backdrop-blur-md dark:bg-neutral-950/85 dark:text-white',
        ]"
        @click="showExpressionDrawer = !showExpressionDrawer"
      >
        <div :class="['flex items-center gap-2']">
          <div :class="[showExpressionDrawer ? 'i-solar:alt-arrow-left-line-duotone' : 'i-solar:alt-arrow-right-line-duotone']" />
          <span>表情</span>
        </div>
      </Button>
      <!--
        One scroll region for all the drawers rather than one per drawer. Each used
        to cap itself at 70vh, so opening two stacked to 140vh and spilled off both
        ends of a vertically centred column — and because the overflowing element was
        the container rather than any drawer, there was nothing for the wheel to
        scroll. The buttons stay outside it so they cannot scroll out of reach.
        `min-h-0` is what lets a flex child shrink below its content height.
      -->
      <div :class="['min-h-0 flex flex-1 flex-col items-start gap-2 overflow-y-auto overscroll-contain pr-1']">
        <div
          v-if="showModelDrawer"
          :class="[
            'ml-0.5 w-52 shrink-0 rounded-2xl border border-white/30 bg-white/85 p-3 shadow-xl backdrop-blur-md',
            'dark:border-white/10 dark:bg-neutral-950/88',
          ]"
        >
          <div :class="['mb-2 text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400']">
            切换人物
          </div>
          <button
            v-for="model in characterModels"
            :key="model.id"
            type="button"
            :class="[
              'mb-2 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors last:mb-0',
              stageModelSelected === model.id
                ? 'bg-primary-500/15 text-primary-700 dark:bg-primary-400/15 dark:text-primary-200'
                : 'bg-black/4 text-neutral-700 hover:bg-black/8 dark:bg-white/6 dark:text-neutral-200 dark:hover:bg-white/10',
            ]"
            @click="selectDisplayModel(model.id)"
          >
            {{ model.name }}
          </button>
        </div>
        <div
          v-if="showExpressionDrawer && hasExpressionDrawer"
          :class="[
            'ml-0.5 w-52 shrink-0 rounded-2xl border border-white/30 bg-white/85 p-3 shadow-xl backdrop-blur-md',
            'dark:border-white/10 dark:bg-neutral-950/88',
          ]"
        >
          <div :class="['mb-2 text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400']">
            {{ expressionDrawerTitle }}
          </div>
          <button
            type="button"
            :class="[
              'mb-2 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors',
              !activeExpressions.length && !currentExpression
                ? 'bg-primary-500/15 text-primary-700 dark:bg-primary-400/15 dark:text-primary-200'
                : 'bg-black/4 text-neutral-700 hover:bg-black/8 dark:bg-white/6 dark:text-neutral-200 dark:hover:bg-white/10',
            ]"
            @click="clearExpression"
          >
            默认
          </button>
          <button
            v-for="expression in availableExpressions"
            :key="expression.expressionFile"
            type="button"
            :class="[
              'mb-2 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors last:mb-0',
              isExpressionActive(expression.expressionFile)
                ? 'bg-primary-500/15 text-primary-700 dark:bg-primary-400/15 dark:text-primary-200'
                : 'bg-black/4 text-neutral-700 hover:bg-black/8 dark:bg-white/6 dark:text-neutral-200 dark:hover:bg-white/10',
            ]"
            @click="selectExpression(expression.expressionFile)"
          >
            {{ getExpressionDisplayName(expression.expressionName) }}
          </button>
        </div>
        <div
          v-if="showExpressionDrawer && hasMinecraftEmoteDrawer"
          :class="[
            'ml-0.5 w-52 shrink-0 rounded-2xl border border-white/30 bg-white/85 p-3 shadow-xl backdrop-blur-md',
            'dark:border-white/10 dark:bg-neutral-950/88',
          ]"
        >
          <div :class="['mb-2 text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400']">
            动作表情
          </div>
          <button
            v-for="emotion in MINECRAFT_EMOTIONS"
            :key="emotion"
            type="button"
            :class="[
              'mb-2 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors last:mb-0',
              minecraftEmotion === emotion
                ? 'bg-primary-500/15 text-primary-700 dark:bg-primary-400/15 dark:text-primary-200'
                : 'bg-black/4 text-neutral-700 hover:bg-black/8 dark:bg-white/6 dark:text-neutral-200 dark:hover:bg-white/10',
            ]"
            @click="selectMinecraftEmotion(emotion)"
          >
            {{ getMinecraftEmotionLabel(emotion) }}
          </button>
        </div>
      </div>
    </div>
    <div h-full w-full>
      <Live2DScene
        v-if="stageModelRenderer === 'live2d' && showStage"
        ref="live2dSceneRef"
        v-model:state="componentState"
        min-w="50% <lg:full" min-h="100 sm:100"
        h-full w-full flex-1
        :model-src="stageModelSelectedUrl"
        :model-id="stageModelSelected"
        :focus-at="focusAt"
        :mouth-open-size="mouthOpenSize"
        :paused="paused"
        :x-offset="xOffset"
        :y-offset="live2dYOffsetForSelectedModel"
        :scale="live2dScaleForSelectedModel"
        :disable-focus-at="live2dDisableFocusForSelectedModel"
        :disable-idle-eye-focus="live2dDisableIdleEyeFocus"
        :focus-ignore-left-ratio="live2dFocusIgnoreLeftRatio"
        :focus-tracking-strength-x="live2dFocusTrackingStrengthX"
        :focus-tracking-strength-y="live2dFocusTrackingStrengthY"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
        :live2d-idle-animation-enabled="live2dIdleAnimationEnabled"
        :live2d-auto-blink-enabled="live2dAutoBlinkEnabled"
        :live2d-force-auto-blink-enabled="live2dForceAutoBlinkEnabledForSelectedModel"
        :live2d-shadow-enabled="live2dShadowEnabled"
        :live2d-max-fps="live2dMaxFps"
        @error="handleLive2DModelError"
      />
      <!--
        `focus-at` is deliberately not bound here. Cursor tracking made the box
        character look tethered to the mouse instead of alive; the idle scan in
        `useMinecraftEmote` handles looking around now. Pass `:focus-at="focusAt"`
        together with `gaze-tracking` to bring it back.
      -->
      <MinecraftScene
        v-if="stageModelRenderer === 'minecraft' && showStage"
        ref="minecraftSceneRef"
        v-model:state="componentState"
        min-w="50% <lg:full" min-h="100 sm:100"
        h-full w-full flex-1
        :model-src="stageModelSelectedUrl"
        :mouth-open-size="mouthOpenSize"
        :paused="paused"
        @error="console.error"
      />
      <ThreeScene
        v-if="stageModelRenderer === 'vrm' && showStage"
        ref="vrmViewerRef"
        v-model:state="componentState"
        :model-src="stageModelSelectedUrl"
        :idle-animation="animations.idleLoop.toString()"
        min-w="50% <lg:full" min-h="100 sm:100" h-full w-full flex-1
        :paused="paused"
        :show-axes="stageViewControlsEnabled"
        :current-audio-source="currentAudioSource"
        @error="console.error"
      />
    </div>
  </div>
</template>
