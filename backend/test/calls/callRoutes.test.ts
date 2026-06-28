import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('POST /calls', () => {
  it('starts a masked call and returns 201 with session info', async () => {
    const res = await request(createApp()).post('/calls').send({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.virtualNumber).toBe('+910000000000');
    expect(res.body.status).toBe('ringing');
  });

  it('rejects a request missing required fields with 400', async () => {
    const res = await request(createApp()).post('/calls').send({ bookingId: 'b1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
