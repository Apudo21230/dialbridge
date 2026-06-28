import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });

beforeEach(async () => { await db.execute(sql`truncate table api_keys, integrators restart identity cascade`); });
afterAll(async () => { await pool.end(); });

const validCall = { bookingId: 'b1', creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true };

describe('integrator onboarding + API-key auth', () => {
  it('onboards an integrator (admin) and the issued key authenticates POST /calls', async () => {
    const onboard = await request(app)
      .post('/integrators')
      .set('x-admin-secret', config.adminSecret)
      .send({ name: 'Acme' });
    expect(onboard.status).toBe(201);
    expect(onboard.body.apiKey).toMatch(/^db_live_/);
    expect(onboard.body.integratorId).toBeTruthy();

    const call = await request(app)
      .post('/calls')
      .set('Authorization', `Bearer ${onboard.body.apiKey}`)
      .send(validCall);
    expect(call.status).toBe(201);
    expect(call.body.virtualNumber).toBe('+910000000000');
  });

  it('rejects onboarding without admin secret, and /calls with missing/bad key', async () => {
    const noAdmin = await request(app).post('/integrators').send({ name: 'Acme' });
    expect(noAdmin.status).toBe(401);

    const noKey = await request(app).post('/calls').send(validCall);
    expect(noKey.status).toBe(401);

    const badKey = await request(app).post('/calls').set('Authorization', 'Bearer db_live_wrong').send(validCall);
    expect(badKey.status).toBe(401);
  });
});
