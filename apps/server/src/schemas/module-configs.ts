import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

export const userModuleConfigs = pgTable(
  'user_module_configs',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    moduleName: text('module_name').notNull(),
    config: jsonb('config').notNull().default({}),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  t => [unique().on(t.ownerId, t.moduleName)],
)

export type UserModuleConfig = InferSelectModel<typeof userModuleConfigs>
export type NewUserModuleConfig = InferInsertModel<typeof userModuleConfigs>

export const userModuleConfigsRelations = relations(
  userModuleConfigs,
  ({ one }) => ({
    owner: one(user, {
      fields: [userModuleConfigs.ownerId],
      references: [user.id],
    }),
  }),
)
