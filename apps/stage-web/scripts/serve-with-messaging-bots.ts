import type { ChildProcess } from 'node:child_process'

import process from 'node:process'

import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url))
const mode = process.argv[2]

if (mode !== 'dev' && mode !== 'start')
  throw new Error('Expected "dev" or "start" mode.')

const messagingCommands = [
  ['-F', '@proj-airi/discord-bot', 'start'],
  ['-F', '@proj-airi/telegram-bot', 'start'],
  ['-F', '@proj-airi/qq-bot', 'start'],
  mode === 'dev'
    ? ['-F', '@proj-airi/stage-web', 'exec', 'vite', '--host', '127.0.0.1', '--configLoader', 'runner']
    : ['-F', '@proj-airi/stage-web', 'exec', 'tsx', 'scripts/serve-with-autoglm.ts'],
] as const

const serverRuntimeCommand = ['-F', '@proj-airi/server-runtime', 'start'] as const
let stopping = false
let ownedServerRuntime: ChildProcess | undefined
let serverRuntimeStarting = false
const children: ChildProcess[] = []
const childArgs = new Map<ChildProcess, readonly string[]>()
const restartingChildren = new WeakSet<ChildProcess>()

async function isServerRuntimeRunning() {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port: 6121 })
    const finish = (running: boolean) => {
      socket.destroy()
      resolve(running)
    }
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.setTimeout(500, () => finish(false))
  })
}

async function waitForServerRuntime(timeoutMs = 15_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerRuntimeRunning())
      return true

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return false
}

function quoteForCmd(value: string) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value
}

function spawnPnpm(args: readonly string[]) {
  if (process.platform === 'win32') {
    const command = `pnpm ${args.map(quoteForCmd).join(' ')}`
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], { cwd: workspaceRoot, stdio: 'inherit', windowsHide: true })
  }

  return spawn('pnpm', args, { cwd: workspaceRoot, stdio: 'inherit' })
}

function commandLabel(args: readonly string[]) {
  return args.join(' ')
}

function isStageWebCommand(args: readonly string[]) {
  return args.includes('@proj-airi/stage-web')
}

function isServerRuntimeCommand(args: readonly string[]) {
  return args.includes('@proj-airi/server-runtime')
}

function isMessagingBotCommand(args: readonly string[]) {
  return args.includes('@proj-airi/discord-bot')
    || args.includes('@proj-airi/telegram-bot')
    || args.includes('@proj-airi/qq-bot')
}

function terminateChild(child: ChildProcess) {
  if (child.killed)
    return

  restartingChildren.add(child)
  if (process.platform === 'win32' && child.pid) {
    spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `taskkill /pid ${child.pid} /t /f`], { windowsHide: true })
    return
  }

  child.kill('SIGTERM')
}

function restartMessagingBots() {
  for (const child of children) {
    const args = childArgs.get(child)
    if (args && isMessagingBotCommand(args))
      terminateChild(child)
  }

  for (const args of messagingCommands) {
    if (isMessagingBotCommand(args))
      children.push(startManaged(args, { restart: true }))
  }
}

function startManaged(args: readonly string[], options?: { restart?: boolean }) {
  const child = spawnPnpm(args)
  const label = commandLabel(args)
  childArgs.set(child, args)
  if (isServerRuntimeCommand(args))
    ownedServerRuntime = child

  child.on('error', error => console.error(`[messaging launcher] Failed to start ${args.join(' ')}:`, error))
  child.on('exit', (code, signal) => {
    childArgs.delete(child)
    if (isServerRuntimeCommand(args) && ownedServerRuntime === child)
      ownedServerRuntime = undefined

    if (restartingChildren.has(child))
      return

    if (stopping)
      return

    if (isStageWebCommand(args)) {
      console.error(`[messaging launcher] Stage web process exited with code ${code ?? 'unknown'} (${signal ?? 'no signal'}).`)
      void stop().finally(() => process.exit(code ?? 1))
      return
    }

    console.warn(`[messaging launcher] ${label} exited with code ${code ?? 'unknown'} (${signal ?? 'no signal'}).`)
    if (options?.restart) {
      setTimeout(() => {
        if (!stopping)
          children.push(startManaged(args, options))
      }, 2000)
    }
  })
  return child
}

if (await isServerRuntimeRunning()) {
  console.info('[messaging launcher] Reusing the server runtime already listening on port 6121.')
}
else {
  children.push(startManaged(serverRuntimeCommand, { restart: true }))
  if (!await waitForServerRuntime())
    console.warn('[messaging launcher] Server runtime did not start listening on port 6121 within 15 seconds; bots will keep reconnecting.')
}

children.push(...messagingCommands.map((args) => {
  return startManaged(args, { restart: !isStageWebCommand(args) })
}),
)

const serverMonitor = setInterval(async () => {
  if (stopping)
    return

  if (await isServerRuntimeRunning())
    return

  if (ownedServerRuntime && !ownedServerRuntime.killed)
    return

  console.warn('[messaging launcher] Server runtime is not listening on port 6121. Starting it now.')
  if (serverRuntimeStarting)
    return

  serverRuntimeStarting = true
  children.push(startManaged(serverRuntimeCommand, { restart: true }))
  try {
    if (await waitForServerRuntime())
      restartMessagingBots()
    else
      console.warn('[messaging launcher] Server runtime still is not listening on port 6121; bots will keep reconnecting.')
  }
  finally {
    serverRuntimeStarting = false
  }
}, 3000)

async function stop() {
  stopping = true
  clearInterval(serverMonitor)
  for (const child of children) {
    terminateChild(child)
  }
}

process.once('SIGINT', () => void stop().finally(() => process.exit(0)))
process.once('SIGTERM', () => void stop().finally(() => process.exit(0)))
