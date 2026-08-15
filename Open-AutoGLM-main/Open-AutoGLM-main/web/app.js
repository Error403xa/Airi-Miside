const ui = {
  connectBtn: document.getElementById('connectBtn'),
  connectionBadge: document.getElementById('connectionBadge'),
  secureHint: document.getElementById('secureHint'),
  baseUrlInput: document.getElementById('baseUrlInput'),
  modelInput: document.getElementById('modelInput'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  apiKeyField: document.getElementById('apiKeyField'),
  maxStepsInput: document.getElementById('maxStepsInput'),
  sendBtn: document.getElementById('sendBtn'),
  taskInput: document.getElementById('taskInput'),
  messages: document.getElementById('messages'),
  deviceInfo: document.getElementById('deviceInfo'),
  modelInfo: document.getElementById('modelInfo'),
  currentPackage: document.getElementById('currentPackage'),
  currentActivity: document.getElementById('currentActivity'),
  wifiIp: document.getElementById('wifiIp'),
  pairPort: document.getElementById('pairPort'),
  pairCode: document.getElementById('pairCode'),
  adbPort: document.getElementById('adbPort'),
  pairBtn: document.getElementById('pairBtn'),
  wifiConnectBtn: document.getElementById('wifiConnectBtn'),
  wifiDisconnectBtn: document.getElementById('wifiDisconnectBtn'),
  wsStatus: document.getElementById('wsStatus'),
  stepStatus: document.getElementById('stepStatus'),
  latencyStatus: document.getElementById('latencyStatus'),
  statusLog: document.getElementById('statusLog'),
  checkUsb: document.getElementById('checkUsb'),
  checkKeyboard: document.getElementById('checkKeyboard'),
  checkModel: document.getElementById('checkModel'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalInput: document.getElementById('modalInput'),
  modalConfirm: document.getElementById('modalConfirm'),
  modalCancel: document.getElementById('modalCancel'),
  backBtn: document.getElementById('backBtn'),
  homeBtn: document.getElementById('homeBtn'),
  tasksBtn: document.getElementById('tasksBtn'),
}

const state = {
  adb: null,
  device: null,
  transport: null,
  connected: false,
  screenWidth: 0,
  screenHeight: 0,
  deviceWidth: 0,
  deviceHeight: 0,
  appMap: {},
  ws: null,
  wsReady: false,
  stepCount: 0,
  running: false,
  currentThinkingEl: null,
  hadThinkingStream: false,
  libs: null,
  libsLoading: null,
  bridge: true,
  deviceId: '',
  currentPackage: '',
  captureWidth: 640,
  captureFormat: 'jpeg',
  captureQuality: 70,
  activityTimer: null,
  maxSteps: 100,
  config: {
    mode: 'cloud',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'autoglm-phone',
    apiKey: '',
    lang: 'cn',
  },
}

const STORAGE_KEY = 'autoglm_web_state_v1'
let saveTimer = null

function scheduleSave() {
  if (saveTimer)
    window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveState, 200)
}

function saveState() {
  const payload = {
    config: {
      mode: state.config.mode,
      baseUrl: ui.baseUrlInput.value.trim(),
      model: ui.modelInput.value.trim(),
      apiKey: ui.apiKeyInput.value,
      maxSteps: Number(ui.maxStepsInput.value) || 100,
    },
    messages: getMessageSnapshot(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
  catch (error) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    }
    catch (innerError) {
      // Ignore storage errors (quota / privacy mode)
    }
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (!raw)
      return
    const payload = JSON.parse(raw)
    const config = payload?.config || {}
    if (config.mode) {
      state.config.mode = config.mode
      document.querySelectorAll('input[name=\'mode\']').forEach((radio) => {
        radio.checked = radio.value === config.mode
      })
    }
    updateModeUI()
    if (config.baseUrl)
      ui.baseUrlInput.value = config.baseUrl
    if (config.model)
      ui.modelInput.value = config.model
    if (typeof config.apiKey === 'string')
      ui.apiKeyInput.value = config.apiKey
    if (config.maxSteps)
      ui.maxStepsInput.value = String(config.maxSteps)
    if (Array.isArray(payload?.messages)) {
      restoreMessages(payload.messages)
    }
  }
  catch (error) {
    // Ignore invalid storage
  }
}

function getMessageSnapshot() {
  return Array.from(ui.messages.querySelectorAll('.message')).map((el) => {
    const classes = Array.from(el.classList).filter(cls => cls !== 'message')
    const role = classes.includes('user') ? 'user' : 'assistant'
    return {
      role,
      text: el.textContent || '',
      classes,
    }
  })
}

function restoreMessages(list) {
  ui.messages.innerHTML = ''
  list.forEach((item) => {
    const classes = Array.isArray(item.classes) ? item.classes : []
    appendMessage(item.role || 'assistant', item.text || '', classes)
  })
}

function logStatus(message) {
  const entry = document.createElement('div')
  entry.textContent = message
  ui.statusLog.prepend(entry)
}

function setBadge(text, ok) {
  ui.connectionBadge.textContent = text
  ui.connectionBadge.style.background = ok ? 'rgba(34, 211, 238, 0.2)' : 'rgba(148, 163, 184, 0.12)'
  ui.connectionBadge.style.borderColor = ok ? 'rgba(34, 211, 238, 0.4)' : 'rgba(148, 163, 184, 0.2)'
}

function setWsStatus(text, ok) {
  ui.wsStatus.textContent = text
  ui.wsStatus.style.color = ok ? '#34d399' : '#fbbf24'
}

function updateActivityUI(pkg, activity) {
  if (ui.currentPackage)
    ui.currentPackage.textContent = pkg ? `界面包名：${pkg}` : '界面包名：--'
  if (ui.currentActivity)
    ui.currentActivity.textContent = activity ? `当前界面活动：${activity}` : '当前界面活动：--'
}

function parseActivityFromDump(output) {
  if (!output)
    return { pkg: '', activity: '' }
  const patterns = [
    /mCurrentFocus.*? ([\w.]+)\/([^\s}]+)/,
    /mFocusedApp.*? ([\w.]+)\/([^\s}]+)/,
    /ResumedActivity.*? ([\w.]+)\/([^\s}]+)/,
  ]
  for (const pattern of patterns) {
    const match = output.match(pattern)
    if (match) {
      return { pkg: match[1], activity: match[2] }
    }
  }
  return { pkg: '', activity: '' }
}

