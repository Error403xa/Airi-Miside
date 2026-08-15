import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export const useStageDisplayStore = defineStore('stage-display', () => {
  const immersiveStageEnabled = useLocalStorage<boolean>('stage/display/immersive-stage-enabled', false)

  function toggleImmersiveStage() {
    immersiveStageEnabled.value = !immersiveStageEnabled.value
  }

  return {
    immersiveStageEnabled,
    toggleImmersiveStage,
  }
})
