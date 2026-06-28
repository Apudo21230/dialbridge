import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, bigint, uniqueIndex } from 'drizzle-orm/pg-core';

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

/** A masked-call session. Real numbers are NOT persisted (privacy) — only the virtual number + provider session. */
export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  integratorId: uuid('integrator_id').notNull().references(() => integrators.id),
  bookingId: varchar('booking_id', { length: 128 }),
  provider: varchar('provider', { length: 40 }).notNull().default('mock'),
  providerSessionId: varchar('provider_session_id', { length: 128 }).notNull(),
  virtualNumber: varchar('virtual_number', { length: 20 }),
  status: varchar('status', { length: 20 }).notNull().default('created'),
  billableSeconds: integer('billable_seconds').notNull().default(0),
  // Billing (when the platform meters the call). Money in minor units (e.g. paise).
  userRef: varchar('user_ref', { length: 128 }),
  ratePerMinute: integer('rate_per_minute'),
  maxSeconds: integer('max_seconds'),
  cost: integer('cost'),
  recordingUrl: text('recording_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (t) => ({
  providerSessionUniq: uniqueIndex('calls_provider_session_uniq').on(t.provider, t.providerSessionId),
}));

/** An end-user's prepaid balance, keyed by (integrator, userRef). Money in minor units. */
export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  integratorId: uuid('integrator_id').notNull().references(() => integrators.id),
  userRef: varchar('user_ref', { length: 128 }).notNull(),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  walletUniq: uniqueIndex('wallets_integrator_user_uniq').on(t.integratorId, t.userRef),
}));

/** Append-only wallet ledger. */
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id),
  type: varchar('type', { length: 16 }).notNull(), // credit | debit
  amount: bigint('amount', { mode: 'number' }).notNull(),
  refCallId: uuid('ref_call_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type IntegratorRow = typeof integrators.$inferSelect;
export type NewIntegratorRow = typeof integrators.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type CallRow = typeof calls.$inferSelect;
export type WalletRow = typeof wallets.$inferSelect;
export type WalletTransactionRow = typeof walletTransactions.$inferSelect;
