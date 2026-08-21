import type { InputAttachment, MetadataEventSource, ModulePhase, QQ } from '@proj-airi/server-shared/types'

import type { OneBotGroupMessageEvent, OneBotMessageEvent } from './onebot-types'

import { Buffer } from 'node:buffer'
import { env } from 'node:process'

import { useLogg } from '@guiiai/logg'
import { Client as AiriClient } from '@proj-airi/server-sdk'
import { ContextUpdateStrategy } from '@proj-airi/server-shared/types'

import { QQLLMWorker, readQQLLMConfig } from '../llm/qq-llm-worker'
import { OneBotClient } from './onebot-client'

const log = useLogg('QQAdapter')
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

export function normalizeQQReply(content: string): string {
  return content.trim()
}

const QQ_IDENTITY: MetadataEventSource = {
  kind: 'plugin',
  plugin: { id: 'qq' },
  id: 'qq',
}

export interface QQAdapterConfig {
  onebotUrl?: string
  onebotAccessToken?: string
  airiToken?: string
  airiUrl?: string
}

interface QQConfig {
  wsUrl?: string
  accessToken?: string
  enabled?: boolean
}

interface QQOutputData {
  'message'?: { content?: string | Array<string | { text: string }> }
  'qq'?: QQ
  'gen-ai:chat'?: { input?: { data?: { qq?: QQ } } }
}

function isQQConfig(config: unknown): config is QQConfig {
  if (typeof config !== 'object' || config === null)
    return false
  const c = config as Record<string, unknown>
  if (c.wsUrl !== undefined && typeof c.wsUrl !== 'string')
    return false
  if (c.accessToken !== undefined && typeof c.accessToken !== 'string')
    return false
  if (c.enabled !== undefined && typeof c.enabled !== 'boolean')
    return false
  return true
}

function extractTextFromMessage(message: OneBotMessageEvent): string {
  if (typeof message.message === 'string')
    return message.message

  return message.message
    .filter(seg => seg.type === 'text')
    .map(seg => seg.data.text as string)
    .join('')
}

function extractImageUrls(message: OneBotMessageEvent): string[] {
  if (typeof message.message === 'string')
    return []

  return message.message
    .filter(seg => seg.type === 'image' && typeof seg.data.url === 'string')
    .map(seg => seg.data.url as string)
}

async function downloadAsAttachment(url: string): Promise<InputAttachment | undefined> {
  try {
    const response = await fetch(url)
    if (!response.ok)
      return undefined

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      log.warn(`Image exceeds ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB limit, skipping`)
      return undefined
    }

    const mimeType = response.headers.get('content-type') || 'image/png'
    return {
      type: 'image',
      data: buffer.toString('base64'),
      mimeType,
    }
  }
  catch (error) {
    log.withError(error as Error).warn('Failed to download image attachment')
    return undefined
  }
}

export class QQAdapter {
  private airiClient?: AiriClient
  private connections = new Map<number | undefined, OneBotClient>()
  private selfIdToIndex = new Map<number, number | undefined>()
  private reconnectingIndices = new Set<number | undefined>()
  private defaultUrl: string
  private defaultAccessToken?: string
  private readonly headlessWorker: QQLLMWorker

  constructor(config: QQAdapterConfig) {
    this.defaultUrl = config.onebotUrl || env.ONEBOT_WS_URL || ''
    this.defaultAccessToken = config.onebotAccessToken || env.ONEBOT_ACCESS_TOKEN || undefined
    this.headlessWorker = new QQLLMWorker(readQQLLMConfig(env))

    if (!this.headlessWorker.isEnabled()) {
      this.airiClient = new AiriClient({
        name: 'qq',
        identity: QQ_IDENTITY,
        possibleEvents: [
          'input:text',
          'module:configure',
          'module:status',
          'output:gen-ai:chat:message',
          'output:gen-ai:speech:audio',
        ],
        token: config.airiToken,
        url: config.airiUrl,
      })

      this.setupEventHandlers()
    }
  }

  private setupEventHandlers(): void {
    const airiClient = this.airiClient
    if (!airiClient)
      return

    airiClient.onEvent('module:configure', async (event) => {
      const index = (event.data as { index?: number }).index as number | undefined

      if (this.reconnectingIndices.has(index))
        return

      try {
        this.reconnectingIndices.add(index)

        if (!isQQConfig(event.data.config)) {
          log.warn(`Received invalid QQ configuration for index ${index}`)
          return
        }

        const config = event.data.config as QQConfig
        await this.handleConfigureForIndex(index, config)
      }
      catch (error) {
        this.emitFailure(`Failed to configure QQ module (index: ${index})`, error, index)
      }
      finally {
        this.reconnectingIndices.delete(index)
      }
    })

    airiClient.onEvent('output:gen-ai:chat:message', async (event) => {
      const data = event.data as QQOutputData
      const content = this.extractAssistantText(data.message)
      const qqContext = data.qq ?? data['gen-ai:chat']?.input?.data?.qq

      if (content && qqContext)
        await this.sendResponseToQQ(qqContext, content)
    })

    airiClient.onEvent('output:gen-ai:speech:audio', async (event) => {
      const data = event.data as QQOutputData & { audioBase64?: string, mimeType?: string }
      const qqContext = data.qq ?? data['gen-ai:chat']?.input?.data?.qq

      if (data.audioBase64 && qqContext)
        await this.sendVoiceToQQ(qqContext, data.audioBase64)
    })
  }

