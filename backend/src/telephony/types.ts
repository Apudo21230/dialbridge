export type CallStatus =
  | 'created'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'failed';

export type NormalizedCallEventType =
  | 'ringing'
  | 'answered'
  | 'completed'
  | 'failed';

export interface StartMaskedCallParams {
  bookingId?: string; // optional integrator reference
  creatorNumber: string; // E.164
  fanNumber: string; // E.164
  record: boolean;
  maxSeconds?: number; // provider auto-cuts the call at this duration (prepaid balance)
}

export interface MaskedCallSession {
  providerSessionId: string;
  virtualNumber: string;
  status: CallStatus;
}

export interface NormalizedCallEvent {
  providerSessionId: string;
  type: NormalizedCallEventType;
  billableSeconds?: number;
  recordingUrl?: string;
  at: string; // ISO-8601
}

export interface TelephonyAdapter {
  /** Provider identifier recorded on each call (e.g. 'mock', 'tata-digo'). */
  readonly provider: string;
  startMaskedCall(params: StartMaskedCallParams): Promise<MaskedCallSession>;
  endCall(providerSessionId: string): Promise<void>;
  /** Verify the webhook is genuinely from the provider (signature over the raw body). */
  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean;
  parseWebhook(payload: unknown): NormalizedCallEvent;
}

const CALL_STATUSES: readonly CallStatus[] = [
  'created',
  'ringing',
  'in_progress',
  'completed',
  'failed',
];

export function isCallStatus(value: unknown): value is CallStatus {
  return typeof value === 'string' && (CALL_STATUSES as readonly string[]).includes(value);
}
