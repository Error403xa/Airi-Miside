<script setup lang="ts">
import { useStageDisplayStore } from '@proj-airi/stage-ui/stores/stage-display'
import { storeToRefs } from 'pinia'

import HeaderAvatar from './HeaderAvatar.vue'
import MobileHeaderLink from './MobileHeaderLink.vue'

const stageDisplayStore = useStageDisplayStore()
const { immersiveStageEnabled } = storeToRefs(stageDisplayStore)

function toggleTitle() {
  return immersiveStageEnabled.value
    ? '恢复界面'
    : '只显示人物'
}
</script>

<template>
  <header mb-1 w-full flex items-center justify-between gap-2 px-2>
    <MobileHeaderLink />
    <div flex items-center gap-2>
      <button
        border="2 solid neutral-100/60 dark:neutral-800/30"
        bg="neutral-50/70 dark:neutral-800/70"
        w-fit
        flex
        items-center
        self-end
        justify-center
        rounded-xl
        p-2
        backdrop-blur-md
        :title="toggleTitle()"
        :aria-label="toggleTitle()"
        @click="stageDisplayStore.toggleImmersiveStage()"
      >
        <div :class="[immersiveStageEnabled ? 'i-solar:eye-outline' : 'i-solar:eye-closed-outline', 'size-5', 'text-neutral-500 dark:text-neutral-400']" />
      </button>
      <HeaderAvatar />
    </div>
  </header>
</template>
