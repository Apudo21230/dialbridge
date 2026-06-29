import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { CallService } from '../../src/calls/callService.js';
import { CallRepository } from '../../src/calls/callRepository.js';
import { WalletRepository } from '../../src/billing/walletRepository.js';
import { BillingService } from '../../src/billing/billingService.js';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';
import { EndUserRepository } from '../../src/users/endUserRepository.js';
import type { RecordingStore } from '../../src/recording/recordingStore.js';

const pool = createPool();
const db = createDb(pool);

class FakeStore implements RecordingStore {
  readonly calls: { callId: string; sourceUrl: string }[] = [];
  async store(callId: string, sourceUrl: string): Promise<string> {
    this.calls.push({ callId, sourceUrl });
    return `https://our-bucket.s3.amazonaws.com/recordings/${callId}.mp3`;
  }
}

beforeEach(async () => {
  await db.execute(sql`truncate table wallet_transactions, wallets, calls, api_keys, integrators restart identity cascade`);
});
afterAll(async () => { await pool.end(); });

describe('recording storage', () => {
  it('re-stores the provider recording to our store on call end', async () => {
    const store = new FakeStore();
    const svc = new CallService(new MockTelephonyDriver(), new CallRepository(db), new BillingService(new WalletRepository(db)), new EndUserRepository(db), store);
    const integratorId = (await new IntegratorRepository(db).create('rec')).id;
    const rec = await svc.startCall({ creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true }, { integratorId });

    const updated = await svc.handleEvent({
      providerSessionId: rec.providerSessionId,
      type: 'completed',
      billableSeconds: 60,
      recordingUrl: 'https://provider.example.com/rec/abc.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0].sourceUrl).toBe('https://provider.example.com/rec/abc.mp3');
    expect(updated?.recordingUrl).toContain('our-bucket.s3');
  });

  it('keeps the provider URL and never throws when the store fails', async () => {
    const failing: RecordingStore = { store: async () => { throw new Error('s3 down'); } };
    const svc = new CallService(new MockTelephonyDriver(), new CallRepository(db), new BillingService(new WalletRepository(db)), new EndUserRepository(db), failing);
    const integratorId = (await new IntegratorRepository(db).create('rec2')).id;
    const rec = await svc.startCall({ creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true }, { integratorId });

    const updated = await svc.handleEvent({
      providerSessionId: rec.providerSessionId,
      type: 'completed',
      billableSeconds: 60,
      recordingUrl: 'https://provider.example.com/rec/xyz.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(updated?.recordingUrl).toBe('https://provider.example.com/rec/xyz.mp3');
  });
});
