import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/** A business that integrates Dialbridge (the API/SDK consumer). */
export const integrators = pgTable('integrators', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | suspended
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** API keys belonging to an integrator. Only the SHA-256 hash is stored. Many per integrator (rotation). */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  integratorId: uuid('integrator_id').notNull().references(() => integrators.id),
  label: varchar('label', { length: 100 }).notNull().default('default'),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  prefix: varchar('prefix', { length: 16 }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

/** Operators of the admin console. */
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('admin'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only audit trail of mutating admin actions. */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id),
  action: varchar('action', { length: 64 }).notNull(),
  targetType: varchar('target_type', { length: 40 }),
  targetId: varchar('target_id', { length: 64 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type IntegratorRow = typeof integrators.$inferSelect;
export type NewIntegratorRow = typeof integrators.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
