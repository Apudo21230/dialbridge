import { eq, and, or, lt, ne, desc, inArray, isNotNull, count, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { calls, integrators, type CallRow } from '../db/schema.js';

export interface AdminCallRow extends CallRow {
  integratorName: string;
}

export interface AdminOverview {
  integrators: number;
  calls: number;
  activeCalls: number;
  recordings: number;
  billableSeconds: number;
  revenue: number;
}

export interface NewCall {
  integratorId: string;
  bookingId?: string;
  provider: string;
  providerSessionId: string;
  virtualNumber?: string;
  status: string;
  userRef?: string;
  callerRef?: string;
  receiverRef?: string;
  ticket?: string;
  ratePerMinute?: number;
  maxSeconds?: number;
}

export interface CallEventUpdate {
  status: string;
  billableSeconds?: number;
  recordingUrl?: string;
  ringingAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
}

export class CallRepository {
  constructor(private readonly db: Db) {}

  async create(c: NewCall): Promise<CallRow> {
    const [row] = await this.db
      .insert(calls)
      .values({
        integratorId: c.integratorId,
        bookingId: c.bookingId,
        provider: c.provider,
        providerSessionId: c.providerSessionId,
        virtualNumber: c.virtualNumber,
        status: c.status,
        userRef: c.userRef,
        callerRef: c.callerRef,
        receiverRef: c.receiverRef,
        ticket: c.ticket,
        ratePerMinute: c.ratePerMinute,
        maxSeconds: c.maxSeconds,
      })
      .returning();
    return row;
  }

  async setCost(id: string, cost: number): Promise<void> {
    await this.db.update(calls).set({ cost }).where(eq(calls.id, id));
  }

  async setRecordingUrl(id: string, recordingUrl: string): Promise<void> {
    await this.db.update(calls).set({ recordingUrl }).where(eq(calls.id, id));
  }

  /** Active (ringing/in_progress), billed calls for a given end-user. */
  async findActiveByUserRef(integratorId: string, userRef: string): Promise<CallRow[]> {
    return this.db
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.integratorId, integratorId),
          eq(calls.userRef, userRef),
          inArray(calls.status, ['ringing', 'in_progress']),
          isNotNull(calls.ratePerMinute),
        ),
      );
  }

  async updateMaxSeconds(id: string, maxSeconds: number): Promise<void> {
    await this.db.update(calls).set({ maxSeconds }).where(eq(calls.id, id));
  }

  /** Every still-open call for a user (any rate) — used to cut calls when the user is blocked. */
  async findOpenByUserRef(integratorId: string, userRef: string): Promise<CallRow[]> {
    return this.db
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.integratorId, integratorId),
          eq(calls.userRef, userRef),
          inArray(calls.status, ['created', 'ringing', 'in_progress']),
        ),
      );
  }

  async findByIdForIntegrator(id: string, integratorId: string): Promise<CallRow | undefined> {
    const [row] = await this.db
      .select()
      .from(calls)
      .where(and(eq(calls.id, id), eq(calls.integratorId, integratorId)))
      .limit(1);
    return row;
  }

  /** Apply a provider event. Scoped to (provider, providerSessionId); never downgrades a terminal call. */
  async applyEvent(provider: string, providerSessionId: string, u: CallEventUpdate): Promise<CallRow | undefined> {
    const set: Partial<typeof calls.$inferInsert> = { status: u.status };
    if (typeof u.billableSeconds === 'number') set.billableSeconds = u.billableSeconds;
    if (u.recordingUrl) set.recordingUrl = u.recordingUrl;
    if (u.ringingAt) set.ringingAt = u.ringingAt;
    if (u.answeredAt) set.answeredAt = u.answeredAt;
    if (u.endedAt) set.endedAt = u.endedAt;
    const [row] = await this.db
      .update(calls)
      .set(set)
      .where(
        and(
          eq(calls.provider, provider),
          eq(calls.providerSessionId, providerSessionId),
          ne(calls.status, 'completed'),
          ne(calls.status, 'failed'),
        ),
      )
      .returning();
    return row;
  }

  async listByIntegrator(
    integratorId: string,
    limit: number,
    cursor?: { createdAt: string; id: string },
  ): Promise<CallRow[]> {
    const conds = [eq(calls.integratorId, integratorId)];
    if (cursor) {
      const c = new Date(cursor.createdAt);
      conds.push(or(lt(calls.createdAt, c), and(eq(calls.createdAt, c), lt(calls.id, cursor.id)))!);
    }
    return this.db
      .select()
      .from(calls)
      .where(and(...conds))
      .orderBy(desc(calls.createdAt), desc(calls.id))
      .limit(limit);
  }

  /** Admin: every integrator's calls, newest first, with the integrator name joined in. */
  async listAllWithIntegrator(
    limit: number,
    cursor?: { createdAt: string; id: string },
    status?: string,
    integratorId?: string,
  ): Promise<AdminCallRow[]> {
    const conds = [];
    if (status) conds.push(eq(calls.status, status));
    if (integratorId) conds.push(eq(calls.integratorId, integratorId));
    if (cursor) {
      const c = new Date(cursor.createdAt);
      conds.push(or(lt(calls.createdAt, c), and(eq(calls.createdAt, c), lt(calls.id, cursor.id)))!);
    }
    const rows = await this.db
      .select({ call: calls, integratorName: integrators.name })
      .from(calls)
      .innerJoin(integrators, eq(calls.integratorId, integrators.id))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(calls.createdAt), desc(calls.id))
      .limit(limit);
    return rows.map((r) => ({ ...r.call, integratorName: r.integratorName }));
  }

  /** Admin: one call with its integrator name, for the call-detail view. */
  async findByIdWithIntegrator(id: string): Promise<AdminCallRow | undefined> {
    const [row] = await this.db
      .select({ call: calls, integratorName: integrators.name })
      .from(calls)
      .innerJoin(integrators, eq(calls.integratorId, integrators.id))
      .where(eq(calls.id, id))
      .limit(1);
    return row ? { ...row.call, integratorName: row.integratorName } : undefined;
  }

  /** Admin: platform-wide counters for the overview dashboard. */
  async adminOverview(): Promise<AdminOverview> {
    const [r] = await this.db
      .select({
        calls: count(),
        activeCalls: sql<number>`count(*) filter (where ${calls.status} in ('ringing','in_progress'))`,
        recordings: sql<number>`count(*) filter (where ${calls.recordingUrl} is not null)`,
        billableSeconds: sql<number>`coalesce(sum(${calls.billableSeconds}), 0)`,
        revenue: sql<number>`coalesce(sum(${calls.cost}), 0)`,
      })
      .from(calls);
    const [ic] = await this.db.select({ n: count() }).from(integrators);
    return {
      integrators: Number(ic.n),
      calls: Number(r.calls),
      activeCalls: Number(r.activeCalls),
      recordings: Number(r.recordings),
      billableSeconds: Number(r.billableSeconds),
      revenue: Number(r.revenue),
    };
  }
}
