import type { Message } from '@xsai/shared-chat'

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { QQMemoryStore } from './memory-store'

const tempDirectories: string[] = []

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('qQMemoryStore', () => {
  it('persists and trims recent messages', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'airi-qq-memory-'))
    tempDirectories.push(directory)
    const filePath = join(directory, 'memory.json')
    const store = new QQMemoryStore(filePath, 2)
    const messages: Message[] = [
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'two' },
      { role: 'user', content: 'three' },
    ]

    await store.load()
    await store.setMessages('qq:1:private:2', messages)

    const restored = new QQMemoryStore(filePath, 2)
    await restored.load()
    expect(restored.getMessages('qq:1:private:2')).toEqual(messages.slice(-2))
    expect(JSON.parse(await readFile(filePath, 'utf8')).version).toBe(1)
  })
})
