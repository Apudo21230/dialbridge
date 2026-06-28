import { randomUUID } from 'node:crypto';
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
