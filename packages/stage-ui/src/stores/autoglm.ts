import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

type AutoGLMMode = 'cloud' | 'local' | 'custom'
type AutoGLMLinkMode = 'bridge' | 'webusb'
type AutoGLMLang = 'cn' | 'en'

export interface AutoGLMConfig {
  mode: AutoGLMMode
  linkMode: AutoGLMLinkMode
  baseUrl: string
  model: string
  apiKey: string
  lang: AutoGLMLang
  maxSteps: number
  wifiIp: string
  pairPort: string
  pairCode: string
  adbPort: string
}

export interface AutoGLMDecision {
  id: string
  title: string
  message: string
  input: boolean
  confirmText: string
  cancelText: string
}

export interface AutoGLMDecisionResult {
  confirmed: boolean
  value: string
}

interface AutoGLMScreen {
  base64: string
  width: number
  height: number
}

interface AutoGLMRunCallbacks {
  onAssistantText: (text: string) => void | Promise<void>
  onUserText?: (text: string) => void | Promise<void>
}

interface AutoGLMActiveRun {
  resolve: (value: string) => void
  reject: (error: unknown) => void
  callbacks: AutoGLMRunCallbacks
  fullText: string
  hadThinkingStream: boolean
}

interface AutoGLMAction {
  _metadata?: string
  action?: string
  message?: string
  app?: string
  element?: unknown
  start?: unknown
  end?: unknown
  text?: string
  duration?: string
}

interface AutoGLMWebSocketPayload {
  type?: string
  message?: string
  delta?: string
  action?: AutoGLMAction
  raw_action?: string
  thinking?: string
  step?: number
}

interface WebAdbLibs {
  Adb: new (transport: unknown) => unknown
  AdbDaemonTransport: {
    authenticate: (options: Record<string, unknown>) => Promise<unknown>
  }
  AdbDaemonWebUsbDeviceManager: {
    BROWSER?: {
      requestDevice: () => Promise<{ serial?: string, connect: () => Promise<unknown> } | undefined>
    }
  }
  AdbWebCredentialStore: new () => unknown
}

interface WebAdbSync {
  write: (options: { filename: string, file: ReadableStream<Uint8Array>, permission?: number }) => Promise<void>
  dispose?: () => Promise<void> | void
}

const STORAGE_KEY = 'airi-autoglm-state-v1'
const webAdbBundleUrl = new URL('../assets/autoglm/adb-bundle.js', import.meta.url).href
const adbKeyboardApkUrl = new URL('../assets/autoglm/ADBKeyboard.apk', import.meta.url).href
const defaultServiceUrl = '/api/autoglm'

const defaultConfig: AutoGLMConfig = {
  mode: 'cloud',
  linkMode: 'bridge',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'autoglm-phone',
  apiKey: '',
  lang: 'cn',
  maxSteps: 100,
  wifiIp: '',
  pairPort: '',
  pairCode: '',
  adbPort: '5555',
}

let websocket: WebSocket | undefined
let websocketOpening: Promise<void> | undefined
let activeRun: AutoGLMActiveRun | undefined
let decisionResolver: ((result: AutoGLMDecisionResult) => void) | undefined
let webAdb: unknown
let webAdbLibs: WebAdbLibs | undefined
let webAdbLibsLoading: Promise<WebAdbLibs> | undefined
let runtimeResolver: (() => Promise<{ baseUrl: string }>) | undefined

function loadPersistedState(): { config?: Partial<AutoGLMConfig>, enabled?: boolean } {
  if (typeof window === 'undefined')
    return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw)
      return {}
    return JSON.parse(raw)
  }
  catch {
    return {}
  }
}

function normalizeServerUrl(url: string) {
  return (url || defaultServiceUrl).trim().replace(/\/+$/, '')
}

function actionValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function getPoint(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2)
    return undefined

  const x = Number(value[0])
  const y = Number(value[1])
  if (!Number.isFinite(x) || !Number.isFinite(y))
    return undefined

  return [x, y]
}

