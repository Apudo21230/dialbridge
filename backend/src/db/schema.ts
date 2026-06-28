import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

/** A business that integrates Dialbridge (the API/SDK consumer). */
export const integrators = pgTable('integrators', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** API keys belonging to an integrator. Only the SHA-256 hash is stored. */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  integratorId: uuid('integrator_id').notNull().references(() => integrators.id),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  prefix: varchar('prefix', { length: 16 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export type IntegratorRow = typeof integrators.$inferSelect;
export type NewIntegratorRow = typeof integrators.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
