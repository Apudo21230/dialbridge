import { describe, it, expect } from 'vitest';
import { CallService } from '../../src/calls/callService.js';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';

const params = {
  bookingId: 'b1',
  creatorNumber: '+919800000001',
  fanNumber: '+919800000002',
  record: true,
};

describe('CallService', () => {
  it('starts a call and stores a retrievable record', async () => {
    const svc = new CallService(new MockTelephonyDriver());
    const rec = await svc.startCall(params);
    expect(rec.sessionId).toBeTruthy();
    expect(rec.bookingId).toBe('b1');
    expect(rec.status).toBe('ringing');
    expect(svc.getBySessionId(rec.sessionId)).toEqual(rec);
  });

  it('updates status and billing on a completed event', async () => {
    const svc = new CallService(new MockTelephonyDriver());
    const rec = await svc.startCall(params);
    const updated = svc.handleEvent({
      providerSessionId: rec.providerSessionId,
      type: 'completed',
      billableSeconds: 120,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(updated?.status).toBe('completed');
    expect(updated?.billableSeconds).toBe(120);
    expect(updated?.recordingUrl).toBe('https://rec/1.mp3');
  });

  it('returns undefined for an event with no matching session', async () => {
    const svc = new CallService(new MockTelephonyDriver());
    const result = svc.handleEvent({
      providerSessionId: 'does-not-exist',
      type: 'ringing',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(result).toBeUndefined();
  });
});
