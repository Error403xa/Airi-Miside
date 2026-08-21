import type { Message } from '@xsai/shared-chat'

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

interface StoredSession {
  messages: Message[]
  updatedAt: number
}

interface MemoryFile {
  version: 1
  sessions: Record<string, StoredSession>
}

const EMPTY_MEMORY: MemoryFile = { version: 1, sessions: {} }

/** Small, dependency-free persistent store for headless QQ conversations. */
export class QQMemoryStore {
  private data: MemoryFile = structuredClone(EMPTY_MEMORY)
  private loaded = false
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly filePath: string,
    private readonly maxMessages: number,
  ) {}

  async load(): Promise<void> {
    if (this.loaded)
      return

    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<MemoryFile>
      if (parsed && parsed.version === 1 && parsed.sessions && typeof parsed.sessions === 'object')
        this.data = { version: 1, sessions: parsed.sessions as Record<string, StoredSession> }
    }
    catch (error: any) {
      if (error?.code !== 'ENOENT')
        throw error
    }
    this.loaded = true
  }

  getMessages(sessionId: string): Message[] {
    return [...(this.data.sessions[sessionId]?.messages ?? [])]
  }

  async setMessages(sessionId: string, messages: Message[]): Promise<void> {
    const trimmed = messages.slice(-this.maxMessages)
    this.data.sessions[sessionId] = { messages: trimmed, updatedAt: Date.now() }
    await this.persist()
  }

  private async persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2)
    const temporaryPath = `${this.filePath}.tmp`
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true })
      await writeFile(temporaryPath, snapshot, 'utf8')
      await rename(temporaryPath, this.filePath)
    })
    await this.writeQueue
  }
}
