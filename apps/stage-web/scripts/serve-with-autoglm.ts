import { fileURLToPath } from 'node:url'

import { createAutoGLMServiceHost, createAutoGLMStaticServer } from '@proj-airi/stage-shared/node/autoglm-service'

const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 4173)
const distDir = fileURLToPath(new URL('../dist', import.meta.url))

const autoGLM = createAutoGLMServiceHost({
  cwd: fileURLToPath(new URL('../../..', import.meta.url)),
  log: message => console.info(`[AutoGLM] ${message}`),
  warn: message => console.warn(`[AutoGLM] ${message}`),
})

const server = createAutoGLMStaticServer({
  distDir,
  host,
  port,
  autoGLM,
})

server.listen(port, host, () => {
  console.info(`[AIRI] stage-web listening on http://${host}:${port}`)
  console.info('[AIRI] AutoGLM Python service will start on 127.0.0.1 with a random port on first use')
})

async function shutdown() {
  server.close()
  await autoGLM.stop()
}

process.once('SIGINT', () => {
  void shutdown().finally(() => process.exit(0))
})

process.once('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0))
})
