import type { ModuleConfigService } from '../services/module-configs'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { UpdateModuleConfigSchema } from '../api/module-configs.schema'
import { authGuard } from '../middlewares/auth'
import { createBadRequestError, createNotFoundError } from '../utils/error'

export function createModuleConfigRoutes(moduleConfigService: ModuleConfigService) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    .get('/', async (c) => {
      const user = c.get('user')!
      const configs = await moduleConfigService.findByOwner(user.id)
      return c.json(configs)
    })

    .get('/:moduleName', async (c) => {
      const user = c.get('user')!
      const moduleName = c.req.param('moduleName')
      const config = await moduleConfigService.findByOwnerAndModule(user.id, moduleName)
      if (!config)
        throw createNotFoundError()
      return c.json(config)
    })

    .put('/:moduleName', async (c) => {
      const user = c.get('user')!
      const moduleName = c.req.param('moduleName')
      const body = await c.req.json()
      const result = safeParse(UpdateModuleConfigSchema, body)

      if (!result.success)
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)

      const config = await moduleConfigService.upsert({
        ownerId: user.id,
        moduleName,
        config: result.output.config ?? {},
      })

      return c.json(config)
    })

    .delete('/:moduleName', async (c) => {
      const user = c.get('user')!
      const moduleName = c.req.param('moduleName')

      const existing = await moduleConfigService.findByOwnerAndModule(user.id, moduleName)
      if (!existing)
        throw createNotFoundError()

      await moduleConfigService.softDelete(user.id, moduleName)
      return c.body(null, 204)
    })
}
