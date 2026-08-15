import type { Buffer } from 'node:buffer'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'

import process, { env, platform } from 'node:process'

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect as connectSocket, createServer as createNetServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

interface ProcessLike {
  pid?: number
  killed?: boolean
  kill: (signal?: NodeJS.Signals) => boolean
  once: (event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void) => void
}

export interface AutoGLMServiceStatus {
  running: boolean
  baseUrl: string
  host: string
  port: number
  pid?: number
  projectDir?: string
  lastError?: string
}

export interface AutoGLMServiceHostOptions {
  projectDir?: string
  candidates?: string[]
  cwd?: string
  host?: string
  startupTimeoutMs?: number
  log?: (message: string) => void
  warn?: (message: string) => void
}

interface AutoGLMProxyOptions {
  prefix: string
  getTarget: () => Promise<string>
}

type MiddlewareNext = (error?: unknown) => void
type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse, next?: MiddlewareNext) => void

interface MiddlewareStack {
  use: (route: string, handler: MiddlewareHandler) => void
}

interface HttpServerLike {
  on: (event: 'upgrade' | 'close', listener: (...args: any[]) => void) => unknown
  once?: (event: 'close', listener: (...args: any[]) => void) => unknown
}

const AUTOGLM_PROJECT_RELATIVE_PATH = join('Open-AutoGLM-main', 'Open-AutoGLM-main')
const DEFAULT_STARTUP_TIMEOUT_MS = 15000

export function findAutoGLMProjectDir(options: {
  cwd?: string
  candidates?: string[]
} = {}) {
  const candidates = new Set<string>()

  for (const candidate of options.candidates || []) {
    if (candidate)
      candidates.add(resolve(candidate))
  }

  const cwd = resolve(options.cwd || process.cwd())
  candidates.add(resolve(cwd, AUTOGLM_PROJECT_RELATIVE_PATH))
  candidates.add(resolve(cwd, 'Open-AutoGLM-main'))

  let current = cwd
  while (true) {
    candidates.add(resolve(current, AUTOGLM_PROJECT_RELATIVE_PATH))
    candidates.add(resolve(current, 'Open-AutoGLM-main'))

    const parent = dirname(current)
    if (parent === current)
      break
    current = parent
  }

  for (const candidate of candidates) {
    try {
      if (isAutoGLMProjectDir(candidate))
        return candidate
    }
    catch {}
  }

  return undefined
}

