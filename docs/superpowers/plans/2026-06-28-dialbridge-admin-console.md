# Dialbridge — Plan 03: Admin Console (scalable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Built TDD against real Postgres (`dialbridge_test`).

**Goal:** A scalable admin console — backend admin API + a separate React app — to manage **integrators** and their **API keys** (list/search/paginate, view, activate/deactivate, multi-key rotation/regenerate), behind real admin authentication, with an audit log.

**CTO design decisions (scale-first, not easy-first):**
1. **Admin auth = `admin_users` + login (bcrypt password → short-lived JWT)**, not a shared static secret. Multiple admins, future RBAC. First admin seeded via CLI (`db:seed-admin`).
2. **Multiple API keys per integrator + rotation** — each key has a label, `last_used_at`, individual revoke. "Regenerate" = issue new + revoke old, no downtime.
3. **List endpoint = cursor pagination + `status` filter + `search`** (never return all rows).
4. **Audit log** for every mutating admin action.
5. **`integrators.status`** (active/suspended); `requireApiKey` rejects suspended + records `last_used_at`.
6. Keys stay **hashed** (prefix + reveal-once). Single-secret-key scheme. Separate React app.
7. Fast-follow (noted, not built now): rate limiting; async `last_used_at` write at very high scale.

**Tech Stack:** Backend = existing Node/TS + Drizzle + Postgres + bcryptjs + jsonwebtoken. Admin web = Vite + React + TypeScript (`admin-web/`).

## Schema additions (migration 0001)
- `integrators`: + `status varchar(20) not null default 'active'`.
- `api_keys`: + `label varchar(100) not null default 'default'`, + `last_used_at timestamptz`.
- `admin_users`: id, email (unique), password_hash, role (default 'admin'), created_at.
- `audit_logs`: id, admin_user_id (fk, nullable), action, target_type, target_id, metadata (jsonb), created_at.

## Backend tasks (TDD)
1. **Schema + migration 0001** + reset test DB; re-add `config.jwtSecret` (fail-closed); drop `config.adminSecret`.
2. **Admin auth**: `token.ts` (admin JWT), `AdminRepository` (create/findByEmail), `AdminService` (seed/login), `requireAdmin` middleware, `db:seed-admin` CLI. Endpoints: `POST /admin/login`.
3. **Integrator management API** (all behind `requireAdmin`):
   - `POST /admin/integrators` (create) → returns integrator + first key (raw once)
   - `GET /admin/integrators?limit&cursor&status&search` (cursor pagination)
   - `GET /admin/integrators/:id` (detail + keys: id, label, prefix, lastUsedAt, revokedAt)
   - `POST /admin/integrators/:id/suspend` | `/activate`
   - `POST /admin/integrators/:id/keys` (issue new key) | `POST /admin/api-keys/:keyId/revoke`
   - Every mutation writes an `audit_logs` row.
4. **`requireApiKey` upgrade**: reject suspended integrator (403), set `req.integrator`, update `last_used_at` (lazy). Replace the old x-admin-secret `POST /integrators` with the admin route; update Plan 02 integrator test.

## Admin web tasks (`admin-web/`)
5. Vite React TS scaffold; API client; login screen (stores admin JWT in memory/sessionStorage).
6. Integrators table (search, status filter, pagination, activate/deactivate); detail drawer (keys, regenerate/revoke, reveal-once new key).

## Verification
Backend: real-Postgres TDD per task. Admin web: `npm run build` + a component/test smoke. Then PR #4.
