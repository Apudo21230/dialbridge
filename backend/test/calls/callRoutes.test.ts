import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createApp } from '../../src/app.js';
import { createPool, createDb } from '../../src/db/client.js';
import { IntegratorService } from '../../src/integrators/integratorService.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });
const body = { bookingId: 'b1', creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true };

async function key(name = 'callRoutes'): Promise<string> {
  return (await new IntegratorService(new IntegratorRepository(db)).onboard(name)).apiKey;
}

beforeEach(async () => { await db.execute(sql`truncate table calls, api_keys, integrators restart identity cascade`); });
afterAll(async () => { await pool.end(); });

describe('calls API', () => {
  it('starts a call with a valid key; rejects no-auth (401) and bad body (400)', async () => {
    const apiKey = await key();
    const res = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(body);
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.status).toBe('ringing');

    expect((await request(app).post('/calls').send(body)).status).toBe(401);
    expect((await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send({ creatorNumber: 'x' })).status).toBe(400);
  });

  it('GET /calls/:id returns the call; another integrator gets 404 (scoping)', async () => {
    const apiKey = await key('a');
    const start = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(body);
    const id = start.body.sessionId as string;

    const got = await request(app).get(`/calls/${id}`).set('Authorization', `Bearer ${apiKey}`);
    expect(got.status).toBe(200);
    expect(got.body.sessionId).toBe(id);

    const otherKey = await key('b');
    expect((await request(app).get(`/calls/${id}`).set('Authorization', `Bearer ${otherKey}`)).status).toBe(404);
  });

  it("GET /calls lists the integrator's own calls", async () => {
    const apiKey = await key('c');
    await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(body);
    await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(body);
    const list = await request(app).get('/calls').set('Authorization', `Bearer ${apiKey}`);
    expect(list.status).toBe(200);
    expect(list.body.calls).toHaveLength(2);
  });
});
