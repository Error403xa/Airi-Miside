import type { MetadataEventSource, ModulePhase, Telegram } from '@proj-airi/server-shared/types'
import type { Context } from 'grammy'
import type { Message } from 'grammy/types'

import os from 'node:os'
import path from 'node:path'

import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import { env } from 'node:process'

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

import { useLogg } from '@guiiai/logg'
import { Client as AiriClient } from '@proj-airi/server-sdk'
import { ContextUpdateStrategy } from '@proj-airi/server-shared/types'
import { Bot, InputFile } from 'grammy'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const log = useLogg('TelegramAdapter')
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const TELEGRAM_IDENTITY: MetadataEventSource = {
  kind: 'plugin',
  plugin: { id: 'telegram' },
  id: 'telegram',
}

interface TelegramConfig {
  token?: string
  enabled?: boolean
}

interface TelegramOutputData {
  'message'?: { content?: unknown }
  'telegram'?: Telegram
  'gen-ai:chat'?: {
    input?: {
      data?: { telegram?: Telegram }
    }
  }
}

interface TelegramAttachment {
  type: 'image' | 'file'
  data: string
  mimeType: string
  filename?: string
}

function isTelegramConfig(value: unknown): value is TelegramConfig {
  if (typeof value !== 'object' || value === null)
    return false

  const config = value as Record<string, unknown>
  return (typeof config.token === 'string' || typeof config.token === 'undefined')
    && (typeof config.enabled === 'boolean' || typeof config.enabled === 'undefined')
}

function extractAssistantText(content: unknown): string {
  if (typeof content === 'string')
    return content

  if (!Array.isArray(content))
    return ''

  return content.map((part) => {
    if (typeof part === 'string')
      return part
    if (typeof part === 'object' && part !== null && 'text' in part) {
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    }
    return ''
  }).join('')
}

function formatError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `AIRI error: ${detail.replace(/\d{6,}:[\w-]{20,}/g, '[redacted token]')}`
}

export class TelegramAdapter {
  private readonly airiClient: AiriClient
  private bot: Bot | undefined
  private token: string
  private isApplyingConfiguration = false

  constructor(options: { telegramToken?: string, airiToken?: string, airiUrl?: string }) {
    this.token = options.telegramToken || env.TELEGRAM_BOT_TOKEN || ''
    this.airiClient = new AiriClient({
      name: 'telegram',
      identity: TELEGRAM_IDENTITY,
      possibleEvents: ['input:text', 'module:configure', 'module:status', 'output:gen-ai:chat:message', 'output:gen-ai:speech:audio'],
      token: options.airiToken,
      url: options.airiUrl,
    })
    this.setupEventHandlers()
  }

