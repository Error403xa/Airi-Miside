<script setup lang="ts">
import { Screen } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import Live2DCanvas from './live2d/Canvas.vue'
import Live2DModel from './live2d/Model.vue'

import { useLive2d } from '../../stores/live2d'

import '../../utils/live2d-zip-loader'
import '../../utils/live2d-opfs-registration'

const props = withDefaults(defineProps<{
  modelSrc?: string
  modelId?: string

  paused?: boolean
  mouthOpenSize?: number
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
  live2dMaxFps?: number
}>(), {
  paused: false,
  focusAt: () => ({ x: 0, y: 0 }),
  mouthOpenSize: 0,
  scale: 1,
  focusTrackingStrengthX: 1,
  focusTrackingStrengthY: 1,
  themeColorsHue: 220.44,
  themeColorsHueDynamic: false,
  live2dIdleAnimationEnabled: true,
  live2dAutoBlinkEnabled: true,
  live2dForceAutoBlinkEnabled: false,
  live2dShadowEnabled: true,
  live2dMaxFps: 0,
})

const emits = defineEmits<{
  (e: 'error', error: unknown): void
}>()

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })
const componentStateCanvas = defineModel<'pending' | 'loading' | 'mounted'>('canvasState', { default: 'pending' })
const componentStateModel = defineModel<'pending' | 'loading' | 'mounted'>('modelState', { default: 'pending' })

const live2dCanvasRef = ref<InstanceType<typeof Live2DCanvas>>()

const live2d = useLive2d()
const { positionInPercentageString } = storeToRefs(live2d)
const live2dXOffset = computed(() => props.xOffset ?? positionInPercentageString.value.x)
const live2dYOffset = computed(() => props.yOffset ?? positionInPercentageString.value.y)

watch([componentStateModel, componentStateCanvas], () => {
  componentState.value = (componentStateModel.value === 'mounted' && componentStateCanvas.value === 'mounted')
    ? 'mounted'
    : 'loading'
})

function handleModelError(error: unknown) {
  emits('error', error)
}

defineExpose({
  canvasElement: () => {
    return live2dCanvasRef.value?.canvasElement()
  },
})
</script>

<template>
  <Screen v-slot="{ width, height }" relative>
    <Live2DCanvas
      ref="live2dCanvasRef"
      v-slot="{ app }"
      v-model:state="componentStateCanvas"
      :width="width"
      :height="height"
      :resolution="2"
      :max-fps="live2dMaxFps"
      max-h="100dvh"
    >
      <Live2DModel
        v-model:state="componentStateModel"
        :model-src="modelSrc"
        :model-id="modelId"
        :app="app"
        :mouth-open-size="mouthOpenSize"
        :width="width"
        :height="height"
        :paused="paused"
        :focus-at="focusAt"
        :x-offset="live2dXOffset"
        :y-offset="live2dYOffset"
        :scale="scale"
        :disable-focus-at="disableFocusAt"
        :disable-idle-eye-focus="disableIdleEyeFocus"
        :focus-ignore-left-ratio="focusIgnoreLeftRatio"
        :focus-tracking-strength-x="focusTrackingStrengthX"
        :focus-tracking-strength-y="focusTrackingStrengthY"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
        :live2d-idle-animation-enabled="live2dIdleAnimationEnabled"
        :live2d-auto-blink-enabled="live2dAutoBlinkEnabled"
        :live2d-force-auto-blink-enabled="live2dForceAutoBlinkEnabled"
        :live2d-shadow-enabled="live2dShadowEnabled"
        @error="handleModelError"
      />
    </Live2DCanvas>
  </Screen>
</template>
