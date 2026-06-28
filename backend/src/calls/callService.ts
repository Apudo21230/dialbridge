import type {
  TelephonyAdapter,
  StartMaskedCallParams,
  NormalizedCallEvent,
  NormalizedCallEventType,
} from '../telephony/types.js';
import type { CallRepository } from './callRepository.js';
import type { CallRow } from '../db/schema.js';

const EVENT_TO_STATUS: Record<NormalizedCallEventType, string> = {
  ringing: 'ringing',
  answered: 'in_progress',
  completed: 'completed',
  failed: 'failed',
};

/** Only store provider-supplied recording URLs that are well-formed https. */
function safeRecordingUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

export class CallService {
  constructor(
    private readonly adapter: TelephonyAdapter,
    private readonly repo: CallRepository,
  ) {}

  async startCall(params: StartMaskedCallParams, integratorId: string): Promise<CallRow> {
    const session = await this.adapter.startMaskedCall(params);
    return this.repo.create({
      integratorId,
      bookingId: params.bookingId,
      provider: this.adapter.provider,
      providerSessionId: session.providerSessionId,
      virtualNumber: session.virtualNumber,
      status: session.status,
    });
  }

  async handleEvent(event: NormalizedCallEvent): Promise<CallRow | undefined> {
    const terminal = event.type === 'completed' || event.type === 'failed';
    return this.repo.applyEvent(this.adapter.provider, event.providerSessionId, {
      status: EVENT_TO_STATUS[event.type],
      billableSeconds: event.billableSeconds,
      recordingUrl: safeRecordingUrl(event.recordingUrl),
      endedAt: terminal ? new Date(event.at) : undefined,
    });
  }

  getForIntegrator(id: string, integratorId: string): Promise<CallRow | undefined> {
    return this.repo.findByIdForIntegrator(id, integratorId);
  }

  list(integratorId: string, limit: number, cursor?: { createdAt: string; id: string }): Promise<CallRow[]> {
    return this.repo.listByIntegrator(integratorId, limit, cursor);
  }
}
