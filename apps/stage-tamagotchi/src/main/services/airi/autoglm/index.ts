import type { createContext } from '@moeru/eventa/adapters/electron/main'

import { useLogg } from '@guiiai/logg'
import { defineInvokeHandler } from '@moeru/eventa'
import { createContext as createElectronContext } from '@moeru/eventa/adapters/electron/main'
import { createAutoGLMServiceHost } from '@proj-airi/stage-shared/node/autoglm-service'
import { app, ipcMain } from 'electron'

import {
  electronAutoGLMEnsureStarted,
  electronAutoGLMGetRuntimeStatus,
} from '../../../../shared/eventa'
import { onAppBeforeQuit } from '../../../libs/bootkit/lifecycle'

export type AutoGLMRuntime = ReturnType<typeof createAutoGLMServiceHost>

export function setupAutoGLMRuntime() {
  const log = useLogg('main/autoglm').useGlobalConfig()
  const autoGLM = createAutoGLMServiceHost({
    cwd: app.getAppPath(),
    candidates: [
      process.cwd(),
      app.getAppPath(),
      process.resourcesPath,
    ],
    log: message => log.log(message),
    warn: message => log.warn(message),
  })

  onAppBeforeQuit(() => {
    void autoGLM.stop()
  })

  return autoGLM
}

export function createAutoGLMService(params: {
  context?: ReturnType<typeof createContext>['context']
  autoGLM: AutoGLMRuntime
}) {
  const context = params.context || createElectronContext(ipcMain).context

  defineInvokeHandler(context, electronAutoGLMEnsureStarted, async () => {
    return params.autoGLM.ensureStarted()
  })

  defineInvokeHandler(context, electronAutoGLMGetRuntimeStatus, () => {
    return params.autoGLM.status()
  })
}
