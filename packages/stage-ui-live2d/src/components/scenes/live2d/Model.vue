<script setup lang="ts">
import type { Application } from '@pixi/app'

import type { PixiLive2DInternalModel } from '../../../composables/live2d'

import { listenBeatSyncBeatSignal } from '@proj-airi/stage-shared/beat-sync'
import { useTheme } from '@proj-airi/ui'
import { breakpointsTailwind, until, useBreakpoints, useDebounceFn } from '@vueuse/core'
import { formatHex } from 'culori'
import { Mutex } from 'es-toolkit'
import { storeToRefs } from 'pinia'
import { DropShadowFilter } from 'pixi-filters'
import { Live2DFactory, Live2DModel, MotionPriority } from 'pixi-live2d-display/cubism4'
import { computed, onMounted, onUnmounted, ref, shallowRef, toRef, watch } from 'vue'

import {
  createBeatSyncController,
  useLive2DIdleEyeFocus,
  useLive2DMotionManagerUpdate,
  useMotionUpdatePluginAutoEyeBlink,
  useMotionUpdatePluginBeatSync,
  useMotionUpdatePluginIdleDisable,
  useMotionUpdatePluginIdleFocusWithControl,
} from '../../../composables/live2d'
import { Emotion, EmotionNeutralMotionName } from '../../../constants/emotions'
import { useLive2d } from '../../../stores/live2d'

const props = withDefaults(defineProps<{
  modelSrc?: string
  modelId?: string

  app?: Application
  mouthOpenSize?: number
  width: number
  height: number
  paused?: boolean
  focusAt?: { x: number, y: number }
  disableFocusAt?: boolean
  disableIdleEyeFocus?: boolean
  focusIgnoreLeftRatio?: number
  focusTrackingStrengthX?: number
  focusTrackingStrengthY?: number
  xOffset?: number | string
  yOffset?: number | string
  scale?: number
  themeColorsHue?: number
  themeColorsHueDynamic?: boolean
  live2dIdleAnimationEnabled?: boolean
  live2dAutoBlinkEnabled?: boolean
  live2dForceAutoBlinkEnabled?: boolean
  live2dShadowEnabled?: boolean
}>(), {
  mouthOpenSize: 0,
  paused: false,
  focusAt: () => ({ x: 0, y: 0 }),
  disableFocusAt: false,
  disableIdleEyeFocus: false,
  focusIgnoreLeftRatio: 0,
  focusTrackingStrengthX: 1,
  focusTrackingStrengthY: 1,
  scale: 1,
  themeColorsHue: 220.44,
  themeColorsHueDynamic: false,
  live2dIdleAnimationEnabled: true,
  live2dAutoBlinkEnabled: true,
  live2dForceAutoBlinkEnabled: false,
  live2dShadowEnabled: true,
})

const emits = defineEmits<{
  (e: 'modelLoaded'): void
  (e: 'error', error: unknown): void
}>()

interface Live2DExpressionParameterOverride {
  Id: string
  Value: number
  Blend?: 'Add' | 'Multiply' | 'Overwrite'
}

interface Live2DExpressionFile {
  Type?: string
  Parameters?: Live2DExpressionParameterOverride[]
}

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

function parsePropsOffset() {
  let xOffset = Number.parseFloat(String(props.xOffset)) || 0
  let yOffset = Number.parseFloat(String(props.yOffset)) || 0

  if (String(props.xOffset).endsWith('%')) {
    xOffset = (Number.parseFloat(String(props.xOffset).replace('%', '')) / 100) * props.width
  }
  if (String(props.yOffset).endsWith('%')) {
    yOffset = (Number.parseFloat(String(props.yOffset).replace('%', '')) / 100) * props.height
  }

  return {
    xOffset,
    yOffset,
  }
}

const modelSrcRef = toRef(() => props.modelSrc)

const modelLoading = ref(false)
// NOTICE: boolean is sufficient; this flag is only used inside loadModel to bail out if the component unmounts mid-load.
let isUnmounted = false

const modelLoadMutex = new Mutex()

const offset = computed(() => parsePropsOffset())

