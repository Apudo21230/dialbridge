import express, { type Express } from 'express';
import cors from 'cors';
import { config, recordingStorage } from './config.js';
import { S3RecordingStore } from './recording/recordingStore.js';
import { CallService } from './calls/callService.js';
import { CallRepository } from './calls/callRepository.js';
import { EndUserRepository } from './users/endUserRepository.js';
import { WalletRepository } from './billing/walletRepository.js';
import { BillingService } from './billing/billingService.js';
import { createWalletRouter } from './billing/walletRoutes.js';
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
import { createDemoRouter } from './demo/demoRoutes.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

export interface AppDeps {
  db?: Db;
  adapter?: TelephonyAdapter;
}

export function createApp(deps: AppDeps = {}): Express {
  const db = deps.db ?? createDb(createPool());
  const adapter = deps.adapter ?? new MockTelephonyDriver(config.webhookSecret);

  const walletRepo = new WalletRepository(db);
  const billing = new BillingService(walletRepo);
  const recordingStore = recordingStorage ? new S3RecordingStore(recordingStorage) : undefined;
  const callRepo = new CallRepository(db);
  const endUserRepo = new EndUserRepository(db);
  const callService = new CallService(adapter, callRepo, billing, endUserRepo, recordingStore);
  const integratorRepo = new IntegratorRepository(db);
  const integratorService = new IntegratorService(integratorRepo);
  const requireApiKey = createRequireApiKey(integratorService);
  const requireCaller = createRequireCaller(integratorService);

  const adminService = new AdminService(new AdminRepository(db));
  const audit = new AuditRepository(db);

  const app = express();
  app.use(requestId);
  app.use(requestLogger);
  // Rate limiting (disabled under test to keep the suite deterministic).
  if (process.env.NODE_ENV !== 'test') {
    app.use(apiLimiter);
    app.use('/admin/login', authLimiter);
    app.use('/client-tokens', authLimiter);
  }
  // Bearer-token API (no cookies) — CORS open is acceptable; restrict via a
  // reverse proxy / allowlist in production.
  app.use(cors());
  // Capture the raw body so webhook signatures can be verified over exact bytes.
  app.use(express.json({ verify: (req, _res, buf) => { (req as express.Request).rawBody = Buffer.from(buf); } }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Admin console (login is open; the rest require an admin token).
  app.use(createAdminRouter({ adminService, integratorService, integratorRepo, callRepo, callService, endUserRepo, audit }));
  // Client-token minting — integrator's backend only (API key).
  app.use(createClientTokenRouter(requireApiKey));
  // Wallet top-up / balance — integrator's backend only (API key). Top-up extends active calls.
  app.use(createWalletRouter(walletRepo, requireApiKey, callService));
  // Masked-call API — accepts an API key OR a client token (active integrator).
  app.use(createCallRouter(callService, requireCaller));
  // Operator-facing webhook — no API key.
  app.use(createWebhookRouter(adapter, callService));
  // Demo helpers for the example apps — never mounted in production.
  if (process.env.NODE_ENV !== 'production') {
    app.use(createDemoRouter(requireCaller));
  }

  app.locals.callService = callService;
  app.locals.db = db;

  return app;
}
