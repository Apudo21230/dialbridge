import express, { type Express } from 'express';
import { CallService } from './calls/callService.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';

export function createApp(service: CallService = new CallService(new MockTelephonyDriver())): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(createCallRouter(service));

  // Expose for routers added in later tasks (e.g. webhook handler).
  app.locals.callService = service;

  return app;
}
