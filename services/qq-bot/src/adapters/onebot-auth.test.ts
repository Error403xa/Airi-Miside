import { describe, expect, it } from 'vitest'

import { OneBotClient } from './onebot-client'

describe('onebot client authentication configuration', () => {
  it('keeps the configured token separate from the URL', () => {
    const client = new OneBotClient({
      url: 'ws://127.0.0.1:3001',
      accessToken: 'token-with._symbols',
    })

    expect(client.updateConfig({ accessToken: 'token-with._symbols' })).toBe(false)
    expect(client.updateConfig({ accessToken: 'new-token' })).toBe(true)
  })
})
