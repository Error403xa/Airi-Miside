import type { DisplayModel } from '../display-models'

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { refManualReset, useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'

import { DisplayModelFormat, useDisplayModelsStore } from '../display-models'

const defaultStageModelSelected = 'preset-live2d-mita'

export const useSettingsStageModel = defineStore('settings-stage-model', () => {
  const displayModelsStore = useDisplayModelsStore()

  const stageModelSelected = useLocalStorageManualReset<string>('settings/stage/model', defaultStageModelSelected)
  const stageModelSelectedDisplayModel = refManualReset<DisplayModel | undefined>(undefined)
  const stageModelSelectedUrl = refManualReset<string | undefined>(undefined)
  const stageModelRenderer = refManualReset<'live2d' | 'vrm' | 'disabled' | undefined>(undefined)

  const stageViewControlsEnabled = refManualReset<boolean>(false)

  async function updateStageModel() {
    if (!stageModelSelected.value) {
      stageModelSelectedUrl.value = undefined
      stageModelSelectedDisplayModel.value = undefined
      stageModelRenderer.value = 'disabled'
      return
    }

    let model = await displayModelsStore.getDisplayModel(stageModelSelected.value)
    if (!model) {
      stageModelSelected.value = defaultStageModelSelected
      model = await displayModelsStore.getDisplayModel(defaultStageModelSelected)
    }

    if (!model) {
      stageModelSelectedUrl.value = undefined
      stageModelSelectedDisplayModel.value = undefined
      stageModelRenderer.value = 'disabled'
      return
    }

    switch (model.format) {
      case DisplayModelFormat.Live2dZip:
      case DisplayModelFormat.Live2dDirectory:
        stageModelRenderer.value = 'live2d'
        break
      case DisplayModelFormat.VRM:
        stageModelRenderer.value = 'vrm'
        break
      default:
        stageModelRenderer.value = 'disabled'
        break
    }

    if (model.type === 'file') {
      if (stageModelSelectedUrl.value) {
        URL.revokeObjectURL(stageModelSelectedUrl.value)
      }

      stageModelSelectedUrl.value = URL.createObjectURL(model.file)
    }
    else {
      stageModelSelectedUrl.value = model.url
    }

    stageModelSelectedDisplayModel.value = model
  }

  async function initializeStageModel() {
    await updateStageModel()
  }

  useEventListener('unload', () => {
    if (stageModelSelectedUrl.value) {
      URL.revokeObjectURL(stageModelSelectedUrl.value)
    }
  })

  async function resetState() {
    if (stageModelSelectedUrl.value)
      URL.revokeObjectURL(stageModelSelectedUrl.value)

    stageModelSelected.reset()
    stageModelSelectedDisplayModel.reset()
    stageModelSelectedUrl.reset()
    stageModelRenderer.reset()
    stageViewControlsEnabled.reset()

    await updateStageModel()
  }

  return {
    stageModelRenderer,
    stageModelSelected,
    stageModelSelectedUrl,
    stageModelSelectedDisplayModel,
    stageViewControlsEnabled,

    initializeStageModel,
    updateStageModel,
    resetState,
  }
})
