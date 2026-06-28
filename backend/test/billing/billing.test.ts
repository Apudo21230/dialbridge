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

async function apiKey(): Promise<string> {
  return (await new IntegratorService(new IntegratorRepository(db)).onboard('billing')).apiKey;
}
function signedWebhook(payload: object) {
  const body = JSON.stringify(payload);
  return request(app)
    .post('/telephony/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Telephony-Signature', createHmac('sha256', config.webhookSecret).update(Buffer.from(body)).digest('hex'))
    .send(body);
}

beforeEach(async () => {
  await db.execute(sql`truncate table wallet_transactions, wallets, calls, api_keys, integrators restart identity cascade`);
});
afterAll(async () => { await pool.end(); });

describe('wallet billing', () => {
  it('top-up → priced call caps duration → webhook deducts actual cost', async () => {
    const key = await apiKey();

    const topup = await request(app).post('/wallets/topup').set('Authorization', `Bearer ${key}`).send({ userRef: 'u1', amount: 5000 });
    expect(topup.status).toBe(200);
    expect(topup.body.balance).toBe(5000);

    // ₹10/min (1000 paise) with 5000 paise → maxSeconds = floor(5000/1000*60) = 300
    const call = await request(app).post('/calls').set('Authorization', `Bearer ${key}`).send({
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      userRef: 'u1',
      ratePerMinute: 1000,
    });
    expect(call.status).toBe(201);
    expect(call.body.maxSeconds).toBe(300);

    const [row] = await db.select().from(calls).where(eq(calls.id, call.body.sessionId)).limit(1);
    // 90s used → ceil(90/60)=2 min × 1000 = 2000 paise deducted
    const wh = await signedWebhook({ providerSessionId: row.providerSessionId, type: 'completed', billableSeconds: 90, at: '2026-06-28T10:00:00.000Z' });
    expect(wh.status).toBe(200);

    const bal = await request(app).get('/wallets/u1').set('Authorization', `Bearer ${key}`);
    expect(bal.body.balance).toBe(3000);
  });

  it('rejects a priced call with insufficient balance (402)', async () => {
    const key = await apiKey();
    const call = await request(app).post('/calls').set('Authorization', `Bearer ${key}`).send({
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      userRef: 'broke',
      ratePerMinute: 1000,
    });
    expect(call.status).toBe(402);
  });
});