const pixiApp = toRef(() => props.app)
const paused = toRef(() => props.paused)
const focusAt = toRef(() => props.focusAt)
const disableIdleEyeFocus = toRef(() => props.disableIdleEyeFocus)
const model = ref<Live2DModel<PixiLive2DInternalModel>>()
const expressionOverrides = shallowRef<Record<string, Live2DExpressionParameterOverride[]>>({})
const expressionOverrideParameterIds = shallowRef<string[]>([])
const expressionRenderedValues = shallowRef<Record<string, number>>({})
const expressionDefaultValues = shallowRef<Record<string, number>>({})
const expressionGroupKeys = shallowRef<Record<string, string[]>>({})
let restoreInternalModelUpdate: (() => void) | undefined
const initialModelWidth = ref<number>(0)
const initialModelHeight = ref<number>(0)
const mouthOpenSize = computed(() => Math.max(0, Math.min(100, props.mouthOpenSize)))
const lastUpdateTime = ref(0)
const pointerEyeFocus = ref({ x: 0, y: 0 })
const pointerHeadFocus = ref({ x: 0, y: 0 })

const { isDark: dark } = useTheme()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = computed(() => breakpoints.between('sm', 'md').value || breakpoints.smaller('sm').value)
const dropShadowFilter = shallowRef(new DropShadowFilter({
  alpha: 0.2,
  blur: 0,
  distance: 20,
  rotation: 45,
}))
const live2dStore = useLive2d()
const {
  currentMotion,
  availableMotions,
  currentExpression,
  availableExpressions,
  activeExpressions,
  motionMap,
  modelParameters,
} = storeToRefs(live2dStore)
const idleEyeFocus = computed(() => props.modelId === 'preset-live2d-xiaomita' || props.modelId === 'preset-live2d-xiaomita-pro'
  ? useLive2DIdleEyeFocus({
      xRange: [-0.18, 0.18],
      yRange: [-0.08, 0.1],
      focusScaleX: 0.2,
      focusScaleY: 0.14,
      centerBias: 0.7,
    })
  : useLive2DIdleEyeFocus())

function getCoreModel() {
  return model.value!.internalModel.coreModel as any
}

