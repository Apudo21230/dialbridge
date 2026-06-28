# Dialbridge

**B2B masked-calling SDK / API.** Integrators embed our SDK / call our API to add private masked phone calls to their product — neither party sees the other's real number; the call rings as a normal cellular call via a telecom operator's masking API. Monorepo:

- `backend/` — Node.js + TypeScript API (npm) — masked-call API, integrator API-key auth, admin console API
- `admin-web/` — React + Vite admin console (manage integrators & API keys)
- `android-sdk/` — Android client SDK (Gradle)
- `ios-sdk/` — iOS client SDK (SPM)

See `docs/specs/` for the PRD and `docs/superpowers/plans/` for implementation plans.

## Quick start (backend + admin)
```bash
# Postgres running locally; create DBs dialbridge_dev / dialbridge_test
cd backend && npm install && npm run db:migrate
ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=your-strong-password npm run db:seed-admin
npm run dev            # API on :3000

cd ../admin-web && npm install && npm run dev   # admin UI on :5173
```
