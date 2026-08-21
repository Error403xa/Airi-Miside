<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Cake {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  rotation: number
  spin: number
  scale: number
}

const DURATION_MS = 10 * 60 * 1000
const STORAGE_PREFIX = 'airi/birthday-cake-rain'
const GRAVITY = 180
const CAKE_COUNT = 42

const cakes = ref<Cake[]>([])
const active = ref(false)
const viewport = ref({ width: 0, height: 0 })
const renderedMilliseconds = ref(0)

let frameId: number | undefined
let lastFrameAt = 0
let lastPersistedAt = 0
let nextCakeId = 0

function birthdayYear(): number | undefined {
  // Birthday date is intentionally fixed to August 21 (month is zero-based).
  const now = new Date()
  return now.getMonth() === 7 && now.getDate() === 21 ? now.getFullYear() : undefined
}

function storageKey(year: number): string {
  return `${STORAGE_PREFIX}/${year}`
}

function loadRenderedMilliseconds(year: number): number {
  try {
    const stored = Number.parseInt(localStorage.getItem(storageKey(year)) || '0', 10)
    return Number.isFinite(stored) && stored > 0 ? Math.min(stored, DURATION_MS) : 0
  }
  catch {
    return 0
  }
}

function persistRenderedMilliseconds(year: number): void {
  try {
    localStorage.setItem(storageKey(year), Math.min(Math.round(renderedMilliseconds.value), DURATION_MS).toString())
  }
  catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function createCake(y = randomBetween(-120, -30)): Cake {
  return {
    id: nextCakeId++,
    x: randomBetween(0, Math.max(viewport.value.width, 1)),
    y,
    velocityX: randomBetween(-18, 18),
    velocityY: randomBetween(20, 70),
    rotation: randomBetween(-25, 25),
    spin: randomBetween(-100, 100),
    scale: randomBetween(0.78, 1.18),
  }
}

function resetCakes(): void {
  cakes.value = Array.from({ length: CAKE_COUNT }, () => createCake(randomBetween(-viewport.value.height, -30)))
}

function updateViewport(): void {
  viewport.value = { width: window.innerWidth, height: window.innerHeight }
}

function persist(): void {
  const year = birthdayYear()
  if (year !== undefined)
    persistRenderedMilliseconds(year)
}

function animate(now: number): void {
  if (!active.value)
    return

  const year = birthdayYear()
  if (year === undefined) {
    active.value = false
    cakes.value = []
    return
  }

  if (document.visibilityState !== 'visible') {
    lastFrameAt = now
    frameId = requestAnimationFrame(animate)
    return
  }

  const elapsed = lastFrameAt > 0 ? Math.min(now - lastFrameAt, 100) : 0
  lastFrameAt = now
  renderedMilliseconds.value += elapsed
  if (now - lastPersistedAt >= 1000) {
    persistRenderedMilliseconds(year)
    lastPersistedAt = now
  }

  if (renderedMilliseconds.value >= DURATION_MS) {
    active.value = false
    cakes.value = []
    persist()
    return
  }

  const seconds = elapsed / 1000
  for (const cake of cakes.value) {
    cake.velocityX += Math.sin(now / 900 + cake.id) * 5 * seconds
    cake.velocityX = Math.max(-45, Math.min(45, cake.velocityX))
    cake.velocityY += GRAVITY * seconds
    cake.x += cake.velocityX * seconds
    cake.y += cake.velocityY * seconds
    cake.rotation += cake.spin * seconds

    if (cake.x < -20 || cake.x > viewport.value.width + 20) {
      cake.x = Math.max(-20, Math.min(viewport.value.width + 20, cake.x))
      cake.velocityX *= -0.65
    }

    if (cake.y > viewport.value.height + 100) {
      const id = cake.id
      Object.assign(cake, createCake(), { id })
    }
  }

  frameId = requestAnimationFrame(animate)
}

function handleVisibilityChange(): void {
  lastFrameAt = 0
}

const cakeStyles = computed(() => cakes.value.map(cake => ({
  key: cake.id,
  style: {
    transform: `translate3d(${cake.x}px, ${cake.y}px, 0) rotate(${cake.rotation}deg) scale(${cake.scale})`,
  },
})))

onMounted(() => {
  const year = birthdayYear()
  if (year === undefined)
    return

  renderedMilliseconds.value = loadRenderedMilliseconds(year)
  if (renderedMilliseconds.value >= DURATION_MS)
    return

  updateViewport()
  resetCakes()
  active.value = true
  window.addEventListener('resize', updateViewport, { passive: true })
  window.addEventListener('pagehide', persist)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  frameId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  if (frameId !== undefined)
    cancelAnimationFrame(frameId)
  persist()
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('pagehide', persist)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      aria-hidden="true"
      class="birthday-cake-rain"
    >
      <span
        v-for="cake in cakeStyles"
        :key="cake.key"
        class="birthday-cake-rain__cake"
        :style="cake.style"
      >🎂</span>
    </div>
  </Teleport>
</template>

<style scoped>
.birthday-cake-rain {
  position: fixed;
  inset: 0;
  z-index: 30;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  contain: strict;
  isolation: isolate;
}

.birthday-cake-rain,
.birthday-cake-rain * {
  box-sizing: border-box;
  pointer-events: none;
}

.birthday-cake-rain__cake {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 1em;
  height: 1em;
  margin: 0;
  padding: 0;
  font-size: 1.875rem;
  line-height: 1;
  white-space: nowrap;
  will-change: transform;
}
</style>
