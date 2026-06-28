import { randomUUID } from 'node:crypto';
import type {
  CallStatus,
  NormalizedCallEvent,
  NormalizedCallEventType,
  StartMaskedCallParams,
  TelephonyAdapter,
} from '../telephony/types.js';

export interface CallRecord {
  sessionId: string;
  bookingId: string;
  providerSessionId: string;
  virtualNumber: string;
  status: CallStatus;
  billableSeconds: number;
  recordingUrl?: string;
}

const EVENT_TO_STATUS: Record<NormalizedCallEventType, CallStatus> = {
  ringing: 'ringing',
  answered: 'in_progress',
  completed: 'completed',
  failed: 'failed',
};

export class CallService {
  private readonly bySessionId = new Map<string, CallRecord>();
  private readonly byProviderId = new Map<string, CallRecord>();

  constructor(private readonly adapter: TelephonyAdapter) {}

  async startCall(params: StartMaskedCallParams): Promise<CallRecord> {
    const session = await this.adapter.startMaskedCall(params);
    const record: CallRecord = {
      sessionId: randomUUID(),
      bookingId: params.bookingId,
      providerSessionId: session.providerSessionId,
      virtualNumber: session.virtualNumber,
      status: session.status,
      billableSeconds: 0,
    };
    this.bySessionId.set(record.sessionId, record);
    this.byProviderId.set(record.providerSessionId, record);
    return record;
  }

  handleEvent(event: NormalizedCallEvent): CallRecord | undefined {
    const record = this.byProviderId.get(event.providerSessionId);
    if (!record) return undefined;

    record.status = EVENT_TO_STATUS[event.type];
    if (typeof event.billableSeconds === 'number') {
      record.billableSeconds = event.billableSeconds;
    }
    if (event.recordingUrl) {
      record.recordingUrl = event.recordingUrl;
    }
    return record;
  }

  getBySessionId(sessionId: string): CallRecord | undefined {
    return this.bySessionId.get(sessionId);
  }
}
