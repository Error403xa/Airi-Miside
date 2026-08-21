import localforage from 'localforage'

import { loadLive2DModelPreview as generateLive2DPreview } from '@proj-airi/stage-ui-live2d/utils/live2d-preview'
import { loadVrmModelPreview as generateVrmPreview } from '@proj-airi/stage-ui-three/utils/vrm-preview'
import { until } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import '@proj-airi/stage-ui-live2d/utils/live2d-zip-loader'
import '@proj-airi/stage-ui-live2d/utils/live2d-opfs-registration'

export enum DisplayModelFormat {
  Live2dZip = 'live2d-zip',
  Live2dDirectory = 'live2d-directory',
  VRM = 'vrm',
  PMXZip = 'pmx-zip',
  PMXDirectory = 'pmx-directory',
  PMD = 'pmd',
  MinecraftSkin = 'minecraft-skin',
}

export type DisplayModel
  = | DisplayModelFile
    | DisplayModelURL

const presetLive2dProUrl = './assets/live2d/models/hiyori_pro_zh.zip'
const presetLive2dFreeUrl = './assets/live2d/models/hiyori_free_zh.zip'
const presetLive2dPreview = './assets/live2d/models/hiyori/preview.png'
const presetLive2dMitaUrl = './assets/live2d/models/mita/mita.model3.json'
const presetLive2dMitaPreview = './assets/live2d/models/mita/preview.png'
const presetLive2dXiaoMitaUrl = './assets/live2d/models/xiaomita/3.model3.json'
const presetLive2dXiaoMitaPreview = './assets/live2d/models/xiaomita/3.4096/texture_00.png'
const presetLive2dXiaoMitaProUrl = './assets/live2d/models/xiaomita-pro/3.model3.json'
const presetLive2dXiaoMitaProPreview = './assets/live2d/models/xiaomita-pro/3.4096/texture_00.png'
const presetVrmAvatarAUrl = new URL('../assets/vrm/models/AvatarSample-A/AvatarSample_A.vrm', import.meta.url).href
const presetVrmAvatarAPreview = new URL('../assets/vrm/models/AvatarSample-A/preview.png', import.meta.url).href
const presetVrmAvatarBUrl = new URL('../assets/vrm/models/AvatarSample-B/AvatarSample_B.vrm', import.meta.url).href
const presetVrmAvatarBPreview = new URL('../assets/vrm/models/AvatarSample-B/preview.png', import.meta.url).href

/*
 * Minecraft skins are enumerated from disk rather than listed by hand, so
 * dropping a new PNG into `src/assets/minecraft-skins/` is enough to make it
 * appear in the character list. The display name is the bare filename, which is
 * how these skins are identified everywhere else.
 *
 * NOTICE: `importedAt` is derived from a fixed epoch plus the sorted index rather
 * than `Date.now()`. These are presets, not user imports, so the value has to be
 * stable across reloads or the list would reshuffle on every start.
 */
