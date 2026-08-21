import { describe, expect, it } from 'vitest'

import { readQQLLMConfig } from './qq-llm-worker'

describe('readQQLLMConfig', () => {
  it('reads headless settings and applies a bounded history default', () => {
    const config = readQQLLMConfig({
      QQ_LLM_BASE_URL: ' https://example.test/v1 ',
      QQ_LLM_API_KEY: ' key ',
      QQ_LLM_MODEL: ' models/Gemini 3.6 Flash ',
      QQ_LLM_SYSTEM_PROMPT_FILE: ' character/mita.txt ',
      QQ_LLM_MAX_HISTORY_MESSAGES: '2',
    })

    expect(config.baseURL).toBe('https://example.test/v1')
    expect(config.apiKey).toBe('key')
    expect(config.model).toBe('gemini-3.6-flash')
    expect(config.systemPromptFile).toBe('character/mita.txt')
    expect(config.maxHistoryMessages).toBe(40)
  })
})