  async start(): Promise<void> {
    if (!this.token) {
      log.warn('Telegram token not provided. Waiting for configuration from AIRI.')
      this.emitStatus('configuration-needed', 'Telegram token is missing.', { state: 'waiting-for-token' })
      return
    }

    try {
      await this.startBot(this.token)
    }
    catch (error) {
      this.emitFailure('Failed to start Telegram bot.', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    this.stopBot()
    this.airiClient.close()
  }

  private setupEventHandlers(): void {
    this.airiClient.onEvent('module:configure', async (event) => {
      if (this.isApplyingConfiguration)
        return

      if (!isTelegramConfig(event.data.config)) {
        log.warn('Received invalid Telegram configuration.')
        return
      }

      this.isApplyingConfiguration = true
      try {
        const { enabled, token } = event.data.config as TelegramConfig
        log.log(`Received Telegram configuration (enabled: ${enabled === true}, token: ${token ? 'provided' : 'missing'}).`)
        if (enabled === false || !token) {
          log.warn('Telegram bot is disabled or its token is missing.')
          this.stopBot()
          this.emitStatus(enabled === false ? 'configured' : 'configuration-needed', enabled === false ? 'Telegram bot is disabled.' : 'Telegram token is missing.', {
            state: enabled === false ? 'disabled' : 'waiting-for-token',
          })
          return
        }

        if (token !== this.token || !this.bot) {
          this.stopBot()
          this.token = token
          this.emitStatus('preparing', 'Validating Telegram token and starting bot.', { state: 'connecting' })
          await this.startBot(token)
        }
        else {
          this.emitReady()
        }
      }
      catch (error) {
        log.withError(error as Error).error('Failed to apply Telegram configuration.')
        this.emitFailure('Failed to apply Telegram configuration.', error)
      }
      finally {
        this.isApplyingConfiguration = false
      }
    })

    this.airiClient.onEvent('output:gen-ai:chat:message', async (event) => {
      const data = event.data as TelegramOutputData
      const context = data.telegram ?? data['gen-ai:chat']?.input?.data?.telegram
      const content = extractAssistantText(data.message?.content)

      if (!context || !content || !this.bot)
        return

      try {
        for (const chunk of this.splitMessage(content))
          await this.bot.api.sendMessage(context.chatId, chunk)
      }
      catch (error) {
        log.withError(error as Error).error('Failed to send Telegram response.')
      }
    })

    this.airiClient.onEvent('output:gen-ai:speech:audio', async (event) => {
      const data = event.data as TelegramOutputData & { audioBase64?: string, mimeType?: string }
      const context = data.telegram ?? data['gen-ai:chat']?.input?.data?.telegram

      if (!context || !data.audioBase64 || !this.bot)
        return

      const audioBuffer = Buffer.from(data.audioBase64, 'base64')
      if (audioBuffer.byteLength === 0)
        return

      try {
        // Telegram voice bubbles require OGG/Opus; the synthesized audio is mp3,
        // so transcode before sending. Falls back to sendAudio on failure.
        const oggBuffer = await this.transcodeToOggOpus(audioBuffer)
        await this.bot.api.sendVoice(context.chatId, new InputFile(oggBuffer, 'voice.ogg'))
      }
      catch (error) {
        log.withError(error as Error).error('Failed to send Telegram voice; falling back to audio file.')
        try {
          await this.bot.api.sendAudio(context.chatId, new InputFile(audioBuffer, 'voice.mp3'))
        }
        catch (fallbackError) {
          log.withError(fallbackError as Error).error('Failed to send Telegram audio fallback.')
        }
      }
    })
  }

  // Transcode mp3 audio to OGG/Opus (the format Telegram voice messages require)
  // via ffmpeg using temp files. Resolves with the OGG buffer.
  private async transcodeToOggOpus(mp3Buffer: Buffer): Promise<Buffer> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'airi-tg-voice-'))
    const inputPath = path.join(tempDir, 'in.mp3')
    const outputPath = path.join(tempDir, 'out.ogg')

