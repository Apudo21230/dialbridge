import { Router } from 'express';
import type { TelephonyAdapter } from './types.js';
import type { CallService } from '../calls/callService.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function createWebhookRouter(adapter: TelephonyAdapter, service: CallService): Router {
  const router = Router();

  router.post('/telephony/webhook', async (req, res) => {
    const signature = req.header('X-Telephony-Signature');
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    if (!adapter.verifyWebhook(rawBody, signature)) {
      res.status(401).json({ error: 'invalid webhook signature' });
      return;
    }

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
