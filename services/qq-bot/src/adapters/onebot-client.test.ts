import WebSocket from 'ws'

import { describe, expect, it, vi } from 'vitest'

import { OneBotClient } from './onebot-client'

describe('oneBotClient configuration', () => {
  it('reports unchanged settings without reconnecting', () => {
    const client = new OneBotClient({
      url: 'ws://127.0.0.1:3001',
      accessToken: 'token-a',
    })

    expect(client.updateConfig({
      url: 'ws://127.0.0.1:3001',
      accessToken: 'token-a',
    })).toBe(false)
  })

  it('reports URL and access-token changes', () => {
    const client = new OneBotClient({
      url: 'ws://127.0.0.1:3001',
      accessToken: 'token-a',
    })

    expect(client.updateConfig({ url: 'ws://127.0.0.1:3002' })).toBe(true)
    expect(client.updateConfig({ accessToken: 'token-b' })).toBe(true)
  })

  it('allows the access token to be explicitly cleared', () => {
    const client = new OneBotClient({
      url: 'ws://127.0.0.1:3001',
      accessToken: 'token-a',
    })

    expect(client.updateConfig({ accessToken: '' })).toBe(true)
    expect(client.updateConfig({ accessToken: '' })).toBe(false)
  })

  it('can disconnect before the WebSocket connection is open', () => {
    const client = new OneBotClient({
      url: 'ws://127.0.0.1:1',
    })
    const socket = {
      close: vi.fn(),
      once: vi.fn(),
      readyState: WebSocket.CONNECTING,
      removeAllListeners: vi.fn(),
      terminate: vi.fn(),
    }

    Reflect.set(client, 'ws', socket)

    expect(() => client.disconnect()).not.toThrow()
    expect(socket.terminate).toHaveBeenCalledOnce()
    expect(socket.close).not.toHaveBeenCalled()
  })
})
