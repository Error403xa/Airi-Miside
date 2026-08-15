import type { ChildProcessWithoutNullStreams } from 'node:child_process'

import process from 'node:process'

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { useLogg } from '@guiiai/logg'
import { app } from 'electron'

import { onAppBeforeQuit } from '../../libs/bootkit/lifecycle'

const log = useLogg('main/messaging-bots').useGlobalConfig()
const botPackages = ['@proj-airi/discord-bot', '@proj-airi/telegram-bot'] as const

export interface MessagingBotsService {
  stop: () => Promise<void>
}

function getWorkspaceRoot(): string | undefined {
  const workspaceRoot = resolve(app.getAppPath(), '..', '..')
  return existsSync(resolve(workspaceRoot, 'pnpm-workspace.yaml')) ? workspaceRoot : undefined
}

function startBot(workspaceRoot: string, packageName: typeof botPackages[number]): ChildProcessWithoutNullStreams {
  const args = ['-F', packageName, 'start']
  const child = process.platform === 'win32'
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], {
        cwd: workspaceRoot,
        stdio: 'pipe',
        windowsHide: true,
      })
    : spawn('pnpm', args, {
        cwd: workspaceRoot,
        stdio: 'pipe',
      })
  const name = packageName.replace('@proj-airi/', '')
  child.stdout.on('data', data => log.log(`[${name}] ${String(data).trimEnd()}`))
  child.stderr.on('data', data => log.warn(`[${name}] ${String(data).trimEnd()}`))
  child.on('error', error => log.withError(error).error(`Failed to start ${name}.`))
  child.on('exit', (code, signal) => log.log(`${name} exited with code ${code ?? 'unknown'} (${signal ?? 'no signal'}).`))
  return child
}

export async function setupMessagingBots(): Promise<MessagingBotsService> {
  const workspaceRoot = getWorkspaceRoot()
  if (!workspaceRoot) {
    log.warn('Messaging bots are not bundled with the packaged desktop app. Start them separately when using a packaged build.')
    return { stop: async () => {} }
  }

  const children = botPackages.map(packageName => startBot(workspaceRoot, packageName))
  const stop = async () => {
    for (const child of children) {
      if (!child.killed)
        child.kill('SIGTERM')
    }
  }
  onAppBeforeQuit(stop)
  return { stop }
}
