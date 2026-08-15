import type { OneBotActionResponse, OneBotEvent, OneBotMessageEvent } from './onebot-types'

import WebSocket from 'ws'
import { useLogg } from '@guiiai/logg'

const log = useLogg('OneBotClient')

export interface OneBotClientConfig {
  url: string
  accessToken?: string
}

type EventHandler = (event: OneBotMessageEvent) => void | Promise<void>

export class OneBotClient {
  private ws?: WebSocket
  private config: OneBotClientConfig
  private connected = false
  private shouldReconnect = true
  private reconnectAttempts = 0
  private reconnectTimeout?: ReturnType<typeof setTimeout>
  private messageHandlers = new Set<EventHandler>()
  private pendingActions = new Map<string, { resolve: (data: unknown) => void, reject: (err: Error) => void }>()
  private actionCounter = 0

  constructor(config: OneBotClientConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = undefined
    }

    return new Promise((resolve, reject) => {
      try {
        let url = this.config.url
        if (this.config.accessToken) {
          const separator = url.includes('?') ? '&' : '?'
          url = `${url}${separator}access_token=${this.config.accessToken}`
        }

        log.log(`Connecting to OneBot server: ${this.config.url}`)
        this.ws = new WebSocket(url)

        this.ws.on('open', () => {
          log.log('WebSocket connection established')
          this.connected = true
          this.reconnectAttempts = 0
          resolve()
        })

        this.ws.on('message', (data: WebSocket.Data) => {
          void this.handleMessage(data)
        })

        this.ws.on('close', (code, reason) => {
          log.log(`WebSocket closed: ${code} - ${reason.toString()}`)
          this.handleDisconnect()
        })

        this.ws.on('error', (error) => {
          log.withError(error).error('WebSocket error')
          if (!this.connected) {
            reject(error)
          }
        })
      }
      catch (error) {
        log.withError(error as Error).error('Failed to create WebSocket connection')
        reject(error)
      }
    })
  }

  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const parsed = JSON.parse(data.toString()) as OneBotEvent | OneBotActionResponse

      if ('retcode' in parsed) {
        const echo = (parsed as OneBotActionResponse).echo
        if (echo && this.pendingActions.has(echo)) {
          const pending = this.pendingActions.get(echo)!
          this.pendingActions.delete(echo)
          if (parsed.status === 'ok') {
            pending.resolve(parsed.data)
          }
          else {
            pending.reject(new Error(`OneBot action failed: retcode=${parsed.retcode}`))
          }
        }
        return
      }

      const event = parsed as OneBotEvent

      if (event.post_type === 'meta_event') {
        if (event.meta_event_type === 'lifecycle') {
          log.log(`Lifecycle event: ${event.sub_type}`)
        }
        return
      }

      if (event.post_type === 'message') {
        await this.dispatchMessage(event)
      }
    }
    catch (error) {
      log.withError(error as Error).error('Failed to handle message')
    }
  }

  private async dispatchMessage(event: OneBotMessageEvent): Promise<void> {
    const promises: Promise<void>[] = []
    for (const handler of this.messageHandlers) {
      promises.push(Promise.resolve(handler(event)))
    }
    await Promise.allSettled(promises)
  }

  private handleDisconnect(): void {
    this.connected = false

    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws = undefined
    }

    for (const [, pending] of this.pendingActions) {
      pending.reject(new Error('WebSocket disconnected'))
    }
    this.pendingActions.clear()

    if (this.shouldReconnect) {
      const delay = Math.min(2 ** this.reconnectAttempts * 1000, 30000)
      this.reconnectAttempts++
      log.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)
      this.reconnectTimeout = setTimeout(() => {
        void this.connect().catch((err) => {
          log.withError(err as Error).error('Reconnection failed')
        })
      }, delay)
    }
  }

  private sendAction(action: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error('Not connected to OneBot server'))
        return
      }

      const echo = `action_${++this.actionCounter}`
      this.pendingActions.set(echo, { resolve, reject })

      this.ws.send(JSON.stringify({ action, params, echo }))

      setTimeout(() => {
        if (this.pendingActions.has(echo)) {
          this.pendingActions.delete(echo)
          reject(new Error(`Action ${action} timed out`))
        }
      }, 30000)
    })
  }

  async sendPrivateMessage(userId: number, message: string): Promise<void> {
    await this.sendAction('send_private_msg', { user_id: userId, message })
  }

  async sendGroupMessage(groupId: number, message: string): Promise<void> {
    await this.sendAction('send_group_msg', { group_id: groupId, message })
  }

  /**
   * Send a voice message using the OneBot `record` segment. `audioBase64` is
   * the raw base64 (no data-URI prefix); NapCat handles transcoding to SILK.
   */
  async sendPrivateVoice(userId: number, audioBase64: string): Promise<void> {
    await this.sendAction('send_private_msg', {
      user_id: userId,
      message: [{ type: 'record', data: { file: `base64://${audioBase64}` } }],
    })
  }

  async sendGroupVoice(groupId: number, audioBase64: string): Promise<void> {
    await this.sendAction('send_group_msg', {
      group_id: groupId,
      message: [{ type: 'record', data: { file: `base64://${audioBase64}` } }],
    })
  }

  onMessage(handler: EventHandler): void {
    this.messageHandlers.add(handler)
  }

  offMessage(handler: EventHandler): void {
    this.messageHandlers.delete(handler)
  }

  disconnect(): void {
    this.shouldReconnect = false

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = undefined
    }

    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = undefined
    }

    this.connected = false
    log.log('Disconnected from OneBot server')
  }

  isConnected(): boolean {
    return this.connected
  }

  updateConfig(config: Partial<OneBotClientConfig>): void {
    if (config.url !== undefined)
      this.config.url = config.url
    if (config.accessToken !== undefined)
      this.config.accessToken = config.accessToken
  }
}
