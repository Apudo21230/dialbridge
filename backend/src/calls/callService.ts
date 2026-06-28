import type {
  TelephonyAdapter,
  StartMaskedCallParams,
  NormalizedCallEvent,
  NormalizedCallEventType,
} from '../telephony/types.js';
import type { CallRepository } from './callRepository.js';
import type { BillingService } from '../billing/billingService.js';
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

export interface CallContext {
  integratorId: string;
  userRef?: string;
  ratePerMinute?: number;
}

export class CallService {
  constructor(
    private readonly adapter: TelephonyAdapter,
    private readonly repo: CallRepository,
    private readonly billing: BillingService,
  ) {}

  async startCall(params: StartMaskedCallParams, ctx: CallContext): Promise<CallRow> {
    // Platform-owned billing: if this is an end-user call with a rate, check the
    // wallet and cap the call duration so the provider auto-cuts when funds run out.
    let maxSeconds: number | undefined;
    if (ctx.userRef && ctx.ratePerMinute) {
      ({ maxSeconds } = await this.billing.precheck(ctx.integratorId, ctx.userRef, ctx.ratePerMinute));
    }

    const session = await this.adapter.startMaskedCall({ ...params, maxSeconds });
    return this.repo.create({
      integratorId: ctx.integratorId,
      bookingId: params.bookingId,
      provider: this.adapter.provider,
      providerSessionId: session.providerSessionId,
      virtualNumber: session.virtualNumber,
      status: session.status,
      userRef: ctx.userRef,
      ratePerMinute: ctx.ratePerMinute,
      maxSeconds,
    });
  }

  async handleEvent(event: NormalizedCallEvent): Promise<CallRow | undefined> {
    const terminal = event.type === 'completed' || event.type === 'failed';
    const updated = await this.repo.applyEvent(this.adapter.provider, event.providerSessionId, {
      status: EVENT_TO_STATUS[event.type],
      billableSeconds: event.billableSeconds,
      recordingUrl: safeRecordingUrl(event.recordingUrl),
      endedAt: terminal ? new Date(event.at) : undefined,
    });

    // On call end, deduct the actual cost from the end-user's wallet.
    if (updated && terminal && updated.userRef && updated.ratePerMinute) {
      const cost = await this.billing.finalize(
        updated.integratorId,
        updated.userRef,
        updated.ratePerMinute,
        updated.billableSeconds,
        updated.id,
      );
      await this.repo.setCost(updated.id, cost);
      updated.cost = cost;
    }
    return updated;
  }

  getForIntegrator(id: string, integratorId: string): Promise<CallRow | undefined> {
    return this.repo.findByIdForIntegrator(id, integratorId);
  }

  list(integratorId: string, limit: number, cursor?: { createdAt: string; id: string }): Promise<CallRow[]> {
    return this.repo.listByIntegrator(integratorId, limit, cursor);
  }
}
