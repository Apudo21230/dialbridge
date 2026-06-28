import express, { type Express } from 'express';
import { CallService } from './calls/callService.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';
import { createWebhookRouter } from './telephony/webhookRoutes.js';
import type { TelephonyAdapter } from './telephony/types.js';

export function createApp(
  adapter: TelephonyAdapter = new MockTelephonyDriver(),
  service: CallService = new CallService(adapter),
): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(createCallRouter(service));
  app.use(createWebhookRouter(adapter, service));

  app.locals.callService = service;

  return app;
}
