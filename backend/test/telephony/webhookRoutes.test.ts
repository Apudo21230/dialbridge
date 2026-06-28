import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql, eq } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config.js';
import { createPool, createDb } from '../../src/db/client.js';
import { IntegratorService } from '../../src/integrators/integratorService.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';
import { calls } from '../../src/db/schema.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });

function sign(body: string): string {
  return createHmac('sha256', config.webhookSecret).update(Buffer.from(body)).digest('hex');
}
function webhook(payload: object) {
  const body = JSON.stringify(payload);
  return request(app)
    .post('/telephony/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Telephony-Signature', sign(body))
    .send(body);
}
async function key(): Promise<string> {
  return (await new IntegratorService(new IntegratorRepository(db)).onboard('wh')).apiKey;
}

beforeEach(async () => { await db.execute(sql`truncate table calls, api_keys, integrators restart identity cascade`); });
afterAll(async () => { await pool.end(); });

describe('POST /telephony/webhook', () => {
  it('rejects an unsigned request with 401', async () => {
    const res = await request(app).post('/telephony/webhook').send({ providerSessionId: 'x', type: 'completed', at: '2026-06-28T10:00:00.000Z' });
    expect(res.status).toBe(401);
  });

  it('applies a signed completed event; later events do not downgrade it (monotonic)', async () => {
    const apiKey = await key();
    const start = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    const id = start.body.sessionId as string;
    const [row] = await db.select().from(calls).where(eq(calls.id, id)).limit(1);

    const applied = await webhook({ providerSessionId: row.providerSessionId, type: 'completed', billableSeconds: 60, at: '2026-06-28T10:00:00.000Z' });
    expect(applied.status).toBe(200);
    expect(applied.body.applied).toBe(true);

    const got = await request(app).get(`/calls/${id}`).set('Authorization', `Bearer ${apiKey}`);
    expect(got.body.status).toBe('completed');
    expect(got.body.billableSeconds).toBe(60);

    const downgrade = await webhook({ providerSessionId: row.providerSessionId, type: 'ringing', at: '2026-06-28T10:01:00.000Z' });
    expect(downgrade.body.applied).toBe(false);
    const still = await request(app).get(`/calls/${id}`).set('Authorization', `Bearer ${apiKey}`);
    expect(still.body.status).toBe('completed');
  });

  it('reports applied=false for an unknown (signed) session', async () => {
    const res = await webhook({ providerSessionId: 'unknown', type: 'completed', at: '2026-06-28T10:00:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
  });

  it('returns 400 on a signed but malformed payload', async () => {
    const res = await webhook({ type: 'completed' });
    expect(res.status).toBe(400);
  });
});
