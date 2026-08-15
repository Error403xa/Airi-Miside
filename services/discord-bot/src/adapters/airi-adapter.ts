import type { Discord, MetadataEventSource, ModulePhase } from '@proj-airi/server-shared/types'
import type { ChatInputCommandInteraction, Interaction } from 'discord.js'

import { env } from 'node:process'

import { useLogg } from '@guiiai/logg'
import { Client as AiriClient } from '@proj-airi/server-sdk'
import { ContextUpdateStrategy } from '@proj-airi/server-shared/types'
import { AttachmentBuilder, Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import { handlePing, registerCommands, VoiceManager } from '../bots/discord/commands'

const log = useLogg('DiscordAdapter')
const DISCORD_IDENTITY: MetadataEventSource = {
  kind: 'plugin',
  plugin: { id: 'discord' },
  id: 'discord',
}

export interface DiscordAdapterConfig {
  discordToken?: string
  airiToken?: string
  airiUrl?: string
  enableMessageContentIntent?: boolean
}

// Define Discord configuration type
interface DiscordConfig {
  token?: string
  enabled?: boolean
}

type DiscordReplyContext = Discord & {
  interactionId?: string
}

interface DiscordOutputData {
  'message'?: {
    content?: unknown
  }
  'discord'?: DiscordReplyContext
  'gen-ai:chat'?: {
    input?: {
      data?: {
        discord?: DiscordReplyContext
      }
    }
  }
}

// Type guard to safely validate the configuration object
function isDiscordConfig(config: unknown): config is DiscordConfig {
  if (typeof config !== 'object' || config === null)
    return false
  const c = config as Record<string, unknown>
  return (typeof c.token === 'string' || typeof c.token === 'undefined')
    && (typeof c.enabled === 'boolean' || typeof c.enabled === 'undefined')
}

function normalizeDiscordMetadata(discord?: Discord): Discord | undefined {
  if (!discord)
    return undefined

  if (!discord.guildMember)
    return discord

  const { guildMember } = discord

  return {
    ...discord,
    guildMember: {
      id: guildMember.id ?? guildMember.displayName ?? guildMember.nickname ?? '',
      nickname: guildMember.nickname ?? guildMember.displayName ?? '',
      displayName: guildMember.displayName ?? guildMember.nickname ?? '',
    },
  }
}

export class DiscordAdapter {
  private airiClient: AiriClient
  private discordClient: Client
  private discordToken: string
  private enableMessageContentIntent: boolean
  private voiceManager: VoiceManager
  private isReconnecting = false
  private pendingInteractions = new Map<string, ChatInputCommandInteraction>()

  constructor(config: DiscordAdapterConfig) {
    this.discordToken = config.discordToken || env.DISCORD_TOKEN || ''
    this.enableMessageContentIntent = config.enableMessageContentIntent ?? env.DISCORD_ENABLE_MESSAGE_CONTENT_INTENT === 'true'

    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ]

    if (this.enableMessageContentIntent) {
      intents.push(GatewayIntentBits.MessageContent)
    }
    else {
      log.warn('Discord Message Content intent is disabled. Use /chat, DMs, or bot mentions; set DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=true only after enabling the privileged intent in the Discord Developer Portal.')
    }

    // Initialize Discord client
    this.discordClient = new Client({
      intents,
      partials: [Partials.Channel],
    })

    // Initialize AIRI client
    this.airiClient = new AiriClient({
      name: 'discord',
      identity: DISCORD_IDENTITY,
      possibleEvents: [
        'input:text',
        'input:text:voice',
        'input:voice',
        'module:configure',
        'module:status',
        'output:gen-ai:chat:message',
        'output:gen-ai:speech:audio',
      ],
      token: config.airiToken,
      url: config.airiUrl,
    })

    this.voiceManager = new VoiceManager(this.discordClient, this.airiClient)

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Handle configuration from UI
    this.airiClient.onEvent('module:configure', async (event) => {
      if (this.isReconnecting) {
        log.warn('A reconnect is already in progress, skipping this configuration event.')
        return
      }
      this.isReconnecting = true
      try {
        if (isDiscordConfig(event.data.config)) {
          const config = event.data.config as DiscordConfig
          const { token, enabled } = config
          log.log(`Received Discord configuration (enabled: ${enabled === true}, token: ${token ? 'provided' : 'missing'}).`)

          if (enabled === false) {
            if (this.discordClient.isReady) {
              log.log('Disabling Discord bot as per configuration...')
              await this.discordClient.destroy()
            }
            this.emitStatus('configured', 'Discord bot is disabled.', { state: 'disabled' })
            return
          }

          // If enabled, but no token is provided, stop the bot if it's running.
          if (!token) {
            log.warn('Discord bot enabled, but no token provided. Stopping bot.')
            if (this.discordClient.isReady) {
              await this.discordClient.destroy()
            }
            this.emitStatus('configuration-needed', 'Discord token is missing.', { state: 'waiting-for-token' })
            return
          }

          // Connect or reconnect if token changed or client is not ready.
          if (this.discordToken !== token || !this.discordClient.isReady) {
            this.discordToken = token
            if (this.discordClient.isReady) {
              log.log('Reconnecting Discord client with new token...')
              await this.discordClient.destroy()
            }
            log.log('Connecting Discord client...')
            this.emitStatus('preparing', 'Validating Discord token and starting bot.', { state: 'connecting' })
            await this.discordClient.login(this.discordToken)
            log.log('Discord client connected.')
          }
          else {
            this.emitReady()
          }
        }
        else {
          log.warn('Invalid Discord configuration received, skipping...')
        }
      }
      catch (error) {
        log.withError(error as Error).error('Failed to apply Discord configuration.')
        this.emitFailure('Failed to apply Discord configuration.', error)
      }
      finally {
        this.isReconnecting = false
      }
    })

    // Handle input from AIRI system
    this.airiClient.onEvent('input:text', async (event) => {
      log.log('Received input from AIRI system:', event.data.text)
      // Process Discord-related commands
      // For now, we'll just log the input
    })

    // Handle output from AIRI system (IA response)
    this.airiClient.onEvent('output:gen-ai:chat:message', async (event) => {
      try {
        const data = event.data as DiscordOutputData
        const content = this.extractAssistantText(data.message)
        const discordContext = data.discord ?? data['gen-ai:chat']?.input?.data?.discord

        if (content && discordContext)
          await this.sendResponseToDiscord(discordContext, content)
      }
      catch (error) {
        log.withError(error as Error).error('Failed to send response to Discord')
      }
    })

    // Handle synthesized voice from AIRI (sent as an audio attachment)
    this.airiClient.onEvent('output:gen-ai:speech:audio', async (event) => {
      try {
        const data = event.data as DiscordOutputData & { audioBase64?: string, mimeType?: string }
        const discordContext = data.discord ?? data['gen-ai:chat']?.input?.data?.discord
        if (!data.audioBase64 || !discordContext)
          return

        await this.sendVoiceToDiscord(discordContext, data.audioBase64, data.mimeType || 'audio/mpeg')
      }
      catch (error) {
        log.withError(error as Error).error('Failed to send voice to Discord')
      }
    })

    // Set up Discord event handlers
    this.discordClient.on(Events.ClientReady, async (readyClient) => {
      log.log(`Discord bot ready! User: ${readyClient.user.tag}`)
      this.emitReady()
      // Register commands dynamically using the authenticated client's ID and token
      await registerCommands(this.discordToken, readyClient.user.id)
    })

    // Handle text messages from Discord
    this.discordClient.on(Events.MessageCreate, async (message) => {
      if (message.author.bot)
        return

      const isDM = !message.guild
      const isMentioned = this.discordClient.user && message.mentions.has(this.discordClient.user)

      // Respond if the bot is mentioned OR if it's a DM
      if (isMentioned || isDM) {
        const rawContent = message.content
        if (!rawContent.trim()) {
          await message.reply('I could not read this message. Use /chat, or enable the Message Content intent in the Discord Developer Portal and set DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=true.')
          return
        }

        const content = isMentioned
          ? rawContent.replace(/<@!?\d+>/g, '').trim()
          : rawContent.trim()

        if (!content)
          return

        log.log(`Received text message from ${message.author.tag} in ${isDM ? 'DM' : message.channelId}`)

        const discordContext: DiscordReplyContext = {
          channelId: message.channelId,
          guildId: message.guildId ?? undefined,
          guildName: message.guild?.name ?? undefined,
          guildMember: {
            id: message.author.id,
            displayName: message.member?.displayName ?? message.author.username,
            nickname: message.member?.nickname ?? message.author.username,
          },
        }
        this.sendTextToAiri(content, rawContent, discordContext)
      }
    })

    this.discordClient.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand())
        return

      log.log(`Interaction received: /${interaction.commandName} from ${interaction.user.tag}`)

      switch (interaction.commandName) {
        case 'ping':
          await handlePing(interaction)
          break
        case 'chat':
          await this.handleChatCommand(interaction)
          break
        case 'summon':
          await this.voiceManager.handleJoinChannelCommand(interaction)
          break
      }
    })
  }

  async start(): Promise<void> {
    log.log('Starting Discord adapter...')

    try {
      // Log in to Discord if token is available
      if (this.discordToken) {
        this.emitStatus('preparing', 'Validating Discord token and starting bot.', { state: 'connecting' })
        await this.discordClient.login(this.discordToken)
        log.log('Discord adapter started successfully')
      }
      else {
        log.warn('Discord token not provided. Waiting for configuration from UI.')
        this.emitStatus('configuration-needed', 'Discord token is missing.', { state: 'waiting-for-token' })
      }
    }
    catch (error) {
      if (this.isDisallowedIntentsError(error)) {
        log.error('Discord rejected the requested gateway intents. If DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=true, enable "Message Content Intent" for this bot in the Discord Developer Portal, or unset that env var and use /chat.')
      }

      log.withError(error).error('Failed to start Discord adapter')
      this.emitFailure('Failed to start Discord adapter.', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    log.log('Stopping Discord adapter...')
    try {
      await this.discordClient.destroy()
      this.airiClient.close()
      log.log('Discord adapter stopped')
    }
    catch (error) {
      log.withError(error).error('Error stopping Discord adapter')
      throw error
    }
  }

  private async handleChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const content = interaction.options.getString('message', true).trim()
    if (!content) {
      await interaction.reply({ content: 'Message cannot be empty.', ephemeral: true })
      return
    }

    const guildMember = interaction.guild?.members.cache.get(interaction.user.id)
    const discordContext: DiscordReplyContext = {
      interactionId: interaction.id,
      channelId: interaction.channelId ?? undefined,
      guildId: interaction.guildId ?? undefined,
      guildName: interaction.guild?.name ?? undefined,
      guildMember: {
        id: interaction.user.id,
        displayName: guildMember?.displayName ?? interaction.user.globalName ?? interaction.user.username,
        nickname: guildMember?.nickname ?? interaction.user.username,
      },
    }

    this.pendingInteractions.set(interaction.id, interaction)
    await interaction.deferReply()
    this.sendTextToAiri(content, content, discordContext)
  }

  private sendTextToAiri(content: string, rawContent: string, discordContext: DiscordReplyContext): void {
    const normalizedDiscord = normalizeDiscordMetadata(discordContext) as DiscordReplyContext | undefined
    const displayName = normalizedDiscord?.guildMember?.displayName

    // Enrich context and segment memory (moved from frontend)
    const serverName = normalizedDiscord?.guildName
    const contextPrefix = serverName
      ? `on server '${serverName}'`
      : 'in Direct Message'

    // Calculate sessionId based on guild or DM
    let targetSessionId = 'discord'
    if (normalizedDiscord?.guildId) {
      targetSessionId = `discord-guild-${normalizedDiscord.guildId}`
    }
    else {
      targetSessionId = `discord-dm-${normalizedDiscord?.guildMember?.id || 'unknown'}`
    }

    const discordNotice = normalizedDiscord
      ? `The input is coming from Discord channel ${normalizedDiscord.channelId} (Guild: ${normalizedDiscord.guildId ?? 'unknown'}).`
      : undefined

    this.airiClient.send({
      type: 'input:text',
      data: {
        text: content,
        textRaw: rawContent,
        overrides: {
          messagePrefix: displayName
            ? `(From Discord user ${displayName} ${contextPrefix}): `
            : `(From Discord user ${contextPrefix}): `,
          sessionId: targetSessionId,
        },
        contextUpdates: discordNotice
          ? [{
              strategy: ContextUpdateStrategy.AppendSelf,
              text: discordNotice,
              content: discordNotice,
              metadata: {
                discord: normalizedDiscord,
              },
            }]
          : undefined,
        discord: normalizedDiscord,
      },
    })
  }

  private extractAssistantText(message: DiscordOutputData['message']): string {
    const content = message?.content

    if (typeof content === 'string')
      return content

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string')
            return part

          if (typeof part === 'object' && part !== null && 'text' in part) {
            const text = (part as { text?: unknown }).text
            return typeof text === 'string' ? text : ''
          }

          return ''
        })
        .join('')
    }

    return ''
  }

  private async sendResponseToDiscord(discordContext: DiscordReplyContext, content: string): Promise<void> {
    const chunks = this.splitDiscordMessage(content)
    if (chunks.length === 0)
      return

    if (discordContext.interactionId) {
      const interaction = this.pendingInteractions.get(discordContext.interactionId)
      if (interaction) {
        const [first, ...rest] = chunks
        await interaction.editReply(first)

        for (const chunk of rest)
          await interaction.followUp(chunk)

        this.pendingInteractions.delete(discordContext.interactionId)
        return
      }
    }

    if (!discordContext.channelId)
      return

    const channel = await this.discordClient.channels.fetch(discordContext.channelId)
    if (channel?.isTextBased() && 'send' in channel && typeof channel.send === 'function') {
      for (const chunk of chunks)
        await channel.send(chunk)
    }
  }

  private async sendVoiceToDiscord(discordContext: DiscordReplyContext, audioBase64: string, mimeType: string): Promise<void> {
    const buffer = Buffer.from(audioBase64, 'base64')
    if (buffer.byteLength === 0)
      return

    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'mp3'
    const attachment = new AttachmentBuilder(buffer, { name: `voice.${ext}` })

    if (!discordContext.channelId)
      return

    const channel = await this.discordClient.channels.fetch(discordContext.channelId)
    if (channel?.isTextBased() && 'send' in channel && typeof channel.send === 'function')
      await channel.send({ files: [attachment] })
  }

  private splitDiscordMessage(content: string): string[] {
    const chunks: string[] = []
    let remaining = content.trim()

    while (remaining.length > 0) {
      let chunkSize = Math.min(2000, remaining.length)
      if (remaining.length > 2000) {
        // Try to split at the last newline before 2000
        const lastNewline = remaining.lastIndexOf('\n', 2000)
        if (lastNewline > -1) {
          chunkSize = lastNewline
        }
        else {
          // Fallback to last space
          const lastSpace = remaining.lastIndexOf(' ', 2000)
          if (lastSpace > -1)
            chunkSize = lastSpace
        }
      }

      const chunk = remaining.slice(0, chunkSize).trim()
      if (chunk)
        chunks.push(chunk)
      remaining = remaining.slice(chunkSize).trim()
    }

    return chunks
  }

  private isDisallowedIntentsError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('Used disallowed intents')
  }

  private emitStatus(phase: ModulePhase, reason?: string, details?: Record<string, unknown>): void {
    this.airiClient.send({
      type: 'module:status',
      data: {
        identity: DISCORD_IDENTITY,
        phase,
        reason,
        details,
      },
    })
  }

  private emitReady(): void {
    this.emitStatus('ready', 'Discord bot is connected and listening.', {
      state: 'listening',
      username: this.discordClient.user?.tag,
    })
  }

  private emitFailure(reason: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.emitStatus('failed', reason, {
      state: 'error',
      error: message,
    })
  }
}
