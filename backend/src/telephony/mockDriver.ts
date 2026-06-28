import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  MaskedCallSession,
  NormalizedCallEvent,
  NormalizedCallEventType,
  StartMaskedCallParams,
  TelephonyAdapter,
} from './types.js';

const EVENT_TYPES: readonly NormalizedCallEventType[] = [
  'ringing',
  'answered',
  'completed',
  'failed',
];

function isEventType(value: unknown): value is NormalizedCallEventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

export class MockTelephonyDriver implements TelephonyAdapter {
  readonly provider = 'mock';

  constructor(private readonly webhookSecret: string = '') {}

  /** HMAC-SHA256 of the raw body, compared in constant time. Rejects when unconfigured. */
  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    if (!this.webhookSecret || !signature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async startMaskedCall(_params: StartMaskedCallParams): Promise<MaskedCallSession> {
    return {
      providerSessionId: randomUUID(),
      virtualNumber: '+910000000000',
      status: 'ringing',
    };
  }

  async endCall(_providerSessionId: string): Promise<void> {
    // No-op for the mock.
  }

  parseWebhook(payload: unknown): NormalizedCallEvent {
    const p = payload as Record<string, unknown>;
    if (!p || typeof p.providerSessionId !== 'string' || !isEventType(p.type)) {
      throw new Error('invalid webhook payload');
    }
    return {
      providerSessionId: p.providerSessionId,
      type: p.type,
      billableSeconds: typeof p.billableSeconds === 'number' ? p.billableSeconds : undefined,
      recordingUrl: typeof p.recordingUrl === 'string' ? p.recordingUrl : undefined,
      at: typeof p.at === 'string' ? p.at : new Date().toISOString(),
    };
  }
}
