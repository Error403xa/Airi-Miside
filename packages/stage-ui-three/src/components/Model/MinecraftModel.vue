<script setup lang="ts">
/*
  * - Renders a Minecraft skin as a box-geometry humanoid inside a Tres scene
  * - Owns the rig lifecycle: load skin -> build rig -> add to scene -> dispose
  * - Drives posture every frame through `useMinecraftEmote`
  *
  * Deliberately has no facial animation. A Minecraft skin bakes the face into an
  * 8x8 patch, and arbitrary user skins may show sunglasses, a mask or an animal,
  * so repainting eyes or a mouth onto the texture would corrupt as many skins as
  * it improved. Emotion, gaze and speech all ride on posture instead.
*/

import type { MinecraftRig } from '../../composables/minecraft'

import { useLoop, useTresContext } from '@tresjs/core'
import { onUnmounted, ref, toRef, watch } from 'vue'

import { buildMinecraftRig, loadSkinTexture, useMinecraftEmote } from '../../composables/minecraft'

const props = withDefaults(defineProps<{
  /** URL of a 64x64 (or square HD multiple) skin PNG. */
  modelSrc?: string
  /** Freeze animation without tearing the rig down. */
  paused?: boolean
  /**
   * Force slim ("Alex", 3-wide arms) or classic proportions. Left undefined the
   * layout is detected from the skin itself, which is almost always what you want —
   * rendering a slim skin as classic maps two blank columns onto the hands.
   */
  slim?: boolean
  /** TTS mouth openness, 0..1. Drives speaking posture, not a mouth shape. */
  mouthOpenSize?: number
  /** Focus target already normalised to -1..1, +y up. */
  focus?: { x: number, y: number }
  /** Let TTS amplitude nod the head while speaking. */
  speakingMotion?: boolean
  /**
   * Turn the head, torso and stance toward `focus`. Off by default: cursor
   * tracking on a box character reads as the model being tethered to the mouse
   * rather than looking at anything, so the idle scan carries the gaze instead.
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
  (e: 'loadStart'): void
  (e: 'loaded', value: string): void
  (e: 'error', value: unknown): void
}>()

const { scene } = useTresContext()
const { onBeforeRender } = useLoop()

const modelLoaded = ref(false)
const modelSrc = toRef(() => props.modelSrc)

let rig: MinecraftRig | undefined
let emote: ReturnType<typeof useMinecraftEmote> | undefined
/*
 * Guards against a slow load finishing after the user has already picked another
 * skin. Without it, an out-of-order response would attach a stale rig.
 */
let loadToken = 0

function teardown() {
  rig?.dispose()
  rig = undefined
  emote = undefined
  modelLoaded.value = false
}

async function load(src?: string) {
  teardown()

  if (!src)
    return

  const token = ++loadToken
  emit('loadStart')

  try {
    const { texture, slim } = await loadSkinTexture(src)

    if (token !== loadToken || !scene.value) {
      texture.dispose()
      return
    }

    rig = buildMinecraftRig(texture, { slim: props.slim ?? slim })
    emote = useMinecraftEmote(rig)
    emote.setEmotion('neutral')

    scene.value.add(rig.object)
    modelLoaded.value = true
    emit('loaded', src)
  }
  catch (error) {
    if (token === loadToken)
      emit('error', error)
  }
}

watch([modelSrc, () => props.slim], () => void load(modelSrc.value), { immediate: true })

onBeforeRender(({ delta }) => {
  if (!emote || props.paused)
    return

  emote.update(delta, {
    mouthOpen: props.mouthOpenSize,
    focus: props.focus,
    speakingMotion: props.speakingMotion,
    gazeTracking: props.gazeTracking,
    idleMotion: props.idleMotion,
  })
})

onUnmounted(() => teardown())

defineExpose({
  /*
   * Named `setExpression` rather than `setEmotion` so the scene wrapper can call
   * it exactly the way it calls the VRM path.
   */
  setExpression: (expression: string, intensity = 1) => {
    emote?.setEmotion(expression, intensity)
  },
  currentEmotion: () => emote?.getCurrentEmotion(),
  rig: () => rig,
})
</script>

<template>
  <slot v-if="modelLoaded" />
</template>
