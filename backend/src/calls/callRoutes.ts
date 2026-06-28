import { Router } from 'express';
import type { CallService } from './callService.js';

function isE164(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{6,14}$/.test(value);
}

export function createCallRouter(service: CallService): Router {
  const router = Router();

  router.post('/calls', async (req, res) => {
    const { bookingId, creatorNumber, fanNumber, record } = req.body ?? {};
    if (typeof bookingId !== 'string' || !isE164(creatorNumber) || !isE164(fanNumber)) {
      res.status(400).json({ error: 'bookingId and E.164 creatorNumber/fanNumber are required' });
      return;
    }
    const rec = await service.startCall({
      bookingId,
      creatorNumber,
      fanNumber,
      record: Boolean(record),
    });
    res.status(201).json({
      sessionId: rec.sessionId,
      virtualNumber: rec.virtualNumber,
      status: rec.status,
    });
  });

  return router;
}
