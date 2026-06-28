import { describe, it, expect } from 'vitest';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';

describe('MockTelephonyDriver', () => {
  it('starts a masked call and returns a ringing session', async () => {
    const driver = new MockTelephonyDriver();
    const session = await driver.startMaskedCall({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    expect(session.providerSessionId).toBeTruthy();
    expect(session.virtualNumber).toBe('+910000000000');
    expect(session.status).toBe('ringing');
  });

  it('parses a valid webhook payload into a normalized event', () => {
    const driver = new MockTelephonyDriver();
    const event = driver.parseWebhook({
      providerSessionId: 'sess-1',
      type: 'completed',
      billableSeconds: 90,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(event).toEqual({
      providerSessionId: 'sess-1',
      type: 'completed',
      billableSeconds: 90,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
  });

  it('throws on an invalid webhook payload', () => {
    const driver = new MockTelephonyDriver();
    expect(() => driver.parseWebhook({ type: 'completed' })).toThrow('invalid webhook payload');
  });
});