function setScaleAndPosition() {
  if (!model.value)
    return

  const viewport = typeof window === 'undefined' ? undefined : window
  const stageWidth = props.width || viewport?.innerWidth || 0
  const stageHeight = props.height || viewport?.innerHeight || 0
  if (!stageWidth || !stageHeight || !initialModelWidth.value || !initialModelHeight.value)
    return

  let offsetFactor = 2.2
  if (isMobile.value) {
    offsetFactor = 2.2
  }

  const heightScale = (stageHeight * 0.95 / initialModelHeight.value * offsetFactor)
  const widthScale = (stageWidth * 0.95 / initialModelWidth.value * offsetFactor)
  let scale = Math.min(heightScale, widthScale)

  // Prevent zero or NaN values to fix the "headless" model issue.
  if (Number.isNaN(scale) || scale <= 0) {
    scale = 1e-6
  }

  model.value.scale.set(scale * props.scale, scale * props.scale)

  model.value.x = (stageWidth / 2) + offset.value.xOffset
  model.value.y = stageHeight + offset.value.yOffset
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeFocusTarget(target: { x: number, y: number }) {
  const ignoreLeftRatio = Math.max(0, Math.min(1, props.focusIgnoreLeftRatio))
  const trackingStrengthX = Math.max(0, Math.min(1, props.focusTrackingStrengthX))
  const trackingStrengthY = Math.max(0, Math.min(1, props.focusTrackingStrengthY))
  const leftBoundary = props.width * ignoreLeftRatio
  const normalizedTarget = ignoreLeftRatio > 0 && target.x < leftBoundary
    ? {
        x: props.width / 2,
        y: target.y,
      }
    : target

  if (trackingStrengthX >= 1 && trackingStrengthY >= 1)
    return normalizedTarget

  return {
    x: (props.width / 2) + ((normalizedTarget.x - (props.width / 2)) * trackingStrengthX),
    y: (props.height / 2) + ((normalizedTarget.y - (props.height / 2)) * trackingStrengthY),
  }
}

function updateEyeBallFocus(target: { x: number, y: number }) {
  if (!model.value)
    return

  const coreModel = model.value.internalModel.coreModel
  const targetEyeX = clamp(((target.x - (props.width / 2)) / Math.max(props.width / 2, 1)) * 0.42, -0.42, 0.42)
  const targetEyeY = clamp(((target.y - (props.height / 2)) / Math.max(props.height / 2, 1)) * 0.3, -0.3, 0.3)
  const eyeFollowLerp = props.modelId === 'preset-live2d-mita' ? 0.24 : 0.22

  pointerEyeFocus.value = {
    x: pointerEyeFocus.value.x + ((targetEyeX - pointerEyeFocus.value.x) * eyeFollowLerp),
    y: pointerEyeFocus.value.y + ((targetEyeY - pointerEyeFocus.value.y) * eyeFollowLerp),
  }

  coreModel.setParameterValueById('ParamEyeBallX', pointerEyeFocus.value.x)
  coreModel.setParameterValueById('ParamEyeBallY', pointerEyeFocus.value.y)
}

function updateMitaFocus(target: { x: number, y: number }) {
  if (!model.value || props.modelId !== 'preset-live2d-mita')
    return

  const coreModel = model.value.internalModel.coreModel
  const targetX = clamp((target.x - (props.width / 2)) / Math.max(props.width / 2, 1), -1, 1)
  const targetY = clamp((target.y - (props.height / 2)) / Math.max(props.height / 2, 1), -1, 1)

  pointerHeadFocus.value = {
    x: pointerHeadFocus.value.x + (((targetX * 0.55) - pointerHeadFocus.value.x) * 0.12),
    y: pointerHeadFocus.value.y + (((targetY * 0.4) - pointerHeadFocus.value.y) * 0.12),
  }
  updateEyeBallFocus(target)

  coreModel.setParameterValueById('ParamAngleX', pointerHeadFocus.value.x * 18)
  coreModel.setParameterValueById('ParamAngleY', pointerHeadFocus.value.y * 12)
  coreModel.setParameterValueById('ParamAngleZ', pointerHeadFocus.value.x * pointerHeadFocus.value.y * -8)
}

function applyExpressionOverrides() {
  if (props.modelId !== 'preset-live2d-mita' || !model.value)
    return

  const coreModel = model.value.internalModel.coreModel

  const nextRenderedValues: Record<string, number> = {}
  const targetParameters = new Map<string, Live2DExpressionParameterOverride>()
  for (const expressionFile of activeExpressions.value) {
    for (const parameter of expressionOverrides.value[expressionFile] ?? []) {
      targetParameters.set(parameter.Id, parameter)
    }
  }

  for (const parameterId of expressionOverrideParameterIds.value) {
    const baseValue = expressionDefaultValues.value[parameterId] ?? Number(coreModel.getParameterValueById(parameterId) ?? 0)
    const activeParameter = targetParameters.get(parameterId)

    let targetValue = baseValue
    if (activeParameter) {
      switch (activeParameter.Blend) {
        case 'Multiply':
          targetValue = baseValue * activeParameter.Value
          break
        case 'Overwrite':
          targetValue = activeParameter.Value
          break
        case 'Add':
        default:
          targetValue = baseValue + activeParameter.Value
          break
      }
    }

    const previousValue = expressionRenderedValues.value[parameterId] ?? baseValue
    const smoothingFactor = activeParameter ? 0.22 : 0.38
    const nextValue = previousValue + ((targetValue - previousValue) * smoothingFactor)

    coreModel.setParameterValueById(parameterId, nextValue)
    nextRenderedValues[parameterId] = nextValue
  }

  expressionRenderedValues.value = nextRenderedValues
}

function clearMitaExpressionOverrides() {
  if (props.modelId !== 'preset-live2d-mita' || !model.value)
    return

  const coreModel = model.value.internalModel.coreModel
  for (const parameterId of expressionOverrideParameterIds.value) {
    const baseValue = expressionDefaultValues.value[parameterId]
    if (typeof baseValue === 'number')
      coreModel.setParameterValueById(parameterId, baseValue)
  }

  expressionRenderedValues.value = {}
}

function resetExpressionOverrides() {
  expressionOverrides.value = {}
  expressionGroupKeys.value = {}
  expressionOverrideParameterIds.value = []
  expressionRenderedValues.value = {}
  expressionDefaultValues.value = {}
}

function captureMissingExpressionDefaults() {
  if (props.modelId !== 'preset-live2d-mita' || !model.value)
    return

  const coreModel = model.value.internalModel.coreModel
  const nextDefaults = { ...expressionDefaultValues.value }

  for (const parameterId of expressionOverrideParameterIds.value) {
    if (!(parameterId in nextDefaults))
      nextDefaults[parameterId] = Number(coreModel.getParameterValueById(parameterId) ?? 0)
  }

  expressionDefaultValues.value = nextDefaults
}

function resolveExpressionOverrideUrl(expressionFile: string, modelUrl: string) {
  const absoluteModelUrl = new URL(modelUrl, window.location.href)
  const modelDirectoryUrl = new URL('.', absoluteModelUrl)
  return new URL(expressionFile, modelDirectoryUrl).href
}

async function loadExpressionOverrideEntries(baseUrl: string, expressions: { expressionFile: string }[]) {
  const entries = await Promise.all(expressions.map(async (expression) => {
    try {
      const response = await fetch(resolveExpressionOverrideUrl(expression.expressionFile, baseUrl))
      if (!response.ok)
        return [expression.expressionFile, []] as const

      const json = await response.json() as Live2DExpressionFile
      return [expression.expressionFile, json.Parameters ?? []] as const
    }
    catch (error) {
      console.warn('Failed to load expression override file:', expression.expressionFile, error)
      return [expression.expressionFile, []] as const
    }
  }))

  return Object.fromEntries(entries)
}

async function ensureExpressionOverridesLoaded(expressionFiles: string[]) {
  if (props.modelId !== 'preset-live2d-mita' || !modelSrcRef.value) {
    resetExpressionOverrides()
    return
  }

  const missingExpressionFiles = expressionFiles.filter(expressionFile =>
    !(expressionFile in expressionOverrides.value),
  )

  if (missingExpressionFiles.length === 0)
    return

  const targetExpressions = availableExpressions.value.filter(expression =>
    missingExpressionFiles.includes(expression.expressionFile),
  )

  if (targetExpressions.length === 0)
    return

  const loadedOverrides = await loadExpressionOverrideEntries(modelSrcRef.value, targetExpressions)
  expressionOverrides.value = {
    ...expressionOverrides.value,
    ...loadedOverrides,
  }

  const allParameters = Object.values(expressionOverrides.value).flatMap(parameters => parameters)
  expressionOverrideParameterIds.value = [...new Set(allParameters.map(parameter => parameter.Id))]
  expressionGroupKeys.value = Object.fromEntries(Object.entries(expressionOverrides.value).map(([expressionFile, parameters]) => [
    expressionFile,
    [...new Set(parameters.map(parameter => parameter.Id))],
  ]))
  captureMissingExpressionDefaults()
  expressionRenderedValues.value = {}
}

function normalizeActiveExpressionFiles(expressionIds: string[]) {
  return expressionIds.reduce<string[]>((normalizedExpressions, expressionId) => {
    if (!expressionId || normalizedExpressions.includes(expressionId))
      return normalizedExpressions

    const nextGroupKeys = expressionGroupKeys.value[expressionId] ?? [expressionId]
    const filteredExpressionFiles = normalizedExpressions.filter((activeExpressionFile) => {
      const activeGroupKeys = expressionGroupKeys.value[activeExpressionFile] ?? [activeExpressionFile]
      return !activeGroupKeys.some(groupKey => nextGroupKeys.includes(groupKey))
    })

    return [...filteredExpressionFiles, expressionId]
  }, [])
}

const themeColorsHue = toRef(() => props.themeColorsHue)
const themeColorsHueDynamic = toRef(() => props.themeColorsHueDynamic)
const live2dIdleAnimationEnabled = toRef(() => props.live2dIdleAnimationEnabled)
const live2dAutoBlinkEnabled = toRef(() => props.live2dAutoBlinkEnabled)
const live2dForceAutoBlinkEnabled = toRef(() => props.live2dForceAutoBlinkEnabled)
const live2dShadowEnabled = toRef(() => props.live2dShadowEnabled)

const localCurrentMotion = ref<{ group: string, index: number }>({ group: 'Idle', index: 0 })
const beatSync = createBeatSyncController({
  baseAngles: () => ({
    x: modelParameters.value.angleX,
    y: modelParameters.value.angleY,
    z: modelParameters.value.angleZ,
  }),
  initialStyle: 'sway-sine',
})

// Listen for model reload requests (e.g., when runtime motion is uploaded)
const disposeShouldUpdateView = live2dStore.onShouldUpdateView(() => {
  loadModel()
})

async function loadModel() {
  await until(modelLoading).not.toBeTruthy()

  await modelLoadMutex.acquire()

  modelLoading.value = true
  componentState.value = 'loading'

  if (!pixiApp.value || !pixiApp.value.stage) {
    try {
      // NOTICE: shouldUpdateView can fire while the canvas (pixiApp) is being torn down/recreated.
      // Wait briefly for the new stage instead of bailing out, otherwise we keep a blank screen.
      await until(() => !!pixiApp.value && !!pixiApp.value.stage).toBeTruthy({ timeout: 1500 })
    }
    catch {
      modelLoading.value = false
      componentState.value = 'mounted'
      return
    }
  }

  // REVIEW: here as await until(...) guarded the pixiApp and stage to be valid.
  if (model.value && pixiApp.value?.stage) {
    try {
      restoreInternalModelUpdate?.()
      restoreInternalModelUpdate = undefined
      pixiApp.value.stage.removeChild(model.value)
      model.value.destroy()
    }
    catch (error) {
      console.warn('Error removing old model:', error)
    }
    model.value = undefined
  }
  if (!modelSrcRef.value) {
    console.warn('No Live2D model source provided.')
    modelLoading.value = false
    componentState.value = 'mounted'
    return
  }

  try {
    if (isUnmounted) {
      modelLoading.value = false
      componentState.value = 'mounted'
      return
    }

    const live2DModel = new Live2DModel<PixiLive2DInternalModel>()
    await Live2DFactory.setupLive2DModel(live2DModel, { url: modelSrcRef.value, id: props.modelId }, { autoInteract: false })
    availableMotions.value.forEach((motion) => {
      if (motion.motionName in Emotion) {
        motionMap.value[motion.fileName] = motion.motionName
      }
      else {
        motionMap.value[motion.fileName] = EmotionNeutralMotionName
      }
    })

    // --- Scene

    model.value = live2DModel
    // REVIEW: pixiApp and stage are guaranteed to be valid here due to the until(...) above.
    pixiApp.value!.stage.addChild(model.value)
    initialModelWidth.value = model.value.width
    initialModelHeight.value = model.value.height
    model.value.anchor.set(0.5, 0.5)
    setScaleAndPosition()

    // --- Interaction

    model.value.on('hit', (hitAreas) => {
      if (model.value && hitAreas.includes('body'))
        model.value.motion('tap_body')
    })

    // --- Motion

    const internalModel = model.value.internalModel
    const coreModel = internalModel.coreModel
    const motionManager = internalModel.motionManager
    const expressionManager = motionManager.expressionManager
    coreModel.setParameterValueById('ParamMouthOpenY', mouthOpenSize.value)

    availableMotions.value = Object
      .entries(motionManager.definitions)
      .flatMap(([motionName, definition]) => (definition?.map((motion: any, index: number) => ({
        motionName,
        motionIndex: index,
        fileName: motion.File,
      })) || []))
      .filter(Boolean)

    availableExpressions.value = expressionManager?.definitions?.map((definition: any, index: number) => ({
      expressionName: definition?.Name || definition?.name || `Expression ${index + 1}`,
      expressionFile: expressionManager.getExpressionFile(definition),
      expressionIndex: index,
    })) || []
    resetExpressionOverrides()
    if (props.modelId === 'preset-live2d-mita' && availableExpressions.value.length > 0) {
      await ensureExpressionOverridesLoaded(availableExpressions.value.map(expression => expression.expressionFile))
      clearMitaExpressionOverrides()
    }

    if (currentExpression.value && !availableExpressions.value.some(expression =>
      expression.expressionFile === currentExpression.value
      || expression.expressionName === currentExpression.value,
    )) {
      currentExpression.value = ''
    }

    const availableExpressionFiles = new Set(availableExpressions.value.map(expression => expression.expressionFile))
    activeExpressions.value = activeExpressions.value.filter(expressionFile => availableExpressionFiles.has(expressionFile))

    // Check if user has selected a runtime motion to play as idle
    const selectedMotionGroup = localStorage.getItem('selected-runtime-motion-group')
    const selectedMotionIndex = localStorage.getItem('selected-runtime-motion-index')

    // Configure the selected motion to loop
    if (selectedMotionGroup !== null && selectedMotionIndex) {
      const groupIndex = (motionManager.groups as Record<string, any>)[selectedMotionGroup]
      if (groupIndex !== undefined && motionManager.motionGroups[groupIndex]) {
        const motionIndex = Number.parseInt(selectedMotionIndex)
        const motion = motionManager.motionGroups[groupIndex][motionIndex]
        if (motion && motion._looper) {
          // Force the motion to loop
          motion._looper.loopDuration = 0 // 0 means infinite loop
          console.info('Configured motion to loop infinitely:', selectedMotionGroup, motionIndex)
        }
      }
    }

    if (selectedMotionGroup !== null && selectedMotionIndex && live2dIdleAnimationEnabled.value) {
      setTimeout(() => {
        console.info('Playing selected runtime motion:', selectedMotionGroup, selectedMotionIndex)
        currentMotion.value = {
          group: selectedMotionGroup,
          index: Number.parseInt(selectedMotionIndex),
        }
      }, 300)
    }

    // Remove eye ball movements from idle motion group to prevent conflicts
    // This is too hacky
    // FIXME: it cannot blink if loading a model only have idle motion
    if (motionManager.groups.idle) {
      motionManager.motionGroups[motionManager.groups.idle]?.forEach((motion) => {
        motion._motionData.curves.forEach((curve: any) => {
        // TODO: After emotion mapper, stage editor, eye related parameters should be take cared to be dynamical instead of hardcoding
          if (curve.id === 'ParamEyeBallX' || curve.id === 'ParamEyeBallY') {
            curve.id = `_${curve.id}`
          }
        })
      })
    }

    // This is hacky too
    const motionManagerUpdate = useLive2DMotionManagerUpdate({
      internalModel,
      motionManager,
      modelParameters,
      live2dIdleAnimationEnabled,
      live2dAutoBlinkEnabled,
      live2dForceAutoBlinkEnabled,
      lastUpdateTime,
    })

    if (props.modelId !== 'preset-live2d-mita') {
      // NOTICE: Mita drives head angles from pointer focus in a dedicated post-update pass.
      // Registering beat-sync here makes ParamAngleX/Y/Z oscillate between the beat base
      // (which stays at the persisted modelParameters store defaults) and the pointer target,
      // causing visible jitter while following the cursor.
      motionManagerUpdate.register(useMotionUpdatePluginBeatSync(beatSync), 'pre')
    }
    motionManagerUpdate.register(useMotionUpdatePluginIdleDisable(), 'pre')
    motionManagerUpdate.register(useMotionUpdatePluginIdleFocusWithControl(disableIdleEyeFocus, idleEyeFocus.value), 'post')
    motionManagerUpdate.register(useMotionUpdatePluginAutoEyeBlink(), 'post')
    const hookedUpdate = motionManager.update as (model: PixiLive2DInternalModel['coreModel'], now: number) => boolean
    motionManager.update = function (model: PixiLive2DInternalModel['coreModel'], now: number) {
      return motionManagerUpdate.hookUpdate(model, now, hookedUpdate)
    }

    const originalInternalModelUpdate = internalModel.update.bind(internalModel)
    internalModel.update = ((dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp) => {
      originalInternalModelUpdate(dt, now)
      applyExpressionOverrides()
      // NOTICE: Mita's physics file already derives body angles from head angles.
      // Writing ParamBodyAngle* here fights the physics outputs and causes visible shaking.
      // Auto blink is also handled by the shared motion-manager plugin, so keep this hook focused
      // on head + eye tracking only.
      updateMitaFocus(normalizeFocusTarget(focusAt.value))
    }) as typeof internalModel.update
    restoreInternalModelUpdate = () => {
      internalModel.update = originalInternalModelUpdate
    }

    motionManager.on('motionStart', (group, index) => {
      localCurrentMotion.value = { group, index }
    })

    // Listen for motion finish to restart runtime motion for looping
    motionManager.on('motionFinish', () => {
      const selectedMotionGroup = localStorage.getItem('selected-runtime-motion-group')
      const selectedMotionIndex = localStorage.getItem('selected-runtime-motion-index')

      if (selectedMotionGroup !== null && selectedMotionIndex && live2dIdleAnimationEnabled.value) {
        // Restart the selected runtime motion immediately for seamless looping
        console.info('Motion finished, restarting runtime motion:', selectedMotionGroup, selectedMotionIndex)
        // Use requestAnimationFrame to restart on the next frame for smooth transition
        requestAnimationFrame(() => {
          currentMotion.value = {
            group: selectedMotionGroup,
            index: Number.parseInt(selectedMotionIndex),
          }
        })
      }
    })

    // Apply all stored parameters to the model
    coreModel.setParameterValueById('ParamAngleX', modelParameters.value.angleX)
    coreModel.setParameterValueById('ParamAngleY', modelParameters.value.angleY)
    coreModel.setParameterValueById('ParamAngleZ', modelParameters.value.angleZ)
    coreModel.setParameterValueById('ParamEyeLOpen', modelParameters.value.leftEyeOpen)
    coreModel.setParameterValueById('ParamEyeROpen', modelParameters.value.rightEyeOpen)
    coreModel.setParameterValueById('ParamEyeSmile', modelParameters.value.leftEyeSmile)
    coreModel.setParameterValueById('ParamBrowLX', modelParameters.value.leftEyebrowLR)
    coreModel.setParameterValueById('ParamBrowRX', modelParameters.value.rightEyebrowLR)
    coreModel.setParameterValueById('ParamBrowLY', modelParameters.value.leftEyebrowY)
    coreModel.setParameterValueById('ParamBrowRY', modelParameters.value.rightEyebrowY)
    coreModel.setParameterValueById('ParamBrowLAngle', modelParameters.value.leftEyebrowAngle)
    coreModel.setParameterValueById('ParamBrowRAngle', modelParameters.value.rightEyebrowAngle)
    coreModel.setParameterValueById('ParamBrowLForm', modelParameters.value.leftEyebrowForm)
    coreModel.setParameterValueById('ParamBrowRForm', modelParameters.value.rightEyebrowForm)
    coreModel.setParameterValueById('ParamMouthOpenY', modelParameters.value.mouthOpen)
    coreModel.setParameterValueById('ParamMouthForm', modelParameters.value.mouthForm)
    coreModel.setParameterValueById('ParamCheek', modelParameters.value.cheek)
    coreModel.setParameterValueById('ParamBodyAngleX', modelParameters.value.bodyAngleX)
    coreModel.setParameterValueById('ParamBodyAngleY', modelParameters.value.bodyAngleY)
    coreModel.setParameterValueById('ParamBodyAngleZ', modelParameters.value.bodyAngleZ)
    coreModel.setParameterValueById('ParamBreath', modelParameters.value.breath)

    emits('modelLoaded')
  }
  catch (error) {
    console.error('[Live2D] Failed to load model.', {
      modelId: props.modelId,
      modelSrc: modelSrcRef.value,
      error,
    })

    try {
      restoreInternalModelUpdate?.()
      restoreInternalModelUpdate = undefined
      if (model.value && pixiApp.value?.stage) {
        pixiApp.value.stage.removeChild(model.value)
        model.value.destroy()
      }
    }
    catch (cleanupError) {
      console.warn('[Live2D] Failed to clean up model after load error.', cleanupError)
    }

    model.value = undefined
    availableMotions.value = []
    availableExpressions.value = []
    currentExpression.value = ''
    activeExpressions.value = []
    resetExpressionOverrides()
    emits('error', error)
  }
  finally {
    modelLoading.value = false
    componentState.value = 'mounted'
    modelLoadMutex.release()
  }
}

async function setMotion(motionName: string, index?: number) {
  // TODO: motion? Not every Live2D model has motion, we do need to help users to set motion
  if (!model.value) {
    console.warn('Cannot set motion: model not loaded')
    return
  }

  console.info('Setting motion:', motionName, 'index:', index)
  try {
    await model.value.motion(motionName, index, MotionPriority.FORCE)
    console.info('Motion started successfully:', motionName)
  }
  catch (error) {
    console.error('Failed to start motion:', motionName, error)
  }
}

async function setExpression(expressionId: string) {
  const expressionManager = model.value?.internalModel.motionManager.expressionManager
  if (!model.value)
    return

  if (props.modelId === 'preset-live2d-mita') {
    if (expressionId)
      await ensureExpressionOverridesLoaded([expressionId])
    applyExpressionOverrides()
    return
  }

  if (!expressionManager)
    return

  if (!expressionId) {
    expressionManager.resetExpression()
    return
  }

  try {
    const selectedExpression = availableExpressions.value.find(expression =>
      expression.expressionFile === expressionId
      || expression.expressionName === expressionId,
    )

    if (selectedExpression) {
      await model.value.expression(selectedExpression.expressionIndex)
      return
    }

    await model.value.expression(expressionId)
  }
  catch (error) {
    console.error('Failed to set expression:', expressionId, error)
  }
}

const handleResize = useDebounceFn(setScaleAndPosition, 100)

const dropShadowColorComputer = ref<HTMLDivElement>()
const dropShadowAnimationId = ref(0)

function updateDropShadowFilter() {
  if (!model.value)
    return

  if (!live2dShadowEnabled.value) {
    model.value.filters = []
    return
  }

  if (!dropShadowColorComputer.value)
    return

  const color = getComputedStyle(dropShadowColorComputer.value).backgroundColor
  dropShadowFilter.value.color = Number(formatHex(color)!.replace('#', '0x'))
  model.value.filters = [dropShadowFilter.value]
}

watch([() => props.width, () => props.height], handleResize)
watch(modelSrcRef, async () => {
  pointerEyeFocus.value = { x: 0, y: 0 }
  pointerHeadFocus.value = { x: 0, y: 0 }
  await loadModel()
}, { immediate: true })
watch(dark, updateDropShadowFilter, { immediate: true })
watch([model, themeColorsHue], updateDropShadowFilter)
watch(live2dShadowEnabled, updateDropShadowFilter)
watch(offset, setScaleAndPosition)
watch(() => props.scale, setScaleAndPosition)

// TODO: This is hacky!
function updateDropShadowFilterLoop() {
  updateDropShadowFilter()
  if (!live2dShadowEnabled.value) {
    dropShadowAnimationId.value = 0
    return
  }

  dropShadowAnimationId.value = requestAnimationFrame(updateDropShadowFilterLoop)
}

watch([themeColorsHueDynamic, live2dShadowEnabled], ([dynamic, shadowEnabled]) => {
  if (dynamic && shadowEnabled) {
    dropShadowAnimationId.value = requestAnimationFrame(updateDropShadowFilterLoop)
  }
  else {
    cancelAnimationFrame(dropShadowAnimationId.value)
    dropShadowAnimationId.value = 0
  }
}, { immediate: true })

watch(mouthOpenSize, value => getCoreModel().setParameterValueById('ParamMouthOpenY', value))
watch(currentMotion, value => setMotion(value.group, value.index))
watch(currentExpression, async value => await setExpression(value))
watch(activeExpressions, async () => {
  if (props.modelId === 'preset-live2d-mita') {
    const normalizedExpressions = normalizeActiveExpressionFiles(activeExpressions.value)
    if (normalizedExpressions.length !== activeExpressions.value.length
      || normalizedExpressions.some((expressionFile, index) => expressionFile !== activeExpressions.value[index])) {
      activeExpressions.value = normalizedExpressions
      return
    }

    if (normalizedExpressions.length === 0) {
      applyExpressionOverrides()
    }
    else {
      await ensureExpressionOverridesLoaded(normalizedExpressions)
      applyExpressionOverrides()
    }
  }
}, { deep: true })
watch(paused, value => value ? pixiApp.value?.stop() : pixiApp.value?.start())

// Watch and apply model parameters
watch(() => modelParameters.value.angleX, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamAngleX', value)
  }
})