  private async handleConfigureForIndex(index: number | undefined, config: QQConfig): Promise<void> {
    if (config.enabled === false) {
      this.destroyConnection(index)
      this.emitStatus('configured', 'QQ module disabled', { state: 'disabled' }, index)
      return
    }

    const wsUrl = config.wsUrl ?? (index === undefined ? this.defaultUrl : '')
    const accessToken = config.accessToken ?? (index === undefined ? this.defaultAccessToken : undefined)

    if (!wsUrl) {
      this.destroyConnection(index)
      this.emitStatus('configuration-needed', 'NapCat WebSocket URL is required', { state: 'waiting-for-config' }, index)
      return
    }

    const existing = this.connections.get(index)
    const configChanged = existing?.updateConfig({ url: wsUrl, accessToken }) ?? false
    const needsReconnect = !existing || !existing.isConnected() || configChanged

    if (existing && !needsReconnect) {
      this.emitReady(index)
      return
    }

    if (needsReconnect) {
      this.destroyConnection(index)

      const client = new OneBotClient({ url: wsUrl, accessToken })
      this.connections.set(index, client)

      client.onMessage(async (event) => {
        if (event.post_type !== 'message')
          return

        if (index !== undefined)
          this.selfIdToIndex.set(event.self_id, index)

        const imageUrls = extractImageUrls(event)
        const attachments = (await Promise.all(imageUrls.map(downloadAsAttachment))).filter((a): a is InputAttachment => a != null)

        const text = extractTextFromMessage(event)
        if (!text.trim() && attachments.length === 0)
          return

        const qqContext: QQ = {
          messageType: event.message_type,
          userId: event.user_id,
          nickname: event.sender.nickname,
          card: event.sender.card,
          selfId: event.self_id,
        }

        if (event.message_type === 'group')
          qqContext.groupId = (event as OneBotGroupMessageEvent).group_id

        const inputText = text || 'Please describe the attached image.'
        if (this.headlessWorker.isEnabled()) {
          try {
            await this.headlessWorker.enqueue(qqContext, inputText, attachments, answer => this.sendResponseToQQ(qqContext, answer))
          }
          catch (error) {
            log.withError(error as Error).error('Headless QQ LLM generation failed')
            await this.sendResponseToQQ(qqContext, '回复生成失败，请稍后再试。')
          }
        }
        else {
          this.sendTextToAiri(inputText, event.raw_message, qqContext, attachments)
        }
      })

      this.emitStatus('preparing', 'Connecting to NapCat...', { state: 'connecting' }, index)
      await client.connect()
      this.emitReady(index)
    }
  }

  private destroyConnection(index: number | undefined): void {
    const client = this.connections.get(index)
    if (!client)
      return

    client.disconnect()
    this.connections.delete(index)

    for (const [selfId, idx] of this.selfIdToIndex) {
      if (idx === index)
        this.selfIdToIndex.delete(selfId)
    }
  }

  private findClientForQQContext(qqContext: QQ): OneBotClient | undefined {
    if (qqContext.selfId !== undefined) {
      const index = this.selfIdToIndex.get(qqContext.selfId)
      if (index !== undefined) {
        const client = this.connections.get(index)
        if (client?.isConnected())
          return client
      }
    }

    if (this.connections.size === 1)
      return this.connections.values().next().value

    const defaultClient = this.connections.get(undefined)
    if (defaultClient?.isConnected())
      return defaultClient

    return undefined
  }

  private sendTextToAiri(content: string, rawContent: string, qqContext: QQ, attachments?: InputAttachment[]): void {
    if (!this.airiClient) {
      log.warn('AIRI event client is unavailable in headless mode')
      return
    }

    const displayName = qqContext.card || qqContext.nickname
    let contextPrefix: string
    let targetSessionId: string

    if (qqContext.messageType === 'group' && qqContext.groupId) {
      contextPrefix = `in QQ group ${qqContext.groupId}`
      targetSessionId = `qq-group-${qqContext.groupId}`
    }
    else {
      contextPrefix = 'in QQ private chat'
      targetSessionId = `qq-private-${qqContext.userId}`
    }

    const qqNotice = qqContext.messageType === 'group'
      ? `The input is coming from QQ group ${qqContext.groupId} (User: ${qqContext.userId}).`
      : `The input is coming from QQ private chat with user ${qqContext.userId}.`

    this.airiClient.send({
      type: 'input:text',
      data: {
        text: content,
        textRaw: rawContent,
        attachments: attachments?.length ? attachments : undefined,
        overrides: {
          messagePrefix: `(From QQ user ${displayName} ${contextPrefix}): `,
          sessionId: targetSessionId,
        },
        contextUpdates: [{
          strategy: ContextUpdateStrategy.AppendSelf,
          text: qqNotice,
          content: qqNotice,
          metadata: { qq: qqContext },
        }],
        qq: qqContext,
      },
    })
  }

