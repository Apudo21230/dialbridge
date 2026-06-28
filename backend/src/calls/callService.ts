import type {
  TelephonyAdapter,
  StartMaskedCallParams,
  NormalizedCallEvent,
  NormalizedCallEventType,
} from '../telephony/types.js';
import type { CallRepository } from './callRepository.js';
import type { BillingService } from '../billing/billingService.js';
import type { RecordingStore } from '../recording/recordingStore.js';
import type { EndUserRepository } from '../users/endUserRepository.js';
import type { CallRow } from '../db/schema.js';

/** Thrown when a blocked end-user tries to start a call. Mapped to 403 at the route. */
export class UserBlockedError extends Error {
  constructor() {
    super('user blocked');
    this.name = 'UserBlockedError';
  }
}

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
  callerRef?: string;
  receiverRef?: string;
  ticket?: string;
  ratePerMinute?: number;
}

export class CallService {
  constructor(
    private readonly adapter: TelephonyAdapter,
    private readonly repo: CallRepository,
    private readonly billing: BillingService,
    private readonly endUsers: EndUserRepository,
    private readonly recordingStore?: RecordingStore,
  ) {}

  async startCall(params: StartMaskedCallParams, ctx: CallContext): Promise<CallRow> {
    // A blocked end-user cannot start a call, regardless of wallet balance.
    if (ctx.userRef) {
      const user = await this.endUsers.ensure(ctx.integratorId, ctx.userRef);
      if (user.status === 'blocked') throw new UserBlockedError();
    }

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
      callerRef: ctx.callerRef,
      receiverRef: ctx.receiverRef,
      ticket: ctx.ticket,
      ratePerMinute: ctx.ratePerMinute,
      maxSeconds,
    });
  }

  async handleEvent(event: NormalizedCallEvent): Promise<CallRow | undefined> {
    const terminal = event.type === 'completed' || event.type === 'failed';
    const at = new Date(event.at);
    const updated = await this.repo.applyEvent(this.adapter.provider, event.providerSessionId, {
      status: EVENT_TO_STATUS[event.type],
      billableSeconds: event.billableSeconds,
      recordingUrl: safeRecordingUrl(event.recordingUrl),
      ringingAt: event.type === 'ringing' ? at : undefined,
      answeredAt: event.type === 'answered' ? at : undefined,
      endedAt: terminal ? at : undefined,
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

    // On call end, re-store the provider recording to our own storage.
    if (updated && terminal && updated.recordingUrl && this.recordingStore) {
      try {
        const storedUrl = await this.recordingStore.store(updated.id, updated.recordingUrl);
        await this.repo.setRecordingUrl(updated.id, storedUrl);
        updated.recordingUrl = storedUrl;
      } catch {
        // Keep the provider URL if our storage fails; never fail the webhook.
      }
    }
    return updated;
  }

  getForIntegrator(id: string, integratorId: string): Promise<CallRow | undefined> {
    return this.repo.findByIdForIntegrator(id, integratorId);
  }

  list(integratorId: string, limit: number, cursor?: { createdAt: string; id: string }): Promise<CallRow[]> {
    return this.repo.listByIntegrator(integratorId, limit, cursor);
  }

  /** Register an end-user (e.g. on a wallet top-up) so they appear in the admin console. */
  ensureUser(integratorId: string, userRef: string): Promise<unknown> {
    return this.endUsers.ensure(integratorId, userRef);
  }

  /**
   * Block or unblock an end-user. Blocking cuts every still-open call immediately
   * (the provider ends the leg); the balance is left untouched (frozen, not refunded).
   */
  async setUserBlocked(integratorId: string, userRef: string, blocked: boolean): Promise<{ status: string; cutCalls: string[] }> {
    await this.endUsers.ensure(integratorId, userRef);
    const updated = await this.endUsers.setStatus(integratorId, userRef, blocked ? 'blocked' : 'active');
    const cutCalls: string[] = [];
    if (blocked) {
      const open = await this.repo.findOpenByUserRef(integratorId, userRef);
      for (const call of open) {
        try {
          await this.adapter.endCall(call.providerSessionId);
        } catch {
          // Provider hangup is best-effort; we still mark the call ended locally.
        }
        await this.repo.applyEvent(this.adapter.provider, call.providerSessionId, {
          status: 'failed',
          endedAt: new Date(),
        });
        cutCalls.push(call.id);
      }
    }
    return { status: updated?.status ?? (blocked ? 'blocked' : 'active'), cutCalls };
  }

  /** After a mid-call top-up, recompute the affordable duration and extend the user's active calls. */
  async extendActiveCallsForUser(integratorId: string, userRef: string): Promise<{ callId: string; maxSeconds: number }[]> {
    const active = await this.repo.findActiveByUserRef(integratorId, userRef);
    const extended: { callId: string; maxSeconds: number }[] = [];
    for (const call of active) {
      if (!call.ratePerMinute) continue;
      const maxSeconds = await this.billing.affordableSeconds(integratorId, userRef, call.ratePerMinute);
      await this.adapter.extendCall(call.providerSessionId, maxSeconds);
      await this.repo.updateMaxSeconds(call.id, maxSeconds);
      extended.push({ callId: call.id, maxSeconds });
    }
    return extended;
  }
}
