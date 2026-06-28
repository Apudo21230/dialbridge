import express, { type Express } from 'express';
import cors from 'cors';
import { CallService } from './calls/callService.js';
import { CallRepository } from './calls/callRepository.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';
import { createWebhookRouter } from './telephony/webhookRoutes.js';
import type { TelephonyAdapter } from './telephony/types.js';
import { createPool, createDb, type Db } from './db/client.js';
import { IntegratorRepository } from './integrators/integratorRepository.js';
import { IntegratorService } from './integrators/integratorService.js';
import { createRequireApiKey } from './auth/requireApiKey.js';
import { createRequireCaller } from './auth/requireCaller.js';
import { createClientTokenRouter } from './integrators/clientTokenRoutes.js';
import { AdminRepository } from './admin/adminRepository.js';
import { AdminService } from './admin/adminService.js';
import { AuditRepository } from './admin/auditRepository.js';
import { createAdminRouter } from './admin/adminRoutes.js';

export interface AppDeps {
  db?: Db;
  adapter?: TelephonyAdapter;
}

export function createApp(deps: AppDeps = {}): Express {
  const db = deps.db ?? createDb(createPool());
  const adapter = deps.adapter ?? new MockTelephonyDriver();

  const callService = new CallService(adapter, new CallRepository(db));
  const integratorRepo = new IntegratorRepository(db);
  const integratorService = new IntegratorService(integratorRepo);
  const requireApiKey = createRequireApiKey(integratorService);
  const requireCaller = createRequireCaller(integratorService);

  const adminService = new AdminService(new AdminRepository(db));
  const audit = new AuditRepository(db);

  const app = express();
  // Bearer-token API (no cookies) — CORS open is acceptable; restrict via a
  // reverse proxy / allowlist in production.
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Admin console (login is open; the rest require an admin token).
  app.use(createAdminRouter({ adminService, integratorService, integratorRepo, audit }));
  // Client-token minting — integrator's backend only (API key).
  app.use(createClientTokenRouter(requireApiKey));
  // Masked-call API — accepts an API key OR a client token (active integrator).
  app.use(createCallRouter(callService, requireCaller));
  // Operator-facing webhook — no API key.
  app.use(createWebhookRouter(adapter, callService));

  app.locals.callService = callService;
  app.locals.db = db;

  return app;
}
