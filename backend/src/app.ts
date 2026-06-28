import express, { type Express } from 'express';
import { CallService } from './calls/callService.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';
import { createWebhookRouter } from './telephony/webhookRoutes.js';
import type { TelephonyAdapter } from './telephony/types.js';
import { createPool, createDb, type Db } from './db/client.js';
import { IntegratorRepository } from './integrators/integratorRepository.js';
import { IntegratorService } from './integrators/integratorService.js';
import { createIntegratorRouter } from './integrators/integratorRoutes.js';
import { createRequireApiKey } from './auth/requireApiKey.js';

export interface AppDeps {
  db?: Db;
  adapter?: TelephonyAdapter;
}

export function createApp(deps: AppDeps = {}): Express {
  const db = deps.db ?? createDb(createPool());
  const adapter = deps.adapter ?? new MockTelephonyDriver();
  const callService = new CallService(adapter);
  const integratorService = new IntegratorService(new IntegratorRepository(db));
  const requireApiKey = createRequireApiKey(integratorService);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Integrator onboarding (admin-gated) — issues API keys.
  app.use(createIntegratorRouter(integratorService));
  // Masked-call API — requires a valid integrator API key.
  app.use(createCallRouter(callService, requireApiKey));
  // Operator-facing webhook — no API key (called by the telephony provider).
  app.use(createWebhookRouter(adapter, callService));

  app.locals.callService = callService;
  app.locals.db = db;

  return app;
}
