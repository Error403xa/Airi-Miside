<script setup lang="ts">
/*
  * - Root component for the Minecraft-skin renderer
  * - Self-contained: its own camera and lighting, no dependency on the VRM
  *   `useModelStore`, so nothing here can perturb the VRM or Live2D paths
  * - Converts AIRI's pixel-space `focusAt` into the normalised -1..1 the rig wants
*/

import type { TresContext } from '@tresjs/core'

import { Screen } from '@proj-airi/ui'
import { TresCanvas } from '@tresjs/core'
import { useElementBounding } from '@vueuse/core'
import { MathUtils, NoToneMapping, PerspectiveCamera } from 'three'
import { computed, ref, shallowRef, watch } from 'vue'

import { MC_MODEL_HEIGHT } from '../composables/minecraft'
import { MinecraftModel } from './Model'

const props = withDefaults(defineProps<{
  /** URL of a 64x64 (or square HD multiple) skin PNG. */
  modelSrc?: string
  paused?: boolean
  /** Force arm width. Detected from the skin when left undefined. */
  slim?: boolean
  /** TTS mouth openness, 0..1. */
  mouthOpenSize?: number
  /** Focus target in *screen pixels*, matching what Live2DScene receives. */
  focusAt?: { x: number, y: number }
  /** Set false to keep the body completely still while speaking. */
  speakingMotion?: boolean
  /**
   * Follow the cursor. Off by default — see MinecraftModel for why. Enabling it
   * also requires passing `focusAt`.
   */
  gazeTracking?: boolean
  /** Run the timed head saccades and occasional idle gestures. */
  idleMotion?: boolean
}>(), {
  paused: false,
  mouthOpenSize: 0,
  speakingMotion: true,
  gazeTracking: false,
  idleMotion: true,
})

const emit = defineEmits<{
  (e: 'error', value: unknown): void
}>()

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

const sceneContainerRef = ref<HTMLDivElement>()
const { width, height } = useElementBounding(sceneContainerRef)

const modelRef = ref<InstanceType<typeof MinecraftModel>>()
const tresCanvasRef = shallowRef<TresContext>()

/*
 * A mild three-quarter view rather than dead-on. Straight ahead, a box character
 * flattens into what looks like a 2D sprite; a few degrees of yaw is what makes
 * the volume read.
 *
 * The camera also looks slightly *down*. That is not styling: the contact shadow
 * lies flat on the floor, so a level camera sees it edge-on and it contributes
 * nothing.
 *
 * NOTICE: the margin is kept tight on purpose. With a generous margin the figure
 * sits mid-frame above a wide empty gap, and on a transparent background a gap
 * below the feet reads as the character hovering no matter how firmly its root is
 * pinned to y = 0. Framing the soles close to the bottom edge, with just enough
 * floor for the shadow, is what actually makes it look planted.
 *
 * The distance is derived from the model's own height so the framing survives any
 * change to MC_UNIT: fitting `height` world units into a vertical field of view
 * puts the camera `height / (2 * tan(fov / 2))` away.
 */
const CAMERA_FOV = 35
const CAMERA_MARGIN = 1.2
const CAMERA_PITCH_DEG = 11

const camera = shallowRef(new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100))
/*
 * Aimed slightly above the midpoint. That is what buys the headroom `happy`'s hop
 * needs while still letting the bottom edge sit close under the soles — the two
 * pull against each other, and biasing the aim up is cheaper than shrinking the hop.
 */
const aimHeight = MC_MODEL_HEIGHT * 0.54
const cameraDistance = (MC_MODEL_HEIGHT * CAMERA_MARGIN) / (2 * Math.tan(MathUtils.degToRad(CAMERA_FOV) / 2))

camera.value.position.set(
  0.45,
  aimHeight + cameraDistance * Math.tan(MathUtils.degToRad(CAMERA_PITCH_DEG)),
  cameraDistance,
)
camera.value.lookAt(0, aimHeight, 0)

watch([width, height], ([w, h]) => {
  if (!w || !h)
    return

  camera.value.aspect = w / h
  camera.value.updateProjectionMatrix()
}, { immediate: true })

/*
 * AIRI hands `focusAt` around in screen pixels (see how stage-pocket passes
 * `{ x: width / 2, y: height / 2 }`), while the rig wants -1..1 with +y up.
 * Screen y grows downward, hence the negation.
 */
const normalizedFocus = computed(() => {
  if (!props.focusAt || !width.value || !height.value)
    return { x: 0, y: 0 }

  return {
    x: (props.focusAt.x / width.value) * 2 - 1,
    y: -((props.focusAt.y / height.value) * 2 - 1),
  }
})

function onModelLoadStart() {
  componentState.value = 'loading'
}

function onModelLoaded() {
  componentState.value = 'mounted'
}

function onTresReady(context: TresContext) {
  tresCanvasRef.value = context
}

defineExpose({
  setExpression: (expression: string, intensity = 1) => {
    modelRef.value?.setExpression(expression, intensity)
  },
  currentEmotion: () => modelRef.value?.currentEmotion(),
  canvasElement: () => tresCanvasRef.value?.renderer.instance.domElement,
  camera: () => camera.value,
})
</script>

<template>
  <Screen>
    <div ref="sceneContainerRef" class="h-full w-full">
      <TresCanvas
        :camera="camera"
        :antialias="false"
        :width="width"
        :height="height"
        :tone-mapping="NoToneMapping"
        :clear-alpha="0"
        @ready="onTresReady"
      >
        <!--
          Antialiasing is off and tone mapping is disabled on purpose: both
          soften pixel art. Nearest-neighbour sampling plus untouched colours is
          what keeps a 64x64 skin looking like a 64x64 skin.
        -->
        <TresHemisphereLight
          :color="0xFFFFFF"
          :ground-color="0x8899AA"
          :position="[0, 1, 0]"
          :intensity="1.6"
        />
        <TresAmbientLight :color="0xFFFFFF" :intensity="0.5" />
        <TresDirectionalLight
          :color="0xFFFFFF"
          :position="[2, 4, 3]"
          :intensity="1.3"
        />
        <MinecraftModel
          ref="modelRef"
          :model-src="props.modelSrc"
          :paused="props.paused"
          :slim="props.slim"
          :mouth-open-size="props.mouthOpenSize"
          :focus="normalizedFocus"
          :speaking-motion="props.speakingMotion"
          :gaze-tracking="props.gazeTracking"
          :idle-motion="props.idleMotion"
          @load-start="onModelLoadStart"
          @loaded="onModelLoaded"
          @error="(err: unknown) => emit('error', err)"
        />
      </TresCanvas>
    </div>
  </Screen>
</template>
