import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { CallService } from '../../src/calls/callService.js';
import { CallRepository } from '../../src/calls/callRepository.js';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';

const pool = createPool();
const db = createDb(pool);

function svc() {
  return new CallService(new MockTelephonyDriver(), new CallRepository(db));
}
async function newIntegrator(name = 'svc-test'): Promise<string> {
  return (await new IntegratorRepository(db).create(name)).id;
}

const params = { bookingId: 'b1', creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true };

beforeEach(async () => { await db.execute(sql`truncate table calls, api_keys, integrators restart identity cascade`); });
afterAll(async () => { await pool.end(); });

describe('CallService', () => {
  it('starts a persisted call scoped to an integrator', async () => {
    const integratorId = await newIntegrator();
    const rec = await svc().startCall(params, integratorId);
    expect(rec.id).toBeTruthy();
    expect(rec.status).toBe('ringing');
    expect(rec.provider).toBe('mock');

    expect((await svc().getForIntegrator(rec.id, integratorId))?.id).toBe(rec.id);
    const other = await newIntegrator('other');
    expect(await svc().getForIntegrator(rec.id, other)).toBeUndefined();
  });

  it('applies a completed event (status, billing, recording, endedAt)', async () => {
    const integratorId = await newIntegrator();
    const s = svc();
    const rec = await s.startCall(params, integratorId);
    const updated = await s.handleEvent({
      providerSessionId: rec.providerSessionId,
      type: 'completed',
      billableSeconds: 120,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(updated?.status).toBe('completed');
    expect(updated?.billableSeconds).toBe(120);
    expect(updated?.recordingUrl).toBe('https://rec/1.mp3');
    expect(updated?.endedAt).toBeTruthy();
  });

  it('returns undefined for an event with no matching session', async () => {
    const r = await svc().handleEvent({ providerSessionId: 'nope', type: 'ringing', at: '2026-06-28T10:00:00.000Z' });
    expect(r).toBeUndefined();
  });
});
