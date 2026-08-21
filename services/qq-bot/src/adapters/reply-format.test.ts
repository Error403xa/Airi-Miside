import { describe, expect, it } from 'vitest'

import { normalizeQQReply } from './airi-adapter'

describe('qq reply formatting', () => {
  it('removes leading and trailing blank lines while preserving body line breaks', () => {
    expect(normalizeQQReply('\n\nHello\nworld\n\n')).toBe('Hello\nworld')
  })
})