export function createAutoGLMServiceHost(options: AutoGLMServiceHostOptions = {}) {
  const host = options.host || '127.0.0.1'
  const startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS
  let processRef: ProcessLike | undefined
  let baseUrl = ''
  let port = 0
  let projectDir = options.projectDir
  let starting: Promise<AutoGLMServiceStatus> | undefined
  let lastError = ''
  const recentOutput: string[] = []

  function status(): AutoGLMServiceStatus {
    return {
      running: !!processRef && !processRef.killed && !!baseUrl,
      baseUrl,
      host,
      port,
      pid: processRef?.pid,
      projectDir,
      lastError,
    }
  }

  async function ensureStarted() {
    if (processRef && baseUrl)
      return status()

    if (starting)
      return starting

    starting = start()
      .finally(() => {
        starting = undefined
      })

    return starting
  }

  async function start() {
    projectDir ||= findAutoGLMProjectDir({
      cwd: options.cwd,
      candidates: options.candidates,
    })

    if (!projectDir) {
      throw rememberError(new Error('Open-AutoGLM project directory was not found'))
    }

    port = await reservePort(host)
    const serviceBaseUrl = `http://${host}:${port}`
    baseUrl = serviceBaseUrl

    const commands = pythonCommands()
    let lastStartError: unknown

    for (const command of commands) {
      try {
        baseUrl = serviceBaseUrl
        await startWithCommand(command, port)
        return status()
      }
      catch (error) {
        lastStartError = error
        await stop()
      }
    }

    throw rememberError(lastStartError || new Error('Failed to start AutoGLM Python service'))
  }

  async function startWithCommand(command: string, targetPort: number) {
    const args = [
      '-m',
      'uvicorn',
      'web_server:app',
      '--host',
      host,
      '--port',
      String(targetPort),
    ]

    options.log?.(`Starting AutoGLM Python service: ${command} ${args.join(' ')}`)

    const child = spawn(command, args, {
      cwd: projectDir,
      env: {
        ...env,
        PYTHONIOENCODING: 'utf-8',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    processRef = child

    child.stdout?.on('data', chunk => captureOutput(String(chunk)))
    child.stderr?.on('data', chunk => captureOutput(String(chunk)))
    child.once('error', (error) => {
      captureOutput(error.message)
    })
    child.once('exit', (code, signal) => {
      if (processRef !== child)
        return

      processRef = undefined
      baseUrl = ''
      const reason = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`
      lastError = `AutoGLM Python service stopped with ${reason}`
      options.warn?.(lastError)
    })

    const healthUrl = `http://${host}:${targetPort}`
    await waitForHealthy(healthUrl, startupTimeoutMs)
    baseUrl = healthUrl
    lastError = ''
    options.log?.(`AutoGLM Python service started on ${baseUrl}`)
  }

  function captureOutput(text: string) {
    const trimmed = text.trim()
    if (!trimmed)
      return

    recentOutput.push(trimmed)
    recentOutput.splice(0, Math.max(0, recentOutput.length - 20))
  }

  async function stop() {
    const child = processRef
    processRef = undefined
    baseUrl = ''

    if (!child || child.killed)
      return

    child.kill('SIGTERM')
    await Promise.race([
      new Promise<void>(resolve => child.once('exit', () => resolve())),
      delay(2500).then(() => {
        if (!child.killed)
          child.kill('SIGKILL')
      }),
    ])
  }

  function rememberError(error: unknown) {
    const output = recentOutput.length ? `\n${recentOutput.slice(-5).join('\n')}` : ''
    const message = error instanceof Error ? error.message : String(error)
    lastError = `${message}${output}`
    options.warn?.(lastError)
    return error instanceof Error ? error : new Error(lastError)
  }

  return {
    ensureStarted,
    status,
    stop,
  }
}

export function attachAutoGLMProxy(
  middlewares: MiddlewareStack,
  httpServer: HttpServerLike | null | undefined,
  options: AutoGLMProxyOptions,
) {
  const prefix = normalizePrefix(options.prefix)

  middlewares.use(prefix, async (req, res, next) => {
    try {
      const target = await options.getTarget()
      proxyHttpRequest(req, res, {
        prefix,
        target,
      })
    }
    catch (error) {
      if (next) {
        next(error)
        return
      }

      res.statusCode = 502
      res.end(error instanceof Error ? error.message : String(error))
    }
  })

  httpServer?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname
    if (pathname !== `${prefix}/ws` && !pathname.startsWith(`${prefix}/ws/`))
      return

    void (async () => {
      try {
        const target = await options.getTarget()
        proxyWebSocketUpgrade(req, socket, head, {
          prefix,
          target,
        })
      }
      catch {
        socket.destroy()
      }
    })()
  })
}

export function createAutoGLMStaticServer(options: {
  distDir: string
  host: string
  port: number
  autoGLM: ReturnType<typeof createAutoGLMServiceHost>
}) {
  const { distDir, autoGLM } = options

  const server = createHttpServer(async (req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname
    if (pathname === '/api/autoglm' || pathname.startsWith('/api/autoglm/')) {
      try {
        const status = await autoGLM.ensureStarted()
        proxyHttpRequest(req, res, {
          prefix: '/api/autoglm',
          target: status.baseUrl,
        })
      }
      catch (error) {
        res.statusCode = 502
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        res.end(error instanceof Error ? error.message : String(error))
      }
      return
    }

    serveStaticFile(req, res, distDir)
  })

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname
    if (pathname !== '/api/autoglm/ws' && !pathname.startsWith('/api/autoglm/ws/')) {
      socket.destroy()
      return
    }

    void (async () => {
      try {
        const status = await autoGLM.ensureStarted()
        proxyWebSocketUpgrade(req, socket, head, {
          prefix: '/api/autoglm',
          target: status.baseUrl,
        })
      }
      catch {
        socket.destroy()
      }
    })()
  })

  return server
}

function isAutoGLMProjectDir(dir: string) {
  return existsSync(join(dir, 'web_server.py'))
}

function pythonCommands() {
  const configured = env.AIRI_AUTOGLM_PYTHON
  const defaults = platform === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python']

  return Array.from(new Set([configured, ...defaults].filter(Boolean))) as string[]
}

async function reservePort(host: string) {
  const server = createNetServer()

  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, host, resolvePromise)
  })

  const address = server.address()
  const reserved = typeof address === 'object' && address ? address.port : 0

  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolvePromise()
    })
  })

  if (!reserved)
    throw new Error('Failed to reserve an AutoGLM port')

  return reserved
}

