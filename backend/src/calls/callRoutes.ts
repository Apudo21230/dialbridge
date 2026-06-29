import { Router, type RequestHandler } from 'express';
import type { CallService } from './callService.js';
import type { CallRow } from '../db/schema.js';

function isE164(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{6,14}$/.test(value);
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString('base64url');
}

function decodeCursor(s: string): { createdAt: string; id: string } | undefined {
  try {
    const o = JSON.parse(Buffer.from(s, 'base64url').toString());
    return { createdAt: String(o.createdAt), id: String(o.id) };
  } catch {
    return undefined;
  }
}

function toDto(c: CallRow) {
  return {
    sessionId: c.id,
    status: c.status,
    virtualNumber: c.virtualNumber,
    bookingId: c.bookingId,
    billableSeconds: c.billableSeconds,
    recordingUrl: c.recordingUrl,
    createdAt: c.createdAt,
    endedAt: c.endedAt,
  };
}

export function createCallRouter(service: CallService, requireCaller: RequestHandler): Router {
  const router = Router();

  router.post('/calls', requireCaller, async (req, res) => {
    const { bookingId, creatorNumber, fanNumber, record, ratePerMinute, userRef, callerRef, receiverRef, ticket } = req.body ?? {};
    if ((bookingId !== undefined && typeof bookingId !== 'string') || !isE164(creatorNumber) || !isE164(fanNumber)) {
      res.status(400).json({ error: 'E.164 creatorNumber/fanNumber required (bookingId optional string)' });
      return;
    }
    if (ratePerMinute !== undefined && (!Number.isInteger(ratePerMinute) || ratePerMinute <= 0)) {
      res.status(400).json({ error: 'ratePerMinute must be a positive integer (minor units)' });
      return;
    }
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const ctx = {
      integratorId: req.integrator!.id,
      userRef: req.userRef ?? str(userRef),
      callerRef: str(callerRef),
      receiverRef: str(receiverRef),
      ticket: str(ticket),
      ratePerMinute: typeof ratePerMinute === 'number' ? ratePerMinute : undefined,
    };
    try {
      const call = await service.startCall({ bookingId, creatorNumber, fanNumber, record: Boolean(record) }, ctx);
      res.status(201).json({
        sessionId: call.id,
        virtualNumber: call.virtualNumber,
        status: call.status,
        maxSeconds: call.maxSeconds,
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'insufficient balance') {
        res.status(402).json({ error: 'insufficient balance' });
        return;
      }
      if (msg === 'user blocked') {
        res.status(403).json({ error: 'user blocked' });
        return;
      }
      throw e;
    }
  });

  router.get('/calls/:id', requireCaller, async (req, res) => {
    const call = await service.getForIntegrator(req.params.id, req.integrator!.id);
    if (!call) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.status(200).json(toDto(call));
  });

  router.get('/calls', requireCaller, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const cursor = typeof req.query.cursor === 'string' ? decodeCursor(req.query.cursor) : undefined;
    const rows = await service.list(req.integrator!.id, limit + 1, cursor);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    res.status(200).json({
      calls: page.map(toDto),
      nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    });
  });

  return router;
}