async function fetchCurrentActivity() {
  if (!state.connected)
    return
  try {
    if (state.bridge) {
      const response = await fetch(`/api/bridge/activity?device_id=${encodeURIComponent(state.deviceId)}`)
      const payload = await response.json()
      updateActivityUI(payload.package || '', payload.activity || '')
      return
    }
    const output = await runShell('dumpsys window')
    const parsed = parseActivityFromDump(output)
    updateActivityUI(parsed.pkg, parsed.activity)
  }
  catch (error) {
    updateActivityUI('', '')
  }
}

function startActivityPolling() {
  if (state.activityTimer)
    window.clearInterval(state.activityTimer)
  state.activityTimer = window.setInterval(fetchCurrentActivity, 2000)
  fetchCurrentActivity()
}

function stopActivityPolling() {
  if (state.activityTimer) {
    window.clearInterval(state.activityTimer)
    state.activityTimer = null
  }
  updateActivityUI('', '')
}

async function finalizeConnection(deviceId, message) {
  state.bridge = true
  state.deviceId = deviceId
  state.connected = true
  ui.deviceInfo.textContent = `设备：${deviceId}`
  ui.checkUsb.style.color = '#34d399'
  setBadge('已连接', true)
  logStatus(message || `已连接：${deviceId}`)
  await refreshKeyboardStatus()
  startActivityPolling()
}

function markDisconnected(message) {
  state.connected = false
  state.deviceId = ''
  ui.deviceInfo.textContent = '设备：未连接'
  ui.checkUsb.style.color = '#fbbf24'
  setBadge('未连接', false)
  stopActivityPolling()
  if (message)
    logStatus(message)
}

function buildAddress(ip, port, fallbackPort) {
  const cleanIp = (ip || '').trim()
  const cleanPort = (port || '').trim()
  const portValue = cleanPort || fallbackPort || ''
  if (!cleanIp)
    return ''
  if (cleanIp.includes(':'))
    return cleanIp
  return portValue ? `${cleanIp}:${portValue}` : cleanIp
}