watch(() => modelParameters.value.angleY, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamAngleY', value)
  }
})

watch(() => modelParameters.value.angleZ, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamAngleZ', value)
  }
})

watch(() => modelParameters.value.leftEyeOpen, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamEyeLOpen', value)
  }
})

watch(() => modelParameters.value.rightEyeOpen, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamEyeROpen', value)
  }
})

watch(() => modelParameters.value.mouthOpen, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value)
  }
})

watch(() => modelParameters.value.mouthForm, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamMouthForm', value)
  }
})

watch(() => modelParameters.value.cheek, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamCheek', value)
  }
})

watch(() => modelParameters.value.bodyAngleX, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBodyAngleX', value)
  }
})

watch(() => modelParameters.value.bodyAngleY, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBodyAngleY', value)
  }
})

watch(() => modelParameters.value.bodyAngleZ, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBodyAngleZ', value)
  }
})

watch(() => modelParameters.value.breath, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBreath', value)
  }
})

// Watch eyebrow parameters
watch(() => modelParameters.value.leftEyebrowLR, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowLX', value)
  }
})

watch(() => modelParameters.value.rightEyebrowLR, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowRX', value)
  }
})

watch(() => modelParameters.value.leftEyebrowY, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowLY', value)
  }
})

watch(() => modelParameters.value.rightEyebrowY, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowRY', value)
  }
})

