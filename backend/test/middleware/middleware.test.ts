import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requestId } from '../../src/middleware/requestId.js';
import { makeLimiter } from '../../src/middleware/rateLimit.js';

describe('requestId', () => {
  it('sets X-Request-Id and echoes an inbound one', async () => {
    const app = express();
    app.use(requestId);
    app.get('/x', (_req, res) => res.json({ ok: true }));

    const generated = await request(app).get('/x');
    expect(generated.headers['x-request-id']).toBeTruthy();

    const echoed = await request(app).get('/x').set('X-Request-Id', 'abc-123');
    expect(echoed.headers['x-request-id']).toBe('abc-123');
  });
});

describe('rateLimit', () => {
  it('returns 429 once the limit is exceeded', async () => {
    const app = express();
    app.use(makeLimiter(2));
    app.get('/x', (_req, res) => res.json({ ok: true }));

    expect((await request(app).get('/x')).status).toBe(200);
    expect((await request(app).get('/x')).status).toBe(200);
    expect((await request(app).get('/x')).status).toBe(429);
  });
});
