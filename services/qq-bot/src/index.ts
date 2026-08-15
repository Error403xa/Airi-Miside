import process, { env } from 'node:process'

import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel, useLogg } from '@guiiai/logg'

import { QQAdapter } from './adapters/airi-adapter'

setGlobalFormat(Format.Pretty)
setGlobalLogLevel(LogLevel.Log)

const log = useLogg('Bot').useGlobalConfig()

async function main() {
  const adapter = new QQAdapter({
    onebotUrl: env.ONEBOT_WS_URL || '',
    onebotAccessToken: env.ONEBOT_ACCESS_TOKEN || undefined,
    airiToken: env.AIRI_TOKEN || 'abcd',
    airiUrl: env.AIRI_URL || 'ws://localhost:6121/ws',
  })

  await adapter.start()

  process.on('SIGINT', async () => {
    log.log('Received SIGINT, shutting down...')
    await adapter.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    log.log('Received SIGTERM, shutting down...')
    await adapter.stop()
    process.exit(0)
  })
}

main().catch((error) => {
  log.withError(error).error('Fatal error during startup')
  process.exit(1)
})