function encodeBase64Utf8(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

export const useAutoGLMStore = defineStore('autoglm', () => {
  const persisted = loadPersistedState()
  const config = ref<AutoGLMConfig>({
    ...defaultConfig,
    ...persisted.config,
  })

  const serviceUrl = ref(defaultServiceUrl)
  const enabled = ref(false)
  const connected = ref(false)
  const deviceId = ref('')
  const keyboardReady = ref(false)
  const wsReady = ref(false)
  const running = ref(false)
  const stepCount = ref(0)
  const currentPackage = ref('')
  const screenWidth = ref(0)
  const screenHeight = ref(0)
  const deviceWidth = ref(0)
  const deviceHeight = ref(0)
  const appMap = ref<Record<string, string>>({})
  const statusMessage = ref('')
  const lastError = ref('')
  const pendingDecision = ref<AutoGLMDecision | null>(null)

  const serviceConfigured = computed(() => !!normalizeServerUrl(serviceUrl.value))
  const modelConfigured = computed(() => {
    const baseConfigured = !!config.value.baseUrl.trim() && !!config.value.model.trim()
    if (config.value.mode === 'cloud')
      return baseConfigured && !!config.value.apiKey.trim()
    return baseConfigured
  })
  const ready = computed(() => serviceConfigured.value && modelConfigured.value && connected.value)
  const shouldHandleChat = computed(() => enabled.value && ready.value)
  const connectionLabel = computed(() => connected.value ? `Device: ${deviceId.value || 'connected'}` : 'Device: not connected')

  watch([config, enabled], () => {
    if (typeof window === 'undefined')
      return

    const payload = JSON.stringify({
      config: config.value,
    })

    try {
      window.localStorage.setItem(STORAGE_KEY, payload)
    }
    catch {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, payload)
      }
      catch {}
    }
  }, { deep: true })

  watch(() => config.value.linkMode, () => {
    markDisconnected()
  })

  function setRuntimeResolver(resolver: (() => Promise<{ baseUrl: string }>) | undefined) {
    runtimeResolver = resolver
  }

  async function initializeRuntime() {
    await ensureServiceUrl()
    await loadApps()
  }

  async function ensureServiceUrl() {
    if (!runtimeResolver)
      return normalizeServerUrl(serviceUrl.value)

    const status = await runtimeResolver()
    const nextUrl = normalizeServerUrl(status.baseUrl)
    if (!nextUrl)
      throw new Error('AutoGLM runtime did not return a service URL')

    if (nextUrl !== serviceUrl.value) {
      serviceUrl.value = nextUrl
      closeWebSocket()
    }

    return nextUrl
  }

  async function apiUrl(path: string) {
    const base = await ensureServiceUrl()
    if (base.startsWith('/'))
      return `${base}${path}`
    return `${base}${path}`
  }

  async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(await apiUrl(path), init)
    if (!response.ok)
      throw new Error(`AutoGLM server returned ${response.status}`)

    const payload = await response.json() as T & { error?: string }
    if (payload?.error)
      throw new Error(payload.error)

    return payload
  }

  async function buildWsUrl() {
    const base = await ensureServiceUrl()
    const normalizedBase = base.startsWith('/')
      ? new URL(base, window.location.origin).toString()
      : base
    const url = new URL(`${normalizedBase.replace(/\/+$/, '')}/ws`)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }

  function closeWebSocket() {
    websocketOpening = undefined
    wsReady.value = false

    const socket = websocket
    if (!socket)
      return

    websocket = undefined
    if (activeRun)
      failActiveRun(new Error('AutoGLM WebSocket disconnected'))

    socket.close()
  }

  async function ensureWebSocket() {
    if (websocket?.readyState === WebSocket.OPEN) {
      wsReady.value = true
      sendConfig()
      return
    }

    if (websocketOpening)
      return websocketOpening

    websocket = new WebSocket(await buildWsUrl())
    wsReady.value = false
    websocketOpening = new Promise((resolve, reject) => {
      const socket = websocket
      if (!socket) {
        reject(new Error('AutoGLM WebSocket was not created'))
        return
      }

      socket.addEventListener('open', () => {
        if (socket !== websocket)
          return
        wsReady.value = true
        websocketOpening = undefined
        sendConfig()
        resolve()
      })

      socket.addEventListener('error', () => {
        if (socket !== websocket)
          return
        websocketOpening = undefined
        wsReady.value = false
        reject(new Error('Failed to connect AutoGLM WebSocket'))
      })

      socket.addEventListener('close', () => {
        if (socket !== websocket)
          return
        websocketOpening = undefined
        websocket = undefined
        wsReady.value = false
        if (activeRun)
          failActiveRun(new Error('AutoGLM WebSocket disconnected'))
      })

      socket.addEventListener('message', (event) => {
        void handleWebSocketMessage(event.data).catch(error => failActiveRun(error))
      })
    })

    return websocketOpening
  }

  function sendWs(payload: Record<string, unknown>) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN)
      throw new Error('AutoGLM WebSocket is not connected')
    websocket.send(JSON.stringify(payload))
  }

  function collectModelConfig() {
    return {
      base_url: config.value.baseUrl.trim(),
      model: config.value.model.trim(),
      api_key: config.value.apiKey.trim(),
      lang: config.value.lang,
      max_steps: Number(config.value.maxSteps) || 100,
    }
  }

  function sendConfig() {
    if (!websocket || websocket.readyState !== WebSocket.OPEN)
      return
    sendWs({ type: 'configure', config: collectModelConfig() })
  }

  async function applyConfiguration() {
    if (!modelConfigured.value)
      throw new Error('AutoGLM model configuration is incomplete')
    await ensureWebSocket()
    sendConfig()
    statusMessage.value = 'AutoGLM configuration applied'
  }

  function setMode(mode: AutoGLMMode) {
    config.value.mode = mode
    if (mode === 'cloud') {
      config.value.baseUrl = 'https://open.bigmodel.cn/api/paas/v4'
      config.value.model = 'autoglm-phone'
      return
    }

    if (mode === 'local') {
      config.value.baseUrl = 'http://localhost:8000/v1'
      config.value.model = 'autoglm-phone-9b'
    }
  }

  function setLinkMode(mode: AutoGLMLinkMode) {
    config.value.linkMode = mode
  }

  async function setEnabled(value: boolean) {
    if (!value) {
      enabled.value = false
      return
    }

    if (!ready.value)
      throw new Error('Connect a phone and complete AutoGLM configuration before enabling it')

    await ensureWebSocket()
    sendConfig()
    enabled.value = true
  }

  async function toggleEnabled() {
    await setEnabled(!enabled.value)
  }

  function markDisconnected(message?: string) {
    closeWebSocket()
    connected.value = false
    enabled.value = false
    deviceId.value = ''
    keyboardReady.value = false
    currentPackage.value = ''
    webAdb = undefined
    if (message)
      statusMessage.value = message
  }

  async function finalizeConnection(id: string, message: string) {
    connected.value = true
    deviceId.value = id
    statusMessage.value = message
    lastError.value = ''
    await refreshKeyboardStatus()
  }

  async function loadApps() {
    try {
      const payload = await fetchJson<{ apps?: Record<string, string> }>('/api/apps')
      appMap.value = payload.apps || {}
    }
    catch {
      appMap.value = {}
    }
  }

  async function connectBridge() {
    await loadApps()
    const payload = await fetchJson<{ devices?: Array<{ id: string, status: string } | string> }>('/api/bridge/devices')
    const devices = payload.devices || []
    if (!devices.length)
      throw new Error('No Android device was found by adb')

    const normalized = devices.map(item => typeof item === 'string' ? { id: item, status: 'device' } : item)
    const online = normalized.find(item => item.status === 'device') || normalized[0]
    if (!online || online.status !== 'device')
      throw new Error(`Android device is not ready: ${online?.status || 'unknown'}`)

    await finalizeConnection(online.id, `Connected through adb bridge: ${online.id}`)
  }

  async function loadWebAdb() {
    if (webAdbLibs)
      return webAdbLibs
    if (webAdbLibsLoading)
      return webAdbLibsLoading

    webAdbLibsLoading = import(/* @vite-ignore */ webAdbBundleUrl)
      .then((bundle) => {
        const candidate = bundle as Partial<WebAdbLibs>
        if (!candidate.Adb || !candidate.AdbDaemonTransport || !candidate.AdbDaemonWebUsbDeviceManager || !candidate.AdbWebCredentialStore)
          throw new Error('AIRI WebUSB adb bundle is missing required exports')

        webAdbLibs = candidate as WebAdbLibs
        return webAdbLibs
      })
      .catch((error) => {
        webAdbLibsLoading = undefined
        throw new Error(`Failed to load AIRI WebUSB adb bundle: ${error instanceof Error ? error.message : String(error)}`)
      })

    return webAdbLibsLoading
  }

  async function connectWebUSB() {
    await loadApps()
    if (!window.isSecureContext)
      throw new Error('WebUSB requires HTTPS or localhost')

    const usbNavigator = navigator as Navigator & { usb?: unknown }
    if (!usbNavigator.usb)
      throw new Error('This browser does not support WebUSB')

    const libs = await loadWebAdb()
    const manager = libs.AdbDaemonWebUsbDeviceManager.BROWSER
    if (!manager)
      throw new Error('WebUSB device manager is not available')

    const device = await manager.requestDevice()
    if (!device)
      throw new Error('No WebUSB device was selected')

    const connection = await device.connect()
    const credentialStore = new libs.AdbWebCredentialStore()
    const transport = await libs.AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore,
    })

    webAdb = new libs.Adb(transport)
    await finalizeConnection(device.serial || 'webusb', `Connected through WebUSB: ${device.serial || 'Android device'}`)
  }

  async function connectDevice() {
    try {
      if (config.value.linkMode === 'bridge')
        await connectBridge()
      else
        await connectWebUSB()
    }
    catch (error) {
      setError(error)
      throw error
    }
  }

  async function pairWireless() {
    const address = buildAddress(config.value.wifiIp, config.value.pairPort, '')
    const code = config.value.pairCode.trim()
    if (!address || !code)
      throw new Error('Wireless pairing requires IP address, pairing port, and pairing code')

    const payload = await fetchJson<{ output?: string }>('/api/bridge/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, code }),
    })
    statusMessage.value = payload.output || `Paired: ${address}`
  }

  async function connectWireless() {
    const address = buildAddress(config.value.wifiIp, config.value.adbPort, '5555')
    if (!address)
      throw new Error('Wireless connection requires an IP address')

    await fetchJson<{ output?: string }>('/api/bridge/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })

    const payload = await fetchJson<{ devices?: Array<{ id: string, status: string } | string> }>('/api/bridge/devices')
    const devices = (payload.devices || []).map(item => typeof item === 'string' ? { id: item, status: 'device' } : item)
    const target = devices.find(item => item.id === address || item.id.startsWith(address))
    if (!target) {
      statusMessage.value = `Wireless connect request sent: ${address}`
      return
    }

    await finalizeConnection(target.id, `Connected through wireless adb: ${target.id}`)
  }

  async function disconnectWireless() {
    const address = buildAddress(config.value.wifiIp, config.value.adbPort, '5555')
    await fetchJson<{ output?: string }>('/api/bridge/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    markDisconnected('Wireless adb disconnected')
  }

  function buildAddress(ip: string, port: string, fallbackPort: string) {
    const cleanIp = ip.trim()
    const cleanPort = port.trim() || fallbackPort
    if (!cleanIp)
      return ''
    if (cleanIp.includes(':'))
      return cleanIp
    return cleanPort ? `${cleanIp}:${cleanPort}` : cleanIp
  }

  async function refreshKeyboardStatus() {
    if (!connected.value)
      return

    try {
      const pkgList = await runShell('pm list packages com.android.adbkeyboard')
      const hasKeyboard = pkgList.includes('com.android.adbkeyboard')

      if (!hasKeyboard && config.value.linkMode === 'bridge') {
        statusMessage.value = 'Installing ADB Keyboard on the phone'
        await fetchJson<{ output?: string }>('/api/bridge/install_keyboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId.value }),
        })
      }
      else if (!hasKeyboard && config.value.linkMode === 'webusb') {
        statusMessage.value = 'Installing ADB Keyboard on the phone'
        await installKeyboardWithWebUSB()
      }

      let imeList = await runShell('ime list -s')
      if (!imeList)
        imeList = await runShell('cmd ime list -s')

      if (!imeList.includes('com.android.adbkeyboard/.AdbIME')) {
        await runShell('ime enable com.android.adbkeyboard/.AdbIME')
        await runShell('ime set com.android.adbkeyboard/.AdbIME')
        imeList = await runShell('ime list -s')
        if (!imeList)
          imeList = await runShell('cmd ime list -s')
      }

      keyboardReady.value = imeList.includes('com.android.adbkeyboard/.AdbIME')
      if (!keyboardReady.value && config.value.linkMode === 'webusb')
        statusMessage.value = 'ADB Keyboard is not enabled on the phone'
      else if (keyboardReady.value)
        statusMessage.value = 'ADB Keyboard ready'
    }
    catch (error) {
      keyboardReady.value = false
      setError(error)
    }
  }

  async function runShell(command: string) {
    if (config.value.linkMode === 'bridge') {
      const payload = await fetchJson<{ output?: string }>('/api/bridge/shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, device_id: deviceId.value }),
      })
      return (payload.output || '').trim()
    }

    if (!webAdb)
      throw new Error('WebUSB adb is not connected')

    const subprocess = (webAdb as { subprocess?: unknown }).subprocess
    const service = getSubprocessService(subprocess)
    if (!service)
      throw new Error('ADB subprocess is not available')

    const process = await service.spawn(command)
    if (process.stdin)
      process.stdin.close?.()

    if (service.type === 'shell') {
      const stdout = process.stdout ? readTextStream(process.stdout) : Promise.resolve('')
      const stderr = process.stderr ? readTextStream(process.stderr) : Promise.resolve('')
      const [out, err] = await Promise.all([stdout, stderr])
      if (process.exited)
        await process.exited
      return (out + err).trim()
    }

    const output = process.output ? await readTextStream(process.output) : ''
    if (process.exited)
      await process.exited
    return output.trim()
  }

  async function installKeyboardWithWebUSB() {
    if (!webAdb)
      throw new Error('WebUSB adb is not connected')

    const adb = webAdb as { sync?: () => Promise<WebAdbSync> }
    if (!adb.sync)
      throw new Error('WebUSB adb sync is not available')

    const response = await fetch(adbKeyboardApkUrl)
    if (!response.ok)
      throw new Error(`Failed to load bundled ADB Keyboard APK: ${response.status}`)
    if (!response.body)
      throw new Error('Bundled ADB Keyboard APK was empty')

    const targetPath = '/data/local/tmp/AIRI-ADBKeyboard.apk'
    const sync = await adb.sync()
    try {
      await sync.write({
        filename: targetPath,
        file: response.body,
        permission: 0o644,
      })
    }
    finally {
      await sync.dispose?.()
    }

    const output = await runShell(`pm install -r ${targetPath}`)
    if (!/Success/i.test(output))
      throw new Error(output || 'ADB Keyboard install failed')

    await runShell(`rm ${targetPath}`)
  }

  function getSubprocessService(subprocess: unknown) {
    const candidate = subprocess as {
      shellProtocol?: { spawn: (command: string) => Promise<WebAdbProcess> }
      noneProtocol?: { spawn: (command: string) => Promise<WebAdbProcess> }
    } | undefined

    if (candidate?.shellProtocol)
      return { type: 'shell' as const, spawn: candidate.shellProtocol.spawn.bind(candidate.shellProtocol) }
    if (candidate?.noneProtocol)
      return { type: 'none' as const, spawn: candidate.noneProtocol.spawn.bind(candidate.noneProtocol) }
    return null
  }

  async function readTextStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let text = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done)
        break
      text += decoder.decode(value, { stream: true })
    }

    return text + decoder.decode()
  }

  async function readBinaryStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { value, done } = await reader.read()
      if (done)
        break
      chunks.push(value)
    }

    return chunks
  }

  async function captureScreenshot(includePackage = false): Promise<AutoGLMScreen> {
    if (config.value.linkMode === 'bridge') {
      const payload = await fetchJson<{
        image?: string
        width?: number
        height?: number
        device_width?: number
        device_height?: number
        current_package?: string
      }>('/api/bridge/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.value,
          target_width: 640,
          format: 'jpeg',
          jpeg_quality: 70,
          include_package: includePackage,
        }),
      })

      if (typeof payload.current_package === 'string')
        currentPackage.value = payload.current_package

      screenWidth.value = payload.width || 0
      screenHeight.value = payload.height || 0
      deviceWidth.value = payload.device_width || payload.width || 0
      deviceHeight.value = payload.device_height || payload.height || 0

      return {
        base64: payload.image || '',
        width: screenWidth.value,
        height: screenHeight.value,
      }
    }

    if (!webAdb)
      throw new Error('WebUSB adb is not connected')

    const subprocess = (webAdb as { subprocess?: unknown }).subprocess
    const service = getSubprocessService(subprocess)
    if (!service)
      throw new Error('ADB subprocess is not available')

    const process = await service.spawn('screencap -p')
    if (process.stdin)
      process.stdin.close?.()

    const binaryStream = service.type === 'shell' ? process.stdout : process.output
    const chunks = binaryStream ? await readBinaryStream(binaryStream) : []
    if (process.stderr)
      await readBinaryStream(process.stderr)
    if (process.exited)
      await process.exited

    const blob = new Blob(chunks.map(toArrayBuffer), { type: 'image/png' })
    if (!blob.size)
      throw new Error('Phone screenshot was empty')

    const dimensions = await getImageDimensions(blob)
    const base64 = await blobToBase64(blob)
    screenWidth.value = dimensions.width
    screenHeight.value = dimensions.height
    deviceWidth.value = dimensions.width
    deviceHeight.value = dimensions.height

    return {
      base64,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  async function getImageDimensions(blob: Blob) {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(blob)
      return { width: bitmap.width, height: bitmap.height }
    }

    const url = URL.createObjectURL(blob)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image()
        element.onload = () => resolve(element)
        element.onerror = () => reject(new Error('Failed to read screenshot dimensions'))
        element.src = url
      })
      return { width: image.naturalWidth, height: image.naturalHeight }
    }
    finally {
      URL.revokeObjectURL(url)
    }
  }

  function blobToBase64(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to encode screenshot'))
      reader.onloadend = () => {
        const dataUrl = String(reader.result || '')
        resolve(dataUrl.split(',')[1] || '')
      }
      reader.readAsDataURL(blob)
    })
  }

  function toArrayBuffer(chunk: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(chunk.byteLength)
    copy.set(chunk)
    return copy.buffer
  }

  async function getCurrentPackage() {
    if (config.value.linkMode === 'bridge')
      return currentPackage.value || ''

    const output = await runShell('dumpsys window')
    const line = output.split('\n').find(item =>
      item.includes('mCurrentFocus') || item.includes('mFocusedApp') || item.includes('ResumedActivity'),
    )
    if (!line)
      return ''

    const match = line.match(/\s([\w.]+)\//)
    return match?.[1] || ''
  }

  async function runTask(task: string, callbacks: AutoGLMRunCallbacks) {
    if (running.value)
      throw new Error('AutoGLM is already running')
    if (!ready.value)
      throw new Error('AutoGLM is not ready')

    await ensureWebSocket()
    sendConfig()
    await loadApps()

    const promise = new Promise<string>((resolve, reject) => {
      activeRun = {
        resolve,
        reject,
        callbacks,
        fullText: '',
        hadThinkingStream: false,
      }
    })

    running.value = true
    stepCount.value = 0
    lastError.value = ''

    void (async () => {
      try {
        const screen = await captureScreenshot(true)
        const pkg = await getCurrentPackage()
        sendWs({
          type: 'start_task',
          task,
          screen: {
            image: screen.base64,
            width: screen.width,
            height: screen.height,
            current_package: pkg,
          },
        })
      }
      catch (error) {
        failActiveRun(error)
      }
    })()

    return promise
  }

  async function continueStep() {
    const screen = await captureScreenshot(true)
    const pkg = await getCurrentPackage()
    sendWs({
      type: 'step',
      screen: {
        image: screen.base64,
        width: screen.width,
        height: screen.height,
        current_package: pkg,
      },
    })
  }

  async function handleWebSocketMessage(raw: string) {
    const payload = JSON.parse(raw) as AutoGLMWebSocketPayload

    if (payload.type === 'status') {
      statusMessage.value = payload.message || ''
      return
    }

    if (payload.type === 'error') {
      failActiveRun(new Error(payload.message || 'AutoGLM server error'))
      return
    }

    if (!activeRun)
      return

    if (payload.type === 'thinking_delta') {
      activeRun.hadThinkingStream = true
      await appendRunText(activeRun, payload.delta || '')
      return
    }

    if (payload.type !== 'action')
      return

    const run = activeRun
    const action = payload.action || {}
    stepCount.value = payload.step || stepCount.value + 1

    if (payload.thinking && !run.hadThinkingStream)
      await appendRunBlock(run, payload.thinking)
    run.hadThinkingStream = false

    if (action._metadata === 'finish') {
      await appendRunBlock(run, action.message || 'Task completed')
      finishActiveRun()
      return
    }

    if (stepCount.value >= config.value.maxSteps) {
      await appendRunBlock(run, 'Max steps reached; AutoGLM paused the task.')
      finishActiveRun()
      return
    }

    await executeAction(action)
  }

  async function appendRunText(run: AutoGLMActiveRun, text: string) {
    if (!text)
      return
    run.fullText += text
    await run.callbacks.onAssistantText(text)
  }

  async function appendRunBlock(run: AutoGLMActiveRun, text: string) {
    const trimmed = text.trim()
    if (!trimmed)
      return

    const prefix = run.fullText && !run.fullText.endsWith('\n') ? '\n\n' : ''
    await appendRunText(run, `${prefix}${trimmed}`)
  }

  function finishActiveRun() {
    const run = activeRun
    if (!run)
      return
    activeRun = undefined
    running.value = false
    run.resolve(run.fullText)
  }

  function failActiveRun(error: unknown) {
    const run = activeRun
    activeRun = undefined
    running.value = false
    setError(error)
    if (run)
      run.reject(error)
  }

  async function executeAction(action: AutoGLMAction) {
    if (!action)
      return

    if (action.action === 'Interact') {
      const result = await requestDecision({
        title: 'AutoGLM needs input',
        message: action.message || 'Enter a response to continue.',
        input: true,
        confirmText: 'Continue',
        cancelText: 'Cancel',
      })

      if (!result.confirmed) {
        sendWs({ type: 'finish', message: 'User cancelled' })
        return
      }

      const text = result.value || 'Continue'
      await activeRun?.callbacks.onUserText?.(text)
      const screen = await captureScreenshot(true)
      const pkg = await getCurrentPackage()
      sendWs({
        type: 'user_message',
        text,
        screen: {
          image: screen.base64,
          width: screen.width,
          height: screen.height,
          current_package: pkg,
        },
      })
      return
    }

    if (action.action === 'Take_over') {
      const result = await requestDecision({
        title: 'Manual takeover required',
        message: action.message || 'Finish the operation on the phone, then continue.',
        input: false,
        confirmText: 'Continue',
        cancelText: 'Pause',
      })

      if (!result.confirmed) {
        sendWs({ type: 'finish', message: 'User paused for manual takeover' })
        return
      }

      await continueStep()
      return
    }

    if (action.action === 'Tap' && action.message) {
      const result = await requestDecision({
        title: 'Sensitive operation',
        message: action.message,
        input: false,
        confirmText: 'Continue',
        cancelText: 'Cancel',
      })

      if (!result.confirmed) {
        sendWs({ type: 'finish', message: 'User cancelled sensitive operation' })
        return
      }
    }

    await performDeviceAction(action)
    await continueStep()
  }

  async function performDeviceAction(action: AutoGLMAction) {
    const width = deviceWidth.value || screenWidth.value || 1080
    const height = deviceHeight.value || screenHeight.value || 1920

    switch (action.action) {
      case 'Launch': {
        const appName = actionValue(action.app)
        const pkg = appMap.value[appName] || appName
        if (!pkg)
          throw new Error('AutoGLM did not provide an app package')
        await runShell(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`)
        break
      }
      case 'Tap': {
        const [x, y] = relativeToAbsolute(action.element, width, height)
        await runShell(`input tap ${x} ${y}`)
        break
      }
      case 'Double Tap': {
        const [x, y] = relativeToAbsolute(action.element, width, height)
        await runShell(`input tap ${x} ${y}`)
        await delay(120)
        await runShell(`input tap ${x} ${y}`)
        break
      }
      case 'Long Press': {
        const [x, y] = relativeToAbsolute(action.element, width, height)
        await runShell(`input swipe ${x} ${y} ${x} ${y} 1200`)
        break
      }
      case 'Swipe': {
        const [sx, sy] = relativeToAbsolute(action.start, width, height)
        const [ex, ey] = relativeToAbsolute(action.end, width, height)
        await runShell(`input swipe ${sx} ${sy} ${ex} ${ey} 400`)
        break
      }
      case 'Type':
      case 'Type_Name':
        await typeText(action.text || '')
        break
      case 'Back':
        await runShell('input keyevent 4')
        break
      case 'Home':
        await runShell('input keyevent KEYCODE_HOME')
        break
      case 'Wait':
        await delay(parseDuration(action.duration || '1 seconds') * 1000)
        break
      case 'Note':
      case 'Call_API':
        break
      default:
        statusMessage.value = `Unsupported AutoGLM action: ${action.action || 'unknown'}`
    }
  }

  function relativeToAbsolute(value: unknown, width: number, height: number): [number, number] {
    const point = getPoint(value)
    if (!point)
      return [0, 0]
    return [
      Math.max(0, Math.round((point[0] / 1000) * width)),
      Math.max(0, Math.round((point[1] / 1000) * height)),
    ]
  }

  function parseDuration(value: string) {
    const number = Number.parseFloat(value.replace('seconds', '').trim())
    return Number.isFinite(number) ? number : 1
  }

  async function typeText(text: string) {
    const originalIme = await runShell('settings get secure default_input_method')
    if (!originalIme.includes('com.android.adbkeyboard/.AdbIME'))
      await runShell('ime set com.android.adbkeyboard/.AdbIME')

    await runShell('am broadcast -a ADB_CLEAR_TEXT')
    await runShell(`am broadcast -a ADB_INPUT_B64 --es msg ${encodeBase64Utf8(text)}`)

    if (originalIme && !originalIme.includes('com.android.adbkeyboard/.AdbIME'))
      await runShell(`ime set ${originalIme}`)
  }

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function requestDecision(options: Omit<AutoGLMDecision, 'id'>) {
    pendingDecision.value = {
      ...options,
      id: String(Date.now()),
    }

    return new Promise<AutoGLMDecisionResult>((resolve) => {
      decisionResolver = resolve
    })
  }

  function resolveDecision(result: AutoGLMDecisionResult) {
    decisionResolver?.(result)
    decisionResolver = undefined
    pendingDecision.value = null
  }

  function setError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    lastError.value = message
    statusMessage.value = message
  }

  return {
    config,
    enabled,
    connected,
    deviceId,
    keyboardReady,
    wsReady,
    running,
    stepCount,
    statusMessage,
    lastError,
    pendingDecision,

    serviceUrl,
    serviceConfigured,
    modelConfigured,
    ready,
    shouldHandleChat,
    connectionLabel,

    setRuntimeResolver,
    initializeRuntime,
    setMode,
    setLinkMode,
    setEnabled,
    toggleEnabled,
    applyConfiguration,
    connectDevice,
    pairWireless,
    connectWireless,
    disconnectWireless,
    refreshKeyboardStatus,
    runTask,
    resolveDecision,
  }
})

interface WebAdbProcess {
  stdin?: { close?: () => void }
  stdout?: ReadableStream<Uint8Array>
  stderr?: ReadableStream<Uint8Array>
  output?: ReadableStream<Uint8Array>
  exited?: Promise<unknown>
}
