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

### AWS — App Runner + RDS (recommended; you're already on AWS for S3)

**Architecture:** App Runner runs the backend (auto **HTTPS** + auto-scale, no servers to
manage) · **RDS PostgreSQL** is the database · S3 holds recordings.

1. **RDS** — create a PostgreSQL instance (e.g. `db.t4g.micro`). Note endpoint / db / user /
   password → `DATABASE_URL=postgres://USER:PASS@ENDPOINT:5432/dialbridge`.
   RDS uses TLS, so also set **`DATABASE_SSL=require`**.
2. **App Runner** — *Create service ▸ Source: GitHub* → connect this repo. App Runner reads
   [`apprunner.yaml`](../apprunner.yaml) (builds `backend/`, runs `start:prod`) — **no Docker
   needed**. Set the port to `3000` and health check `/health`.
3. **Env vars** (App Runner ▸ Configuration ▸ Environment): `DATABASE_URL`,
   `DATABASE_SSL=require`, `JWT_SECRET`, `WEBHOOK_SECRET`, `AWS_REGION`, `AWS_BUCKET`,
   `AWS_FOLDER`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (`NODE_ENV` is set by
   `apprunner.yaml`).
4. **VPC connector** — App Runner ▸ Networking ▸ add a VPC connector on the same VPC/subnets
   as RDS, and allow its security group on the RDS security group (port `5432`), so the
   service can reach the database.
5. App Runner gives you an **HTTPS URL** (`https://xxx.<region>.awsapprunner.com`) — that's
   your API base for the SDKs.

> **IAM:** the `Fancall_S3` user is S3-only. Creating RDS/App Runner needs broader
> permissions — do it as an admin/role with `apprunner:*`, `rds:*`, plus VPC/EC2 networking.
>
> **Alternative (container):** build the included `Dockerfile` (Node 20), push to **ECR**,
> and point App Runner at the image instead of GitHub — exact runtime, but needs Docker to
> build. **Cheaper/manual:** an **EC2** box running the image behind nginx/ALB + a cert.

### Other platforms (Railway / Fly / your server)

1. Create **PostgreSQL** → `DATABASE_URL` (add `DATABASE_SSL=require` if it uses TLS).
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