  private extractAssistantText(message?: { content?: string | Array<string | { text: string }> }): string {
    if (!message?.content)
      return ''

    if (typeof message.content === 'string')
      return message.content

    if (Array.isArray(message.content)) {
      return message.content
        .map(part => typeof part === 'string' ? part : part.text || '')
        .join('')
    }

    return ''
  }

  private async sendResponseToQQ(qqContext: QQ, content: string): Promise<void> {
    const client = this.findClientForQQContext(qqContext)
    if (!client) {
      log.warn('No connected OneBotClient found for QQ context, dropping response')
      return
    }

    try {
      const normalizedContent = normalizeQQReply(content)
      if (!normalizedContent)
        return

      const chunks = this.splitMessage(normalizedContent)

      for (const chunk of chunks) {
        if (qqContext.messageType === 'group' && qqContext.groupId) {
          await client.sendGroupMessage(qqContext.groupId, chunk)
        }
        else {
          await client.sendPrivateMessage(qqContext.userId, chunk)
        }
      }
    }
    catch (error) {
      log.withError(error as Error).error('Failed to send response to QQ')
    }
  }

  private async sendVoiceToQQ(qqContext: QQ, audioBase64: string): Promise<void> {
    const client = this.findClientForQQContext(qqContext)
    if (!client) {
      log.warn('No connected OneBotClient found for QQ context, dropping voice')
      return
    }

    if (!audioBase64)
      return

    // audioBase64 is already a base64 string from the protocol event;
    // NapCat/go-cqhttp transcodes to SILK on its side.

    try {
      if (qqContext.messageType === 'group' && qqContext.groupId)
        await client.sendGroupVoice(qqContext.groupId, audioBase64)
      else
        await client.sendPrivateVoice(qqContext.userId, audioBase64)
    }
    catch (error) {
      log.withError(error as Error).error('Failed to send voice to QQ')
    }
  }

  private splitMessage(content: string, maxLength = 4500): string[] {
    if (content.length <= maxLength)
      return [content]

    const chunks: string[] = []
    let remaining = content

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining)
        break
      }

      let splitIndex = remaining.lastIndexOf('\n', maxLength)
      if (splitIndex === -1 || splitIndex < maxLength * 0.5)
        splitIndex = remaining.lastIndexOf(' ', maxLength)
      if (splitIndex === -1 || splitIndex < maxLength * 0.5)
        splitIndex = maxLength

      chunks.push(remaining.slice(0, splitIndex))
      remaining = remaining.slice(splitIndex).trimStart()
    }

    return chunks
  }

  async start(): Promise<void> {
    log.log('Starting QQ adapter (hub mode)...')
    if (this.headlessWorker.isEnabled())
      await this.headlessWorker.start()

    if (this.defaultUrl) {
      try {
        await this.handleConfigureForIndex(undefined, {
          wsUrl: this.defaultUrl,
          accessToken: this.defaultAccessToken,
          enabled: true,
        })
      }
      catch (error) {
        log.withError(error as Error).error('Failed to connect default NapCat instance')
        this.emitFailure('Failed to connect to NapCat', error)
      }
    }
    else {
      log.log('No default OneBot WebSocket URL configured. Waiting for configuration from AIRI...')
      this.emitStatus('configuration-needed', 'NapCat WebSocket URL is required', { state: 'waiting-for-config' })
    }
  }

  async stop(): Promise<void> {
    try {
      for (const [index] of this.connections)
        this.destroyConnection(index)
      this.selfIdToIndex.clear()
      this.airiClient?.close()
      log.log('QQ adapter stopped')
    }
    catch (error) {
      log.withError(error as Error).error('Error stopping QQ adapter')
    }
  }

  private emitStatus(phase: ModulePhase, reason?: string, details?: Record<string, unknown>, index?: number): void {
    this.airiClient?.send({
      type: 'module:status',
      data: { identity: QQ_IDENTITY, phase, reason, details, index },
    })
  }

  private emitReady(index?: number): void {
    this.emitStatus('ready', 'QQ module is connected and listening via NapCat.', {
      state: 'listening',
    }, index)
  }

  private emitFailure(reason: string, error: unknown, index?: number): void {
    this.emitStatus('failed', reason, {
      state: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, index)
  }
}
