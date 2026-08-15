import { createOpenAI } from '@xsai-ext/providers/create'
import { z } from 'zod'

import { createOpenAICompatibleValidators } from '../../validators/openai-compatible'
import { defineProvider } from '../registry'

const codexConfigSchema = z.object({
  apiKey: z
    .string('API Key'),
  baseUrl: z
    .string('Base URL')
    .optional()
    .default('https://api.openai.com/v1'),
  model: z
    .string('Model')
    .trim()
    .min(1, 'Model is required'),
})

type CodexConfig = z.input<typeof codexConfigSchema>

export const providerCodex = defineProvider<CodexConfig>({
  id: 'codex',
  order: 6,
  name: 'Codex',
  nameLocalize: ({ t }) => t('settings.pages.providers.provider.codex.title'),
  description: 'OpenAI Codex',
  descriptionLocalize: ({ t }) => t('settings.pages.providers.provider.codex.description'),
  tasks: ['chat'],
  icon: 'i-ph:terminal-window-duotone',

  createProviderConfig: ({ t }) => codexConfigSchema.extend({
    apiKey: codexConfigSchema.shape.apiKey.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.label'),
      descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.description'),
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.placeholder'),
      type: 'password',
    }),
    baseUrl: codexConfigSchema.shape.baseUrl.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.label'),
      descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.description'),
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.placeholder'),
    }),
    model: codexConfigSchema.shape.model.meta({
      labelLocalized: 'Model',
      descriptionLocalized: 'Enter the exact model ID used for Codex requests.',
      placeholderLocalized: 'gpt-5.4',
    }),
  }),
  createProvider(config) {
    return createOpenAI(config.apiKey, config.baseUrl)
  },

  validationRequiredWhen(config) {
    return !!config.apiKey?.trim() && !!config.model?.trim()
  },
  validators: {
    ...createOpenAICompatibleValidators({
      checks: ['connectivity', 'model_list', 'chat_completions'],
      resolveValidationModel: config => config.model,
    }),
  },
})
