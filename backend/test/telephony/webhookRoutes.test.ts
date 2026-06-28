import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql, eq } from 'drizzle-orm';
import { createApp } from '../../src/app.js';
import { createPool, createDb } from '../../src/db/client.js';
import { IntegratorService } from '../../src/integrators/integratorService.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';
import { calls } from '../../src/db/schema.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });

async function key(): Promise<string> {
  return (await new IntegratorService(new IntegratorRepository(db)).onboard('wh')).apiKey;
}

beforeEach(async () => { await db.execute(sql`truncate table calls, api_keys, integrators restart identity cascade`); });
afterAll(async () => { await pool.end(); });

describe('POST /telephony/webhook', () => {
  it('applies a completed event to a persisted call (end-to-end)', async () => {
    const apiKey = await key();
    const start = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    const id = start.body.sessionId as string;
    const [row] = await db.select().from(calls).where(eq(calls.id, id)).limit(1);

    const applied = await request(app).post('/telephony/webhook').send({
      providerSessionId: row.providerSessionId,
      type: 'completed',
      billableSeconds: 60,
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(applied.status).toBe(200);
    expect(applied.body.applied).toBe(true);

    const got = await request(app).get(`/calls/${id}`).set('Authorization', `Bearer ${apiKey}`);
    expect(got.body.status).toBe('completed');
    expect(got.body.billableSeconds).toBe(60);
  });

  it('reports applied=false for an unknown session', async () => {
    const res = await request(app).post('/telephony/webhook').send({
      providerSessionId: 'unknown',
      type: 'completed',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
  });

  it('returns 400 on a malformed payload', async () => {
    const res = await request(app).post('/telephony/webhook').send({ type: 'completed' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
