# Dialbridge — Plan 04: Client-token minting (SDK auth) Implementation Plan

> Built TDD against real Postgres. Branch `feat/client-tokens`.

**Goal:** Let an integrator's backend mint a **short-lived client token** (with its API key) that the **mobile SDK** uses to call our API — so the raw API key/secret is never shipped in the app. `/calls` accepts **either** an API key (server-to-server) **or** a client token (from the SDK).

**Why:** the SDK must authenticate without holding the integrator's secret. The integrator's backend (which holds the key) mints a 15-min token per session; the SDK uses it. This is the missing link that makes the SDK safe to embed. No DIGO/telephony in the SDK — only a token + our API.

## Design
- **Client token** = JWT signed with `JWT_SECRET`, payload `{ typ: 'client', sub: integratorId, userRef? }`, ~15 min expiry.
- **Admin token** gets `typ: 'admin'` so the two are not interchangeable (admin token can't call `/calls`, client token can't hit `/admin/*`).
- `POST /client-tokens` — **requireApiKey** (only a server-side API key mints). Body `{ userRef? }`. Returns `{ token, expiresIn }`.
- `requireCaller` middleware on `/calls`: bearer starting `db_live_` → API-key auth; else → client-token auth. Both re-check the integrator is **active** (suspended → 403).

## Files
- `src/auth/clientToken.ts` — `signClientToken`, `verifyClientToken`.
- `src/auth/token.ts` — admin token carries `typ: 'admin'` and verifies it.
- `src/integrators/integratorService.ts` — `authenticateClientToken(token)` (verify + active check).
- `src/auth/requireCaller.ts` — accept API key OR client token.
- `src/integrators/clientTokenRoutes.ts` — `POST /client-tokens` (requireApiKey).
- `src/app.ts` — wire client-token route; `/calls` uses `requireCaller`.
- `test/auth/clientToken.test.ts`.

## Verification
Real-Postgres TDD: mint via API key → token authenticates `/calls` (201); client token can't mint (401); suspended integrator's token → 403; admin token rejected on `/calls` (401). Then PR #5.

## Next (not here)
SDK `createCall()` methods (Android/iOS) using a client token; then the real Tata DIGO driver (backend swap, SDK unchanged).
