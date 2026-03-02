import { sql } from 'drizzle-orm'
import { check, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

export const appUsers = pgTable('app_users', {
  id: uuid().defaultRandom().primaryKey(),
  email: text().notNull().unique(),
  name: text(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const farms = pgTable('farms', {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  createdBy: uuid('created_by').references(() => appUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const farmMembers = pgTable(
  'farm_members',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id),
    role: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('farm_members_farm_id_user_id_unique').on(table.farmId, table.userId),
    check('farm_members_role_check', sql`${table.role} IN ('owner', 'member')`),
  ],
)
