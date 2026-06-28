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

async function apiKey(): Promise<string> {
  return (await new IntegratorService(new IntegratorRepository(db)).onboard('extend')).apiKey;
}
function topup(key: string, userRef: string, amount: number) {
  return request(app).post('/wallets/topup').set('Authorization', `Bearer ${key}`).send({ userRef, amount });
}

beforeEach(async () => {
  await db.execute(sql`truncate table wallet_transactions, wallets, calls, api_keys, integrators restart identity cascade`);
});
afterAll(async () => { await pool.end(); });

describe('mid-call top-up extends the active call', () => {
  it('a top-up recomputes the active call maxSeconds (more balance → more talk time)', async () => {
    const key = await apiKey();
    await topup(key, 'u1', 1000); // ₹10

    // ₹10/min → maxSeconds = floor(1000/1000*60) = 60 (1 min)
    const call = await request(app).post('/calls').set('Authorization', `Bearer ${key}`).send({
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      userRef: 'u1',
      ratePerMinute: 1000,
    });
    expect(call.body.maxSeconds).toBe(60);

    // top up ₹50 → balance 6000 → affordable = floor(6000/1000*60) = 360 (6 min)
    const t = await topup(key, 'u1', 5000);
    expect(t.status).toBe(200);
    expect(t.body.balance).toBe(6000);
    expect(t.body.extendedCalls).toHaveLength(1);
    expect(t.body.extendedCalls[0].maxSeconds).toBe(360);

    const [row] = await db.select().from(calls).where(eq(calls.id, call.body.sessionId)).limit(1);
    expect(row.maxSeconds).toBe(360);
  });

  it('a top-up with no active call extends nothing', async () => {
    const key = await apiKey();
    const t = await topup(key, 'u2', 1000);
    expect(t.body.extendedCalls).toHaveLength(0);
  });
});