watch(() => modelParameters.value.leftEyebrowAngle, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowLAngle', value)
  }
})

watch(() => modelParameters.value.rightEyebrowAngle, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowRAngle', value)
  }
})

watch(() => modelParameters.value.leftEyebrowForm, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowLForm', value)
  }
})

watch(() => modelParameters.value.rightEyebrowForm, (value) => {
  if (model.value) {
    const internalModel = model.value.internalModel
    internalModel.coreModel.setParameterValueById('ParamBrowRForm', value)
  }
})

// Watch for idle animation setting changes and stop motions if disabled
watch(live2dIdleAnimationEnabled, (enabled) => {
  if (!enabled && model.value) {
    const internalModel = model.value.internalModel
    if (internalModel?.motionManager) {
      internalModel.motionManager.stopAllMotions()
    }
  }
})

watch(focusAt, (value) => {
  if (!model.value)
    return
  if (props.disableFocusAt)
    return

  const normalizedTarget = normalizeFocusTarget(value)
  model.value.focus(normalizedTarget.x, normalizedTarget.y)
})

onMounted(() => {
  const removeListener = listenBeatSyncBeatSignal(() => beatSync.scheduleBeat())
  onUnmounted(() => removeListener())
})

onMounted(async () => {
  updateDropShadowFilter()
})

onUnmounted(() => {
  isUnmounted = true
  restoreInternalModelUpdate?.()
  restoreInternalModelUpdate = undefined
  disposeShouldUpdateView?.()
})

function listMotionGroups() {
  return availableMotions.value
}

defineExpose({
  setMotion,
  listMotionGroups,
})

import.meta.hot?.dispose(() => {
  console.warn('[Dev] Reload on HMR dispose is active for this component. Performing a full reload.')
  window.location.reload()
})
</script>

<template>
  <div ref="dropShadowColorComputer" hidden bg="primary-400 dark:primary-500" />
  <slot />
</template>
