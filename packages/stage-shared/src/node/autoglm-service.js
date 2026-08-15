import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect as connectSocket, createServer as createNetServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { platform } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const AUTOGLM_PROJECT_RELATIVE_PATH = join('Open-AutoGLM-main', 'Open-AutoGLM-main')
const DEFAULT_STARTUP_TIMEOUT_MS = 15000

export function findAutoGLMProjectDir(options = {}) {
  const candidates = new Set()

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

export function createAutoGLMServiceHost(options = {}) {
  const host = options.host || '127.0.0.1'
  const startupTimeoutMs = options.startupTimeoutMs !== undefined ? options.startupTimeoutMs : DEFAULT_STARTUP_TIMEOUT_MS
  let processRef
  let baseUrl = ''
  let port = 0
  let projectDir = options.projectDir
  let starting
  let lastError = ''
  const recentOutput = []

  function status() {
    return {
      running: !!processRef && !processRef.killed && !!baseUrl,
      baseUrl,
      host,
      port,
      pid: processRef && processRef.pid,
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
    if (!projectDir) {
      projectDir = findAutoGLMProjectDir({
        cwd: options.cwd,
        candidates: options.candidates,
      })
    }

    if (!projectDir) {
      throw rememberError(new Error('Open-AutoGLM project directory was not found'))
    }

    port = await reservePort(host)
    const serviceBaseUrl = `http://${host}:${port}`
    baseUrl = serviceBaseUrl

    const commands = []
    // Prefer a project-local virtualenv if present
    try {
      if (projectDir) {
        const venvPath = platform === 'win32'
          ? join(projectDir, '.venv', 'Scripts', 'python.exe')
          : join(projectDir, '.venv', 'bin', 'python')
        if (existsSync(venvPath))
          commands.push(venvPath)
      }
    }
    catch {}

    for (const c of pythonCommands())
      commands.push(c)
    let lastStartError

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

  async function startWithCommand(command, targetPort) {
    const args = [
      '-m',
      'uvicorn',
      'web_server:app',
      '--host',
      host,
      '--port',
      String(targetPort),
    ]

    if (options.log)
      options.log(`Starting AutoGLM Python service: ${command} ${args.join(' ')}`)

    const child = spawn(command, args, {
      cwd: projectDir,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    processRef = child

    if (child.stdout)
      child.stdout.on('data', chunk => captureOutput(String(chunk)))
    if (child.stderr)
      child.stderr.on('data', chunk => captureOutput(String(chunk)))
    child.once('error', (error) => {
      captureOutput(error.message)
    })
    child.once('exit', (code, signal) => {
      if (processRef !== child)
        return

      processRef = undefined
      baseUrl = ''
      const reason = signal ? `signal ${signal}` : `exit code ${code !== undefined && code !== null ? code : 'unknown'}`
      lastError = `AutoGLM Python service stopped with ${reason}`
      if (options.warn)
        options.warn(lastError)
    })

    const healthUrl = `http://${host}:${targetPort}`
    if (options.log)
      options.log(`Waiting for healthy at ${String(healthUrl)}`)
    await waitForHealthy(healthUrl, startupTimeoutMs)
    lastError = ''
    if (options.log)
      options.log(`AutoGLM Python service started on ${baseUrl}`)
  }

  function captureOutput(text) {
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
      new Promise(resolve => child.once('exit', () => resolve())),
      delay(2500).then(() => {
        if (!child.killed)
          child.kill('SIGKILL')
      }),
    ])
  }

  function rememberError(error) {
    const output = recentOutput.length ? `\n${recentOutput.slice(-5).join('\n')}` : ''
    const message = error instanceof Error ? error.message : String(error)
    lastError = `${message}${output}`
    if (options.warn)
      options.warn(lastError)
    return error instanceof Error ? error : new Error(lastError)
  }

  return {
    ensureStarted,
    status,
    stop,
  }
}

export function attachAutoGLMProxy(middlewares, httpServer, options) {
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

  if (httpServer) {
    httpServer.on('upgrade', (req, socket, head) => {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname
      if (pathname !== `${prefix}/ws` && !pathname.startsWith(`${prefix}/ws/`))
        return

      (async () => {
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
}

export function createAutoGLMStaticServer(options) {
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

    ;(async () => {
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

function isAutoGLMProjectDir(dir) {
  return existsSync(join(dir, 'web_server.py'))
}

function pythonCommands() {
  const configured = process.env.AIRI_AUTOGLM_PYTHON
  const defaults = platform === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python']

  const resolved = []

  // On Windows the 'py' launcher can be an App Execution Alias which may not
  // be available to child processes in some contexts. Try to resolve a real
  // executable path via `where py` and prefer that if found.
  if (platform === 'win32') {
    try {
      const whereRes = spawnSync('where', ['py'], { encoding: 'utf8' })
      if (whereRes && whereRes.status === 0 && whereRes.stdout) {
        const first = whereRes.stdout.split(/\r?\n/)[0].trim()
        if (first)
          resolved.push(first)
      }
    }
    catch {}
  }

  const candidates = Array.from(new Set([configured, ...resolved, ...defaults].filter(Boolean)))

  // Only return candidates that appear to be runnable (check `-V`). This
  // avoids trying App Execution Aliases or aliases that spawn but immediately
  // error in non-interactive child processes.
  const runnable = []
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['-V'], { encoding: 'utf8' })
      if (res && res.status === 0 && (res.stdout || res.stderr)) {
        runnable.push(cmd)
        continue
      }
    }
    catch {}
  }

  return runnable.length ? runnable : candidates
}

async function reservePort(host) {
  const server = createNetServer()

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, host, resolvePromise)
  })

  const address = server.address()
  const reserved = typeof address === 'object' && address ? address.port : 0

  await new Promise((resolvePromise, reject) => {
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

async function waitForHealthy(baseUrlValue, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError

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

function proxyHttpRequest(sourceRequest, sourceResponse, options) {
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

function proxyWebSocketUpgrade(req, socket, head, options) {
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

function rewriteProxyPath(rawUrl, prefix) {
  const parsed = new URL(rawUrl, 'http://localhost')
  const pathname = parsed.pathname.startsWith(prefix)
    ? parsed.pathname.slice(prefix.length) || '/'
    : parsed.pathname || '/'

  return `${pathname}${parsed.search}`
}

function normalizePrefix(prefix) {
  const normalized = `/${prefix.trim().replace(/^\/+|\/+$/g, '')}`
  return normalized === '/' ? '' : normalized
}

export function autoGLMNodeModuleDir() {
  return dirname(fileURLToPath(import.meta.url))
}
