import type { InputAttachment, QQ } from '@proj-airi/server-shared/types'
import type { Message } from '@xsai/shared-chat'

import { readFile } from 'node:fs/promises'

import { useLogg } from '@guiiai/logg'
import { generateText } from '@xsai/generate-text'

import { QQMemoryStore } from './memory-store'

const log = useLogg('QQLLMWorker')

export interface QQLLMWorkerConfig {
  baseURL: string
  apiKey: string
  model: string
  systemPrompt: string
  systemPromptFile: string
  memoryFile: string
  maxHistoryMessages: number
}

function sessionIdFor(qq: QQ): string {
  const bot = qq.selfId == null ? 'default' : qq.selfId
  return qq.messageType === 'group' && qq.groupId
    ? `qq:${bot}:group:${qq.groupId}`
    : `qq:${bot}:private:${qq.userId}`
}

function attachmentToContent(attachment: InputAttachment) {
  if (attachment.type === 'image') {
    return { type: 'image_url' as const, image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } }
  }
  return {
    type: 'file' as const,
    file: {
      file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
      filename: attachment.filename,
    },
  }
}

export class QQLLMWorker {
  private readonly memory: QQMemoryStore
  private readonly queues = new Map<string, Promise<void>>()
  private systemPrompt: string

  constructor(private readonly config: QQLLMWorkerConfig) {
    this.memory = new QQMemoryStore(config.memoryFile, config.maxHistoryMessages)
    this.systemPrompt = config.systemPrompt
  }

  async start(): Promise<void> {
    if (this.config.systemPromptFile) {
      this.systemPrompt = (await readFile(this.config.systemPromptFile, 'utf8')).trim()
      log.log(`Loaded QQ character prompt from ${this.config.systemPromptFile}`)
    }
    await this.memory.load()
    log.log(`Headless QQ LLM enabled: ${this.config.model}`)
  }

  isEnabled(): boolean {
    return Boolean(this.config.baseURL && this.config.apiKey && this.config.model)
  }

  async generate(qq: QQ, text: string, attachments: InputAttachment[] = []): Promise<string> {
    const sessionId = sessionIdFor(qq)
    const previous = this.memory.getMessages(sessionId)
    const contentParts = [{ type: 'text' as const, text }, ...attachments.map(attachmentToContent)]
    const userContent: Message = contentParts.length === 1 ? { role: 'user', content: text } : { role: 'user', content: contentParts }
    const messages: Message[] = [
      ...(this.systemPrompt ? [{ role: 'system' as const, content: this.systemPrompt }] : []),
      ...previous,
      userContent,
    ]

    let result
    try {
      result = await generateText({
        baseURL: this.config.baseURL,
        apiKey: this.config.apiKey,
        model: this.config.model,
        messages,
        maxSteps: 1,
        headers: { 'Accept-Encoding': 'identity' },
      })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`LLM request failed for model ${this.config.model}: ${message}`)
      throw error
    }
    const answer = (result.text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    if (!answer)
      throw new Error('LLM returned an empty response')

    await this.memory.setMessages(sessionId, [
      ...previous,
      userContent,
      { role: 'assistant', content: answer },
    ])
    return answer
  }

  async enqueue(qq: QQ, text: string, attachments: InputAttachment[], send: (answer: string) => Promise<void>): Promise<void> {
    const sessionId = sessionIdFor(qq)
    const previous = this.queues.get(sessionId) ?? Promise.resolve()
    const current = previous
      .catch(() => undefined)
      .then(async () => send(await this.generate(qq, text, attachments)))
    const settled = current.then(() => undefined, () => undefined)
    this.queues.set(sessionId, settled)
    try {
      await current
    }
    finally {
      if (this.queues.get(sessionId) === settled)
        this.queues.delete(sessionId)
    }
  }
}

export function readQQLLMConfig(env: NodeJS.ProcessEnv): QQLLMWorkerConfig {
  const maxHistory = Number.parseInt(env.QQ_LLM_MAX_HISTORY_MESSAGES || '40', 10)
  const configuredModel = (env.QQ_LLM_MODEL || '').trim()
  // Google model IDs may be returned as `models/gemini-3.6-flash`; tolerate
  // display-name input from settings as well.
  const model = configuredModel
    .replace(/^models\//i, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
  return {
    baseURL: (env.QQ_LLM_BASE_URL || '').trim(),
    apiKey: (env.QQ_LLM_API_KEY || '').trim(),
    model,
    systemPrompt: env.QQ_LLM_SYSTEM_PROMPT || '',
    systemPromptFile: (env.QQ_LLM_SYSTEM_PROMPT_FILE || '').trim(),
    memoryFile: env.QQ_LLM_MEMORY_FILE || './data/qq-memory.json',
    maxHistoryMessages: Number.isFinite(maxHistory) && maxHistory >= 4 ? maxHistory : 40,
  }
}
