import { Router } from 'express';
import type { TelephonyAdapter } from './types.js';
import type { CallService } from '../calls/callService.js';

export function createWebhookRouter(adapter: TelephonyAdapter, service: CallService): Router {
  const router = Router();

  router.post('/telephony/webhook', async (req, res) => {
    let event;
    try {
      event = adapter.parseWebhook(req.body);
    } catch {
      res.status(400).json({ error: 'invalid webhook payload' });
      return;
    }
    const updated = await service.handleEvent(event);
    res.status(200).json({ applied: updated !== undefined });
  });

  return router;
}
