# Deploying the Dialbridge backend

The backend is **your own private service** — it is *not* published like the SDKs. You
host it; clients only ever get its **HTTPS URL + an API key**. (The SDKs require
`https://`, so a TLS domain is mandatory in production.)

## What you need

- **Node 20+** runtime (or Docker — a `Dockerfile` is included)
- A **managed PostgreSQL** database
- An **S3 bucket** for recordings (use a **private** bucket in production)
- A domain with **HTTPS** (most platforms give you one)

## Environment variables

Set these on the host (never commit them). In production, secrets must be **real and
≥16 chars** — the app refuses to boot otherwise (fail-closed).

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/dialbridge` |
| `JWT_SECRET` | yes | ≥16 chars, random |
| `WEBHOOK_SECRET` | yes | ≥16 chars, random (operator webhook HMAC) |
| `PORT` | no | platform usually sets it (default 3000) |
| `AWS_REGION` `AWS_BUCKET` `AWS_FOLDER` | for recordings | private bucket in prod |
| `AWS_ACCESS_KEY_ID` `AWS_SECRET_ACCESS_KEY` | for recordings | least-privilege IAM |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` | first run only | to seed the first admin |

Generate a secret: `openssl rand -hex 24`.

## Build & run

### Docker (works on any platform)

```bash
docker build -t dialbridge-backend ./backend
docker run --env-file ./backend/.env -p 3000:3000 dialbridge-backend
```

The image runs **migrations on boot**, then starts the server (`npm run start:prod`).
For multi-instance deploys, run migrations as a one-off release step instead:
`node dist/db/migrate.js`.

### Without Docker (buildpack platforms)

```
Build:   npm ci && npm run build
Release: npm run migrate:prod        # node dist/db/migrate.js
Start:   npm run start               # node dist/server.js
```

### Render / Railway / Fly (quick path)

1. Create a **PostgreSQL** instance → copy its connection string into `DATABASE_URL`.
2. Create a **web service** from this repo, root = `backend/` (Docker or Node buildpack).
3. Add the env vars above. The platform's HTTPS URL becomes your API base.

## First-run onboarding

```bash
# 1) seed the first admin (set ADMIN_EMAIL / ADMIN_PASSWORD)
npm run seed-admin:prod

# 2) log into the admin console, create an integrator → copy its db_live_ API key
# 3) give the client: your HTTPS base URL + (the client mints tokens with the key)
```

In the SDKs, the client sets `baseURL` / `baseUrl` to **your HTTPS URL** (e.g.
`https://api.yourdomain.com`).

## Production hardening checklist

- [ ] **Private** S3 bucket for recordings (the demo used a public test bucket) + presigned URLs
- [ ] **Rotate** any test AWS keys used during development
- [ ] Restrict **CORS** to your admin console origin (currently open behind a Bearer API)
- [ ] Use **Redis** for rate-limiting + locks if running more than one instance
- [ ] Set `JWT_SECRET` / `WEBHOOK_SECRET` to fresh random values
- [ ] Keep this repo **private** (it's your core IP); only the SDKs are public
- [ ] Tata DIGO credentials go in env too (swap `MockTelephonyDriver` → operator driver)