async function pairWireless() {
  if (!state.bridge) {
    await showModal({
      title: '无线调试不可用',
      message: '无线调试仅在本机桥接模式下可用。',
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  const address = buildAddress(ui.wifiIp.value, ui.pairPort.value, '')
  const code = (ui.pairCode.value || '').trim()
  if (!address || !code) {
    await showModal({
      title: '缺少信息',
      message: '配对需要 IP、配对端口和配对码。如设备无需配对，请直接点“连接”。',
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  const response = await fetch('/api/bridge/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, code }),
  })
  const payload = await response.json()
  if (payload.error) {
    await showModal({
      title: '配对失败',
      message: payload.error,
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  logStatus(`已配对：${address}`)
}

async function connectWireless() {
  if (!state.bridge) {
    await showModal({
      title: '无线调试不可用',
      message: '无线调试仅在本机桥接模式下可用。',
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  const address = buildAddress(ui.wifiIp.value, ui.adbPort.value, '5555')
  if (!address) {
    await showModal({
      title: '缺少信息',
      message: '请填写 IP 地址。',
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  const response = await fetch('/api/bridge/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  const payload = await response.json()
  if (payload.error) {
    await showModal({
      title: '连接失败',
      message: payload.error,
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  const devicesRes = await fetch('/api/bridge/devices')
  const devicesPayload = await devicesRes.json()
  const devices = devicesPayload.devices || []
  const target = devices.find(item => item.id === address || item.id?.startsWith(address))
  if (target) {
    await finalizeConnection(target.id, `已通过无线调试连接：${target.id}`)
  }
  else {
    logStatus(`已发送连接请求：${address}`)
  }
}

async function disconnectWireless() {
  if (!state.bridge)
    return
  const address = buildAddress(ui.wifiIp.value, ui.adbPort.value, '5555')
  const response = await fetch('/api/bridge/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  const payload = await response.json()
  if (payload.error) {
    await showModal({
      title: '断开失败',
      message: payload.error,
      confirmText: '知道了',
      cancelText: '关闭',
    })
    return
  }
  markDisconnected('已断开无线连接')
}

function appendMessage(role, text, extraClass) {
  const bubble = document.createElement('div')
  bubble.classList.add('message', role)
  if (Array.isArray(extraClass)) {
    extraClass.forEach(cls => bubble.classList.add(cls))
  }
  else if (extraClass) {
    bubble.classList.add(extraClass)
  }
  bubble.textContent = text
  ui.messages.appendChild(bubble)
  ui.messages.scrollTop = ui.messages.scrollHeight
  scheduleSave()
  return bubble
}

function updateModeUI() {
  const mode = state.config.mode
  const showApiKey = mode === 'cloud'
  ui.apiKeyField.style.display = showApiKey ? 'block' : 'none'

  if (mode === 'cloud') {
    ui.baseUrlInput.value = 'https://open.bigmodel.cn/api/paas/v4'
    ui.modelInput.value = 'autoglm-phone'
  }
  else if (mode === 'local') {
    ui.baseUrlInput.value = 'http://localhost:8000/v1'
    ui.modelInput.value = 'autoglm-phone-9b'
  }
}

function updateLinkUI() {
  const value = state.bridge ? 'bridge' : 'webusb'
  const target = document.querySelector(`input[name='link'][value='${value}']`)
  if (target)
    target.checked = true
}
function updateSecureHint() {
  if (!window.isSecureContext) {
    ui.secureHint.textContent = 'WebUSB 需要 HTTPS 或 localhost'
    ui.connectBtn.classList.add('btn-ghost')
  }
  else {
    ui.secureHint.textContent = ''
  }
}

async function loadWebAdb() {
  if (state.libs)
    return state.libs
  if (state.libsLoading)
    return state.libsLoading

  state.libsLoading = import('./vendor/adb-bundle.js')
    .then(bundle => ({
      Adb: bundle.Adb,
      AdbDaemonTransport: bundle.AdbDaemonTransport,
      AdbDaemonWebUsbDeviceManager: bundle.AdbDaemonWebUsbDeviceManager,
      AdbWebCredentialStore: bundle.AdbWebCredentialStore,
    }))
    .catch(() =>
      Promise.all([
        import('https://esm.sh/@yume-chan/adb@2.5.1'),
        import('https://esm.sh/@yume-chan/adb-daemon-webusb@2.5.1'),
        import('https://esm.sh/@yume-chan/adb-credential-web@2.5.1'),
      ]).then(([adbPkg, webUsbPkg, credPkg]) => ({
        Adb: adbPkg.Adb,
        AdbDaemonTransport: adbPkg.AdbDaemonTransport,
        AdbDaemonWebUsbDeviceManager: webUsbPkg.AdbDaemonWebUsbDeviceManager,
        AdbWebCredentialStore: credPkg.default,
      })),
    )

  return state.libsLoading
}
function buildWsUrl() {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws`
}

async function ensureWebSocket() {
  if (state.ws && state.wsReady)
    return
  state.ws = new WebSocket(buildWsUrl())
  setWsStatus('连接中...', false)

  state.ws.addEventListener('open', () => {
    state.wsReady = true
    setWsStatus('已连接', true)
    sendConfig()
  })

  state.ws.addEventListener('close', () => {
    state.wsReady = false
    setWsStatus('已断开', false)
  })

  state.ws.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data)
    handleServerMessage(payload)
  })
}

function sendWs(payload) {
  if (!state.wsReady)
    return
  state.ws.send(JSON.stringify(payload))
}

function sendConfig() {
  const config = collectConfig()
  sendWs({ type: 'configure', config })
  ui.modelInfo.textContent = `模型：${config.model}`
  ui.checkModel.style.color = config.base_url && config.model ? '#34d399' : '#fbbf24'
}

function collectConfig() {
  state.config.baseUrl = ui.baseUrlInput.value.trim()
  state.config.model = ui.modelInput.value.trim()
  state.config.apiKey = ui.apiKeyInput.value.trim()
  state.maxSteps = Number(ui.maxStepsInput.value) || 100

  return {
    base_url: state.config.baseUrl,
    model: state.config.model,
    api_key: state.config.apiKey,
    lang: state.config.lang,
    max_steps: state.maxSteps,
  }
}

async function connectBridge() {
  try {
    const response = await fetch('/api/bridge/devices')
    const payload = await response.json()
    const devices = payload.devices || []
    if (devices.length === 0) {
      await showModal({
        title: '未检测到设备',
        message:
          'adb 没有识别到手机。请确认 USB 调试已开启、授权弹窗已允许，并且数据线支持传输。',
        confirmText: '知道了',
        cancelText: '关闭',
      })
      return
    }
    const normalized = devices.map(item =>
      typeof item === 'string' ? { id: item, status: 'device' } : item,
    )
    const online = normalized.find(item => item.status === 'device') || normalized[0]
    if (online.status !== 'device') {
      await showModal({
        title: '设备未就绪',
        message: `当前设备状态为 ${online.status}。请在手机上允许 USB 调试授权，或重新插拔数据线。`,
        confirmText: '知道了',
        cancelText: '关闭',
      })
      return
    }

    await finalizeConnection(online.id, `已使用本机桥接连接：${online.id}`)
  }
  catch (error) {
    console.error(error)
    alert(`连接失败：${error?.message || error}`)
  }
}
async function connectDevice() {
  try {
    if (state.bridge) {
      await connectBridge()
      return
    }
    if (!window.isSecureContext) {
      await showModal({
        title: '无法连接 WebUSB',
        message: 'WebUSB 仅在 HTTPS 或 localhost 上可用。请使用 http://localhost:8000 打开页面。',
        confirmText: '知道了',
        cancelText: '关闭',
      })
      return
    }

    const libs = await loadWebAdb().catch(async (error) => {
      await showModal({
        title: '加载依赖失败',
        message:
          `无法加载 WebUSB 依赖库。请确认浏览器能访问 /static/vendor/adb-bundle.js，或外网可用 https://esm.sh。错误：${error?.message || error}`,
        confirmText: '知道了',
        cancelText: '关闭',
      })
      throw error
    })

    const { Adb, AdbDaemonTransport, AdbDaemonWebUsbDeviceManager, AdbWebCredentialStore } = libs

    if (!AdbDaemonWebUsbDeviceManager?.BROWSER || !navigator.usb) {
      alert('当前浏览器不支持 WebUSB，请使用最新版 Chrome 或 Edge。')
      return
    }

    const manager = AdbDaemonWebUsbDeviceManager.BROWSER
    const device = await manager.requestDevice()
    if (!device)
      return

    const connection = await device.connect()
    const credentialStore = new AdbWebCredentialStore()
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore,
    })

    state.adb = new Adb(transport)
    state.device = device
    state.transport = transport
    state.connected = true

    ui.deviceInfo.textContent = `设备：${device.serial || '已连接'}`
    ui.checkUsb.style.color = '#34d399'
    setBadge('已连接', true)
    logStatus('设备已连接。')
    await refreshKeyboardStatus()
    startActivityPolling()
  }
  catch (error) {
    console.error(error)
    const message = error?.message || String(error)
    if (message.toLowerCase().includes('already in used') || message.toLowerCase().includes('in use')) {
      await showModal({
        title: '设备被占用',
        message:
          '检测到设备已被其他程序占用。请关闭 Android Studio / Scrcpy / 其它 ADB 工具后，运行 `adb kill-server`，重新插拔数据线再试。',
        confirmText: '知道了',
        cancelText: '关闭',
      })
      return
    }
    alert(`连接失败：${message}`)
  }
}

async function refreshKeyboardStatus() {
  try {
    const pkgList = await runShell('pm list packages com.android.adbkeyboard')
    const hasKeyboard = pkgList.includes('com.android.adbkeyboard')

    if (!hasKeyboard) {
      if (state.bridge) {
        logStatus('检测到未安装 ADB Keyboard，正在自动安装...')
        const install = await fetch('/api/bridge/install_keyboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: state.deviceId }),
        })
        const payload = await install.json()
        if (payload.error) {
          await showModal({
            title: 'ADB Keyboard 安装失败',
            message: payload.error,
            confirmText: '知道了',
            cancelText: '关闭',
          })
        }
        else {
          logStatus('ADB Keyboard 已安装')
        }
      }
      else {
        await showModal({
          title: 'ADB Keyboard 未安装',
          message: 'WebUSB 模式无法自动安装，请在手机上手动安装 ADB Keyboard。',
          confirmText: '知道了',
          cancelText: '关闭',
        })
      }
    }

    let imeList = await runShell('ime list -s')
    if (!imeList) {
      imeList = await runShell('cmd ime list -s')
    }
    if (imeList.includes('com.android.adbkeyboard/.AdbIME')) {
      ui.checkKeyboard.style.color = '#34d399'
      logStatus('ADB Keyboard 已启用')
    }
    else {
      ui.checkKeyboard.style.color = '#fbbf24'
      await runShell('ime enable com.android.adbkeyboard/.AdbIME')
      await runShell('ime set com.android.adbkeyboard/.AdbIME')
      let verify = await runShell('ime list -s')
      if (!verify) {
        verify = await runShell('cmd ime list -s')
      }
      ui.checkKeyboard.style.color = verify.includes('com.android.adbkeyboard/.AdbIME')
        ? '#34d399'
        : '#fbbf24'
    }
  }
  catch (error) {
    ui.checkKeyboard.style.color = '#fbbf24'
  }
}

function getSubprocessService() {
  const subprocess = state.adb?.subprocess
  if (!subprocess)
    return null
  if (subprocess.shellProtocol) {
    return { type: 'shell', service: subprocess.shellProtocol }
  }
  if (subprocess.noneProtocol) {
    return { type: 'none', service: subprocess.noneProtocol }
  }
  return null
}

async function runShell(command) {
  if (state.bridge) {
    const response = await fetch('/api/bridge/shell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, device_id: state.deviceId }),
    })
    const payload = await response.json()
    if (payload.error)
      throw new Error(payload.error)
    return (payload.output || '').trim()
  }
  if (!state.adb)
    throw new Error('ADB 未连接')
  const service = getSubprocessService()
  if (!service)
    throw new Error('ADB subprocess 不可用')

  if (service.type === 'shell') {
    const process = await service.service.spawn(command)
    const stdout = process.stdout ? readTextStream(process.stdout) : Promise.resolve('')
    const stderr = process.stderr ? readTextStream(process.stderr) : Promise.resolve('')
    if (process.stdin) {
      process.stdin.close?.()
    }
    const [out, err] = await Promise.all([stdout, stderr])
    if (process.exited)
      await process.exited
    return (out + err).trim()
  }

  const process = await service.service.spawn(command)
  if (process.stdin) {
    process.stdin.close?.()
  }
  const output = process.output ? await readTextStream(process.output) : ''
  if (process.exited)
    await process.exited
  return output.trim()
}
async function readTextStream(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done)
      break
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  return text
}

async function readBinaryStream(stream) {
  const reader = stream.getReader()
  const chunks = []
  while (true) {
    const { value, done } = await reader.read()
    if (done)
      break
    chunks.push(value)
  }
  return chunks
}

async function captureScreenshot(includePackage = false) {
  if (state.bridge) {
    const response = await fetch('/api/bridge/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: state.deviceId,
        target_width: state.captureWidth,
        format: state.captureFormat,
        jpeg_quality: state.captureQuality,
        include_package: includePackage,
      }),
    })
    const payload = await response.json()
    if (payload.error)
      throw new Error(payload.error)
    const base64 = payload.image || ''
    const width = payload.width || 0
    const height = payload.height || 0
    const deviceWidth = payload.device_width || width || 0
    const deviceHeight = payload.device_height || height || 0
    if ('current_package' in payload) {
      state.currentPackage = payload.current_package || ''
    }

    if (base64) {
      state.screenWidth = width
      state.screenHeight = height
      state.deviceWidth = deviceWidth || width
      state.deviceHeight = deviceHeight || height
    }
    return { base64, width, height }
  }
  if (!state.adb)
    throw new Error('ADB 未连接')
  const service = getSubprocessService()
  if (!service)
    throw new Error('ADB subprocess 不可用')

  let process
  let binaryStream

  if (service.type === 'shell') {
    process = await service.service.spawn('screencap -p')
    binaryStream = process.stdout
    if (process.stdin) {
      process.stdin.close?.()
    }
  }
  else {
    process = await service.service.spawn('screencap -p')
    binaryStream = process.output
    if (process.stdin) {
      process.stdin.close?.()
    }
  }

  const chunks = binaryStream ? await readBinaryStream(binaryStream) : []
  if (process.stderr)
    await readBinaryStream(process.stderr)
  if (process.exited)
    await process.exited

  const blob = new Blob(chunks, { type: 'image/png' })
  if (blob.size === 0) {
    throw new Error('截图为空')
  }
  const bitmap = await createImageBitmap(blob)

  state.screenWidth = bitmap.width
  state.screenHeight = bitmap.height
  state.deviceWidth = bitmap.width
  state.deviceHeight = bitmap.height

  const base64 = await blobToBase64(blob)
  return { base64, width: bitmap.width, height: bitmap.height }
}
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result
      resolve(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(blob)
  })
}

async function getCurrentPackage() {
  if (state.bridge) {
    return state.currentPackage || ''
  }
  const output = await runShell('dumpsys window')
  const line = output.split('\n').find(item => item.includes('mCurrentFocus') || item.includes('mFocusedApp'))
  if (!line)
    return ''
  const match = line.match(/\s([\w.]+)\//)
  return match ? match[1] : ''
}

async function sendTask() {
  const task = ui.taskInput.value.trim()
  if (!task)
    return

  if (!state.connected) {
    alert('请先连接手机')
    return
  }

  if (!state.wsReady) {
    await ensureWebSocket()
  }

  const config = collectConfig()
  if (state.config.mode === 'cloud' && !config.api_key) {
    alert('云端模式需要 API Key')
    return
  }

  state.running = true
  state.stepCount = 0
  ui.stepStatus.textContent = '0'
  state.currentThinkingEl = null
  state.hadThinkingStream = false

  appendMessage('user', task)
  ui.taskInput.value = ''

  const screen = await captureScreenshot(true)
  const currentPackage = await getCurrentPackage()

  sendWs({
    type: 'start_task',
    task,
    screen: {
      image: screen.base64,
      width: screen.width,
      height: screen.height,
      current_package: currentPackage,
    },
  })
}

async function continueStep() {
  const screen = await captureScreenshot(true)
  const currentPackage = await getCurrentPackage()

  sendWs({
    type: 'step',
    screen: {
      image: screen.base64,
      width: screen.width,
      height: screen.height,
      current_package: currentPackage,
    },
  })
}

async function handleServerMessage(payload) {
  if (payload.type === 'thinking_delta') {
    if (!state.currentThinkingEl) {
      state.currentThinkingEl = appendMessage('assistant', '', 'thinking')
    }
    state.hadThinkingStream = true
    state.currentThinkingEl.textContent += payload.delta
    ui.messages.scrollTop = ui.messages.scrollHeight
    scheduleSave()
    return
  }

  if (payload.type === 'status') {
    logStatus(payload.message)
    return
  }

  if (payload.type === 'error') {
    appendMessage('assistant', `错误：${payload.message}`)
    state.running = false
    return
  }

  if (payload.type === 'action') {
    state.currentThinkingEl = null
    const hadStream = state.hadThinkingStream
    state.hadThinkingStream = false
    state.stepCount = payload.step || state.stepCount + 1
    ui.stepStatus.textContent = `${state.stepCount}`

    if (payload.thinking && !hadStream) {
      appendMessage('assistant', payload.thinking, 'thinking')
    }

    appendMessage('assistant', payload.raw_action || JSON.stringify(payload.action), 'action')

    if (!state.running)
      return
    if (state.stepCount >= state.maxSteps) {
      appendMessage('assistant', '已达到最大步数，任务暂停。', 'assistant')
      state.running = false
      return
    }

    await executeAction(payload.action)
  }
}

function showModal({ title, message, input = false, confirmText = '确认', cancelText = '取消' }) {
  return new Promise((resolve) => {
    ui.modalTitle.textContent = title
    ui.modalMessage.textContent = message
    ui.modalInput.style.display = input ? 'block' : 'none'
    ui.modalInput.value = ''
    ui.modalConfirm.textContent = confirmText
    ui.modalCancel.textContent = cancelText
    ui.modal.classList.remove('hidden')

    const cleanup = (result) => {
      ui.modal.classList.add('hidden')
      ui.modalConfirm.onclick = null
      ui.modalCancel.onclick = null
      resolve(result)
    }

    ui.modalConfirm.onclick = () => cleanup({ confirmed: true, value: ui.modalInput.value.trim() })
    ui.modalCancel.onclick = () => cleanup({ confirmed: false, value: '' })
  })
}

async function executeAction(action) {
  if (!action)
    return

  if (action._metadata === 'finish') {
    appendMessage('assistant', action.message || '任务完成。', 'assistant')
    state.running = false
    return
  }

  if (action.action === 'Interact') {
    const result = await showModal({
      title: '需要你的选择',
      message: 'AI 需要你的输入，请填写后继续。',
      input: true,
      confirmText: '继续',
    })
    if (!result.confirmed) {
      state.running = false
      sendWs({ type: 'finish', message: '用户取消' })
      return
    }

    appendMessage('user', result.value || '继续')
    const screen = await captureScreenshot(true)
    const currentPackage = await getCurrentPackage()
    sendWs({
      type: 'user_message',
      text: result.value || '继续',
      screen: {
        image: screen.base64,
        width: screen.width,
        height: screen.height,
        current_package: currentPackage,
      },
    })
    return
  }

  if (action.action === 'Take_over') {
    await showModal({
      title: '需要人工接管',
      message: action.message || '请在手机上完成登录或验证码操作后点击继续。',
      confirmText: '继续',
      cancelText: '暂停',
    })
    await continueStep()
    return
  }

  if (action.action === 'Tap' && action.message) {
    const confirm = await showModal({
      title: '敏感操作确认',
      message: action.message,
      confirmText: '继续',
      cancelText: '取消',
    })
    if (!confirm.confirmed) {
      state.running = false
      sendWs({ type: 'finish', message: '用户取消敏感操作' })
      return
    }
  }

  await performDeviceAction(action)
  await continueStep()
}

async function performDeviceAction(action) {
  const width = state.deviceWidth || state.screenWidth || 1080
  const height = state.deviceHeight || state.screenHeight || 1920

  switch (action.action) {
    case 'Launch': {
      const appName = action.app || ''
      const pkg = state.appMap[appName] || appName
      if (!pkg)
        throw new Error('未找到应用包名')
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
    case 'Type_Name': {
      await typeText(action.text || '')
      break
    }
    case 'Back': {
      await runShell('input keyevent 4')
      break
    }
    case 'Home': {
      await runShell('input keyevent KEYCODE_HOME')
      break
    }
    case 'Wait': {
      const duration = parseDuration(action.duration || '1 seconds')
      await delay(duration * 1000)
      break
    }
    case 'Note':
    case 'Call_API': {
      logStatus('收到总结/记录指令，继续执行...')
      break
    }
    default:
      logStatus(`未知动作：${action.action}`)
  }
}

function relativeToAbsolute(point, width, height) {
  if (!point || point.length < 2)
    return [0, 0]
  const x = Math.max(0, Math.round((point[0] / 1000) * width))
  const y = Math.max(0, Math.round((point[1] / 1000) * height))
  return [x, y]
}

function parseDuration(value) {
  if (!value)
    return 1
  const num = Number.parseFloat(value.replace('seconds', '').trim())
  return Number.isFinite(num) ? num : 1
}

async function typeText(text) {
  const originalIme = await runShell('settings get secure default_input_method')
  if (!originalIme.includes('com.android.adbkeyboard/.AdbIME')) {
    await runShell('ime set com.android.adbkeyboard/.AdbIME')
  }

  await runShell('am broadcast -a ADB_CLEAR_TEXT')
  const encoded = btoa(unescape(encodeURIComponent(text)))
  await runShell(`am broadcast -a ADB_INPUT_B64 --es msg ${encoded}`)

  if (originalIme && !originalIme.includes('com.android.adbkeyboard/.AdbIME')) {
    await runShell(`ime set ${originalIme}`)
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function loadApps() {
  try {
    const res = await fetch('/api/apps')
    const data = await res.json()
    state.appMap = data.apps || {}
  }
  catch (error) {
    console.warn('加载应用列表失败', error)
  }
}

function bindEvents() {
  ui.connectBtn.addEventListener('click', connectDevice)
  ui.sendBtn.addEventListener('click', sendTask)
  ui.backBtn.addEventListener('click', async () => {
    if (!state.connected)
      return
    await runShell('input keyevent 4')
  })
  ui.homeBtn.addEventListener('click', async () => {
    if (!state.connected)
      return
    await runShell('input keyevent KEYCODE_HOME')
  })
  ui.tasksBtn.addEventListener('click', async () => {
    if (!state.connected)
      return
    await runShell('input keyevent 187')
  })
  if (ui.pairBtn)
    ui.pairBtn.addEventListener('click', pairWireless)
  if (ui.wifiConnectBtn)
    ui.wifiConnectBtn.addEventListener('click', connectWireless)
  if (ui.wifiDisconnectBtn)
    ui.wifiDisconnectBtn.addEventListener('click', disconnectWireless)
  ui.taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendTask()
    }
  })

  document.querySelectorAll('input[name=\'mode\']').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      state.config.mode = event.target.value
      updateModeUI()
      scheduleSave()
    })
  })

  document.querySelectorAll('input[name=\'link\']').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      state.bridge = event.target.value === 'bridge'
      if (state.bridge) {
        logStatus('已切换到本机桥接模式')
      }
      else {
        logStatus('已切换到 WebUSB 模式')
      }
    })
  });

  [ui.apiKeyInput, ui.baseUrlInput, ui.modelInput, ui.maxStepsInput].forEach((el) => {
    if (!el)
      return
    el.addEventListener('input', () => {
      scheduleSave()
    })
  })
}

updateSecureHint()
loadState()
updateLinkUI()
loadApps()
bindEvents()

window.addEventListener('beforeunload', () => {
  saveState()
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveState()
  }
})