async function waitForHealthy(baseUrlValue: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrlValue}/api/apps`)
      if (response.ok)
        return
      lastError = new Error(`AutoGLM health check returned ${response.status}`)
    }
    catch (error) {
      lastError = error
    }

    await delay(300)
  }

  throw lastError instanceof Error ? lastError : new Error('Timed out waiting for AutoGLM Python service')
}

function proxyHttpRequest(
  sourceRequest: IncomingMessage,
  sourceResponse: ServerResponse,
  options: { prefix: string, target: string },
) {
  const target = new URL(options.target)
  const path = rewriteProxyPath(sourceRequest.url || '/', options.prefix)
  const requestFn = target.protocol === 'https:' ? httpsRequest : httpRequest
  const headers = {
    ...sourceRequest.headers,
    host: target.host,
  }

  delete headers.connection

  const proxyRequest = requestFn({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port,
    method: sourceRequest.method,
    path,
    headers,
  }, (proxyResponse) => {
    sourceResponse.writeHead(proxyResponse.statusCode || 500, proxyResponse.headers)
    proxyResponse.pipe(sourceResponse)
  })

  proxyRequest.on('error', (error) => {
    if (sourceResponse.headersSent) {
      sourceResponse.destroy(error)
      return
    }

    sourceResponse.statusCode = 502
    sourceResponse.setHeader('content-type', 'text/plain; charset=utf-8')
    sourceResponse.end(error.message)
  })

  sourceRequest.pipe(proxyRequest)
}

function proxyWebSocketUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  options: { prefix: string, target: string },
) {
  const target = new URL(options.target)
  const targetPort = Number(target.port || (target.protocol === 'https:' ? 443 : 80))
  const upstream = connectSocket(targetPort, target.hostname)

  upstream.once('connect', () => {
    const path = rewriteProxyPath(req.url || '/', options.prefix)
    const headers = [...req.rawHeaders]

    for (let i = 0; i < headers.length; i += 2) {
      if (headers[i].toLowerCase() === 'host')
        headers[i + 1] = target.host
    }

    upstream.write(`${req.method || 'GET'} ${path} HTTP/${req.httpVersion}\r\n`)
    for (let i = 0; i < headers.length; i += 2)
      upstream.write(`${headers[i]}: ${headers[i + 1]}\r\n`)
    upstream.write('\r\n')

    if (head.length)
      upstream.write(head)

    socket.pipe(upstream)
    upstream.pipe(socket)
  })

  upstream.once('error', () => socket.destroy())
  socket.once('error', () => upstream.destroy())
}

function rewriteProxyPath(rawUrl: string, prefix: string) {
  const parsed = new URL(rawUrl, 'http://localhost')
  const pathname = parsed.pathname.startsWith(prefix)
    ? parsed.pathname.slice(prefix.length) || '/'
    : parsed.pathname || '/'

  return `${pathname}${parsed.search}`
}

function normalizePrefix(prefix: string) {
  const normalized = `/${prefix.trim().replace(/^\/+|\/+$/g, '')}`
  return normalized === '/' ? '' : normalized
}

function serveStaticFile(req: IncomingMessage, res: ServerResponse, distDir: string) {
  void (async () => {
    const { createReadStream, existsSync, statSync } = await import('node:fs')
    const { extname, normalize } = await import('node:path')
    const url = new URL(req.url || '/', 'http://localhost')
    const pathname = decodeURIComponent(url.pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    let filePath = normalize(join(distDir, relative))

    if (!filePath.startsWith(normalize(distDir))) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    if (!existsSync(filePath) || statSync(filePath).isDirectory())
      filePath = join(distDir, 'index.html')

    res.setHeader('content-type', contentTypeByExtension(extname(filePath)))
    createReadStream(filePath)
      .on('error', () => {
        res.statusCode = 404
        res.end('Not found')
      })
      .pipe(res)
  })()
}

function contentTypeByExtension(extension: string) {
  switch (extension) {
    case '.css':
      return 'text/css; charset=utf-8'
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.avif':
      return 'image/avif'
    case '.ico':
      return 'image/x-icon'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.wasm':
      return 'application/wasm'
    default:
      return 'application/octet-stream'
  }
}

export function autoGLMNodeModuleDir() {
  return dirname(fileURLToPath(import.meta.url))
}