    try {
      await fs.writeFile(inputPath, mp3Buffer)

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('libopus')
          .audioChannels(1)
          .format('ogg')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', err => reject(err))
          .run()
      })

      return await fs.readFile(outputPath)
    }
    finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  private async startBot(token: string): Promise<void> {
    const bot = new Bot(token)
    bot.catch(async (error) => {
      log.withError(error.error).error('Telegram update failed.')
      await error.ctx.reply(formatError(error.error)).catch(() => undefined)
    })
    bot.on('message', async ctx => this.handleMessage(ctx))

    await bot.init()
    this.bot = bot
    bot.start({ drop_pending_updates: true }).catch(error => log.withError(error).error('Telegram polling stopped unexpectedly.'))
    log.log(`Telegram bot ready: @${bot.botInfo.username}`)
    this.emitReady()
  }

  private stopBot(): void {
    this.bot?.stop()
    this.bot = undefined
  }

  private async handleMessage(ctx: Context): Promise<void> {
    const message = ctx.message
    if (!message || message.from?.is_bot)
      return

    try {
      const attachments = await this.getAttachments(message)
      const text = message.text ?? message.caption ?? (attachments.length ? 'Please describe the attached media.' : '')
      if (!text.trim()) {
        await ctx.reply('Send text, an image, or a video for AIRI to respond.')
        return
      }

      const telegram: Telegram = {
        chatId: String(message.chat.id),
        messageId: message.message_id,
        chatTitle: 'title' in message.chat ? message.chat.title : undefined,
        user: message.from
          ? {
              id: String(message.from.id),
              displayName: [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || message.from.username || String(message.from.id),
              username: message.from.username,
            }
          : undefined,
      }
      const sender = telegram.user?.displayName ?? 'unknown user'
      const notice = `The input is coming from Telegram chat ${telegram.chatId}.`

      await ctx.replyWithChatAction('typing')
      this.airiClient.send({
        type: 'input:text',
        data: {
          text,
          textRaw: text,
          attachments,
          overrides: {
            messagePrefix: `(From Telegram user ${sender}): `,
            sessionId: `telegram-chat-${telegram.chatId}`,
          },
          contextUpdates: [{
            strategy: ContextUpdateStrategy.AppendSelf,
            text: notice,
            content: notice,
            metadata: { telegram },
          }],
          telegram,
        },
      })
    }
    catch (error) {
      log.withError(error as Error).error('Failed to process Telegram message.')
      await ctx.reply(formatError(error)).catch(() => undefined)
    }
  }

  private async getAttachments(message: Message): Promise<TelegramAttachment[]> {
    const file = message.photo?.at(-1)
      ?? message.video
      ?? ((message.document?.mime_type?.startsWith('image/') || message.document?.mime_type?.startsWith('video/')) ? message.document : undefined)
    if (!file)
      return []

    if (file.file_size && file.file_size > MAX_ATTACHMENT_BYTES)
      throw new Error('The media file exceeds Telegram attachment limit of 20 MB.')

    if (!this.bot)
      throw new Error('Telegram bot is not connected.')

    const telegramFile = await this.bot.api.getFile(file.file_id)
    if (!telegramFile.file_path)
      throw new Error('Telegram did not provide a downloadable file path.')

    const response = await fetch(`https://api.telegram.org/file/bot${this.token}/${telegramFile.file_path}`)
    if (!response.ok)
      throw new Error(`Telegram media download failed with HTTP ${response.status}.`)

    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > MAX_ATTACHMENT_BYTES)
      throw new Error('The downloaded media file exceeds the 20 MB limit.')

    const mimeType = 'mime_type' in file && file.mime_type
      ? file.mime_type
      : message.photo ? 'image/jpeg' : 'application/octet-stream'
    return [{
      type: mimeType.startsWith('image/') ? 'image' : 'file',
      data: bytes.toString('base64'),
      mimeType,
      filename: 'file_name' in file ? file.file_name : undefined,
    }]
  }

  private splitMessage(content: string): string[] {
    const chunks: string[] = []
    let remaining = content.trim()
    while (remaining) {
      const end = Math.min(4096, remaining.length)
      const splitAt = remaining.length > 4096 ? Math.max(remaining.lastIndexOf('\n', end), remaining.lastIndexOf(' ', end)) : end
      const chunk = remaining.slice(0, splitAt > 0 ? splitAt : end).trim()
      if (chunk)
        chunks.push(chunk)
      remaining = remaining.slice(splitAt > 0 ? splitAt : end).trim()
    }
    return chunks
  }

  private emitStatus(phase: ModulePhase, reason?: string, details?: Record<string, unknown>): void {
    this.airiClient.send({
      type: 'module:status',
      data: {
        identity: TELEGRAM_IDENTITY,
        phase,
        reason,
        details,
      },
    })
  }

  private emitReady(): void {
    this.emitStatus('ready', 'Telegram bot is connected and listening.', {
      state: 'listening',
      username: this.bot?.botInfo.username,
    })
  }

  private emitFailure(reason: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.emitStatus('failed', reason, {
      state: 'error',
      error: formatError(message),
    })
  }
}
