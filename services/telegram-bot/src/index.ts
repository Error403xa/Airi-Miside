import process, { env } from 'node:process'

import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel, useLogg } from '@guiiai/logg'

import { TelegramAdapter } from './adapters/airi-adapter'

setGlobalFormat(Format.Pretty)
setGlobalLogLevel(LogLevel.Log)
const log = useLogg('Bot').useGlobalConfig()

async function main() {
  const adapter = new TelegramAdapter({
    telegramToken: env.TELEGRAM_BOT_TOKEN,
    airiToken: env.AIRI_TOKEN || 'abcd',
    airiUrl: env.AIRI_URL || 'ws://localhost:6121/ws',
  })
  await adapter.start()

  const shutdown = async (signal: string) => {
    log.log(`Received ${signal}, shutting down.`)
    await adapter.stop()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch(error => log.withError(error).error('An error occurred'))
