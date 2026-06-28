import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
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
    expect(session.virtualNumber).toMatch(/^\+9180\d{8}$/);
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

  it('verifies a webhook HMAC signature (and rejects bad/absent/unconfigured)', () => {
    const secret = 'webhook-secret-1234567890';
    const driver = new MockTelephonyDriver(secret);
    const body = Buffer.from('{"a":1}');
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    expect(driver.verifyWebhook(body, sig)).toBe(true);
    expect(driver.verifyWebhook(body, 'deadbeef')).toBe(false);
    expect(driver.verifyWebhook(body, undefined)).toBe(false);
    expect(new MockTelephonyDriver().verifyWebhook(body, sig)).toBe(false); // no secret configured
  });
});
