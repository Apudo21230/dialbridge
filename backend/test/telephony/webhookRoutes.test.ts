import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { CallService } from '../../src/calls/callService.js';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';

describe('POST /telephony/webhook', () => {
  it('applies a completed event to an existing call (end-to-end)', async () => {
    // Inject a shared adapter + service so the test can read back the
    // provider session id the API does not expose.
    const adapter = new MockTelephonyDriver();
    const service = new CallService(adapter);
    const app = createApp(adapter, service);

    const start = await request(app).post('/calls').send({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    expect(start.status).toBe(201);

    const rec = service.getBySessionId(start.body.sessionId);
    expect(rec).toBeTruthy();

    const applied = await request(app).post('/telephony/webhook').send({
      providerSessionId: rec!.providerSessionId,
      type: 'completed',
      billableSeconds: 60,
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(applied.status).toBe(200);
    expect(applied.body.applied).toBe(true);
  });

  it('reports applied=false for an unknown session', async () => {
    const res = await request(createApp()).post('/telephony/webhook').send({
      providerSessionId: 'unknown-provider-id',
      type: 'completed',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
  });

  it('returns 400 on a malformed payload', async () => {
    const res = await request(createApp())
      .post('/telephony/webhook')
      .send({ type: 'completed' }); // missing providerSessionId
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
