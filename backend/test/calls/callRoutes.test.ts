import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createPool, createDb } from '../../src/db/client.js';
import { IntegratorService } from '../../src/integrators/integratorService.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });
let apiKey: string;

beforeAll(async () => {
  apiKey = (await new IntegratorService(new IntegratorRepository(db)).onboard('callRoutes-test')).apiKey;
});
afterAll(async () => { await pool.end(); });

const body = { bookingId: 'b1', creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true };

describe('POST /calls', () => {
  it('starts a masked call with a valid API key', async () => {
    const res = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(body);
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.virtualNumber).toBe('+910000000000');
    expect(res.body.status).toBe('ringing');
  });

  it('rejects without an API key (401)', async () => {
    const res = await request(app).post('/calls').send(body);
    expect(res.status).toBe(401);
  });

  it('rejects a request missing required fields with 400 (authenticated)', async () => {
    const res = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send({ bookingId: 'b1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
