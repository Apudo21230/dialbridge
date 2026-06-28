import { eq, and, or, lt, ne, desc } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { calls, type CallRow } from '../db/schema.js';

export interface NewCall {
  integratorId: string;
  bookingId?: string;
  provider: string;
  providerSessionId: string;
  virtualNumber?: string;
  status: string;
  userRef?: string;
  ratePerMinute?: number;
  maxSeconds?: number;
}

export interface CallEventUpdate {
  status: string;
  billableSeconds?: number;
  recordingUrl?: string;
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
        ratePerMinute: c.ratePerMinute,
        maxSeconds: c.maxSeconds,
      })
      .returning();
    return row;
  }

  async setCost(id: string, cost: number): Promise<void> {
    await this.db.update(calls).set({ cost }).where(eq(calls.id, id));
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
}
