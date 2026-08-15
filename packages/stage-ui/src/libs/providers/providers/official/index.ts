import { createOpenAI } from '@xsai-ext/providers/create'
import { z } from 'zod'

import { createOpenAICompatibleValidators } from '../../validators/openai-compatible'
import { defineProvider } from '../registry'

// AIRI 官方免费网关（OpenAI 兼容）。
// 端点固定为 api.airi.build 的 openai 兼容面，鉴权用 airi.moeru.ai 登录后的
// bearer token。createOpenAI(apiKey, baseURL) 会自动发送
// `Authorization: Bearer <apiKey>`，正好匹配网关要求，所以把 token 放进 apiKey。
const OFFICIAL_BASE_URL = 'https://api.airi.build/api/v1/openai'

// 网关的 OpenAI 兼容面没有 /models 列表端点（只有 /chat/completions），
// 所以模型列表由这里硬编码提供，避免 UI 拉取模型时报错。
// `auto` 让服务端自动选路；其余为已确认可用的具体模型。
const OFFICIAL_MODELS = [
  { id: 'auto', name: 'Auto (官方自动选路)', provider: 'airi-official' },
  { id: 'openai/gpt-5.4-mini', name: 'GPT-5.4 mini', provider: 'airi-official' },
]

const officialConfigSchema = z.object({
  apiKey: z
    .string('Token'),
  baseUrl: z
    .string('Base URL')
    .optional()
    .default(OFFICIAL_BASE_URL),
})

type OfficialConfig = z.input<typeof officialConfigSchema>

export const providerAiriOfficial = defineProvider<OfficialConfig>({
  id: 'airi-official',
  order: -1,
  name: 'AIRI 官方（免费）',
  nameLocalize: () => 'AIRI 官方（免费）',
  description: 'AIRI 官方免费 API 网关。粘贴 airi.moeru.ai 登录后的 token 即可使用。',
  descriptionLocalize: () => 'AIRI 官方免费 API 网关。粘贴 airi.moeru.ai 登录后的 token 即可使用。',
  tasks: ['chat'],
  icon: 'i-solar:star-bold-duotone',

  createProviderConfig: ({ t }) => officialConfigSchema.extend({
    apiKey: officialConfigSchema.shape.apiKey.meta({
      labelLocalized: 'Token',
      descriptionLocalized: '在已登录的 airi.moeru.ai 页面控制台执行 localStorage.getItem("auth/v1/token") 复制粘贴。约 1 小时过期，过期后重新粘贴。',
      placeholderLocalized: 'eyJhbGci...',
      type: 'password',
    }),
    baseUrl: officialConfigSchema.shape.baseUrl.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.label'),
      descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.description'),
      placeholderLocalized: OFFICIAL_BASE_URL,
    }),
  }),
  createProvider(config) {
    return createOpenAI(config.apiKey.trim(), (config.baseUrl || OFFICIAL_BASE_URL).trim())
  },

  extraMethods: {
    // 网关无 /models 端点，直接返回固定列表。
    listModels: async () => OFFICIAL_MODELS,
  },

  validationRequiredWhen(config) {
    return !!config.apiKey?.trim()
  },
  validators: {
    // 只做聊天连通性校验；不做 model_list（网关无此端点）。
    ...createOpenAICompatibleValidators<OfficialConfig>({
      checks: ['chat_completions'],
      resolveValidationModel: () => 'auto',
    }),
  },
})
