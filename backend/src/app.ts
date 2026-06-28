import express, { type Express } from 'express';
import { CallService } from './calls/callService.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';
import { createWebhookRouter } from './telephony/webhookRoutes.js';
import type { TelephonyAdapter } from './telephony/types.js';
import { createPool, createDb, type Db } from './db/client.js';
import { UserRepository } from './users/userRepository.js';
import { AuthService } from './auth/authService.js';
import { createAuthRouter } from './auth/authRoutes.js';

export interface AppDeps {
  db?: Db;
  adapter?: TelephonyAdapter;
}

export function createApp(deps: AppDeps = {}): Express {
  const db = deps.db ?? createDb(createPool());
  const adapter = deps.adapter ?? new MockTelephonyDriver();
  const callService = new CallService(adapter);
  const authService = new AuthService(new UserRepository(db));

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(createCallRouter(callService));
  app.use(createWebhookRouter(adapter, callService));
  app.use(createAuthRouter(authService));

  app.locals.callService = callService;
  app.locals.db = db;

  return app;
}