const minecraftSkinModules = import.meta.glob<string>('../assets/minecraft-skins/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const minecraftSkinPresetsEpoch = 1733113886900

const minecraftSkinPresets: DisplayModel[] = Object.entries(minecraftSkinModules)
  .map(([path, url]) => ({ name: path.split('/').pop()!.replace(/\.png$/i, ''), url }))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(({ name, url }, index) => ({
    id: `preset-minecraft-${name}`,
    format: DisplayModelFormat.MinecraftSkin,
    type: 'url' as const,
    url,
    name,
    // The atlas itself stands in as the thumbnail. The character drawer only
    // renders names, so this is only a fallback for pickers that show an image.
    previewImage: url,
    importedAt: minecraftSkinPresetsEpoch + index,
  }))

export interface DisplayModelFile {
  id: string
  format: DisplayModelFormat
  type: 'file'
  file: File
  name: string
  previewImage?: string
  importedAt: number
}

export interface DisplayModelURL {
  id: string
  format: DisplayModelFormat
  type: 'url'
  url: string
  name: string
  previewImage?: string
  importedAt: number
}

const displayModelsPresets: DisplayModel[] = [
  { id: 'preset-live2d-1', format: DisplayModelFormat.Live2dZip, type: 'url', url: presetLive2dProUrl, name: 'Hiyori (Pro)', previewImage: presetLive2dPreview, importedAt: 1733113886840 },
  { id: 'preset-live2d-2', format: DisplayModelFormat.Live2dZip, type: 'url', url: presetLive2dFreeUrl, name: 'Hiyori (Free)', previewImage: presetLive2dPreview, importedAt: 1733113886840 },
  { id: 'preset-live2d-mita', format: DisplayModelFormat.Live2dDirectory, type: 'url', url: presetLive2dMitaUrl, name: '米塔', previewImage: presetLive2dMitaPreview, importedAt: 1733113886841 },
  { id: 'preset-live2d-xiaomita', format: DisplayModelFormat.Live2dDirectory, type: 'url', url: presetLive2dXiaoMitaUrl, name: '小米塔', previewImage: presetLive2dXiaoMitaPreview, importedAt: 1733113886842 },
  { id: 'preset-live2d-xiaomita-pro', format: DisplayModelFormat.Live2dDirectory, type: 'url', url: presetLive2dXiaoMitaProUrl, name: '小米塔(pro)', previewImage: presetLive2dXiaoMitaProPreview, importedAt: 1733113886843 },
  { id: 'preset-vrm-1', format: DisplayModelFormat.VRM, type: 'url', url: presetVrmAvatarAUrl, name: 'AvatarSample_A', previewImage: presetVrmAvatarAPreview, importedAt: 1733113886840 },
  { id: 'preset-vrm-2', format: DisplayModelFormat.VRM, type: 'url', url: presetVrmAvatarBUrl, name: 'AvatarSample_B', previewImage: presetVrmAvatarBPreview, importedAt: 1733113886840 },
  ...minecraftSkinPresets,
]

export const useDisplayModelsStore = defineStore('display-models', () => {
  const displayModels = ref<DisplayModel[]>([])

  const displayModelsFromIndexedDBLoading = ref(false)

  async function loadDisplayModelsFromIndexedDB() {
    await until(displayModelsFromIndexedDBLoading).toBe(false)

    displayModelsFromIndexedDBLoading.value = true
    const models = [...displayModelsPresets]

    try {
      await localforage.iterate<{ format: DisplayModelFormat, file: File, importedAt: number, previewImage?: string }, void>((val, key) => {
        if (key.startsWith('display-model-')) {
          models.push({ id: key, format: val.format, type: 'file', file: val.file, name: val.file.name, importedAt: val.importedAt, previewImage: val.previewImage })
        }
      })
    }
    catch (err) {
      console.error(err)
    }

    displayModels.value = models.sort((a, b) => b.importedAt - a.importedAt)
    displayModelsFromIndexedDBLoading.value = false
  }

  async function getDisplayModel(id: string) {
    await until(displayModelsFromIndexedDBLoading).toBe(false)
    const modelFromFile = await localforage.getItem<DisplayModelFile>(id)
    if (modelFromFile) {
      return modelFromFile
    }

    // Fallback to in-memory presets if not found in localforage
    return displayModelsPresets.find(model => model.id === id)
  }

  const loadLive2DModelPreview = (file: File) => generateLive2DPreview(file)

  async function loadVrmModelPreview(file: File) {
    return generateVrmPreview(file)
  }

  async function addDisplayModel(format: DisplayModelFormat, file: File) {
    await until(displayModelsFromIndexedDBLoading).toBe(false)
    const newDisplayModel: DisplayModelFile = { id: `display-model-${nanoid()}`, format, type: 'file', file, name: file.name, importedAt: Date.now() }

    if (format === DisplayModelFormat.Live2dZip) {
      const previewImage = await loadLive2DModelPreview(file)
      newDisplayModel.previewImage = previewImage
    }
    else if (format === DisplayModelFormat.VRM) {
      const previewImage = await loadVrmModelPreview(file)
      newDisplayModel.previewImage = previewImage
    }

    displayModels.value.unshift(newDisplayModel)

    localforage.setItem<DisplayModelFile>(newDisplayModel.id, newDisplayModel)
      .catch(err => console.error(err))
  }

  async function renameDisplayModel(id: string, name: string) {
    await until(displayModelsFromIndexedDBLoading).toBe(false)
    const displayModel = await localforage.getItem<DisplayModelFile>(id)
    if (!displayModel)
      return

    displayModel.name = name
  }

  async function removeDisplayModel(id: string) {
    await until(displayModelsFromIndexedDBLoading).toBe(false)
    await localforage.removeItem(id)
    displayModels.value = displayModels.value.filter(model => model.id !== id)
  }

  async function resetDisplayModels() {
    await loadDisplayModelsFromIndexedDB()
    const userModelIds = displayModels.value.filter(model => model.type === 'file').map(model => model.id)
    for (const id of userModelIds) {
      await removeDisplayModel(id)
    }

    displayModels.value = [...displayModelsPresets].sort((a, b) => b.importedAt - a.importedAt)
  }

  return {
    displayModels,
    displayModelsFromIndexedDBLoading,

    loadDisplayModelsFromIndexedDB,
    getDisplayModel,
    addDisplayModel,
    renameDisplayModel,
    removeDisplayModel,
    resetDisplayModels,
  }
})
