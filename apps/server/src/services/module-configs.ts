import type { Database } from '../libs/db'
import type { NewUserModuleConfig } from '../schemas/module-configs'

import { and, eq, isNull } from 'drizzle-orm'

import { userModuleConfigs } from '../schemas/module-configs'

export function createModuleConfigService(db: Database) {
  return {
    async findByOwner(ownerId: string) {
      return await db.query.userModuleConfigs.findMany({
        where: and(
          eq(userModuleConfigs.ownerId, ownerId),
          isNull(userModuleConfigs.deletedAt),
        ),
      })
    },

    async findByOwnerAndModule(ownerId: string, moduleName: string) {
      return await db.query.userModuleConfigs.findFirst({
        where: and(
          eq(userModuleConfigs.ownerId, ownerId),
          eq(userModuleConfigs.moduleName, moduleName),
          isNull(userModuleConfigs.deletedAt),
        ),
      })
    },

    async upsert(data: NewUserModuleConfig) {
      const [result] = await db.insert(userModuleConfigs)
        .values(data)
        .onConflictDoUpdate({
          target: [userModuleConfigs.ownerId, userModuleConfigs.moduleName],
          set: { config: data.config, updatedAt: new Date(), deletedAt: null },
        })
        .returning()
      return result
    },

    async softDelete(ownerId: string, moduleName: string) {
      return await db.update(userModuleConfigs)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(userModuleConfigs.ownerId, ownerId),
          eq(userModuleConfigs.moduleName, moduleName),
          isNull(userModuleConfigs.deletedAt),
        ))
        .returning()
    },
  }
}

export type ModuleConfigService = ReturnType<typeof createModuleConfigService>
