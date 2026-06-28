import { eq, and, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { endUsers, wallets, calls, type EndUserRow } from '../db/schema.js';

export interface EndUserSummary {
  userRef: string;
  status: string;
  balance: number; // minor units (paise)
  totalCalls: number;
  lastCallAt: string | null;
}

export class EndUserRepository {
  constructor(private readonly db: Db) {}

  /** Register the user on first sight (call or top-up). Idempotent; returns the row. */
  async ensure(integratorId: string, userRef: string): Promise<EndUserRow> {
    await this.db.insert(endUsers).values({ integratorId, userRef }).onConflictDoNothing();
    const row = await this.find(integratorId, userRef);
    return row!;
  }

  async find(integratorId: string, userRef: string): Promise<EndUserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(endUsers)
      .where(and(eq(endUsers.integratorId, integratorId), eq(endUsers.userRef, userRef)))
      .limit(1);
    return row;
  }

  async setStatus(integratorId: string, userRef: string, status: 'active' | 'blocked'): Promise<EndUserRow | undefined> {
    const [row] = await this.db
      .update(endUsers)
      .set({ status })
      .where(and(eq(endUsers.integratorId, integratorId), eq(endUsers.userRef, userRef)))
      .returning();
    return row;
  }

  /** Every end-user of an integrator, with wallet balance + call activity, busiest first. */
  async listByIntegrator(integratorId: string): Promise<EndUserSummary[]> {
    const rows = await this.db
      .select({
        userRef: endUsers.userRef,
        status: endUsers.status,
        balance: sql<number>`coalesce(${wallets.balance}, 0)`,
        totalCalls: sql<number>`count(${calls.id})`,
        lastCallAt: sql<string | null>`max(${calls.createdAt})`,
      })
      .from(endUsers)
      .leftJoin(
        wallets,
        and(eq(wallets.integratorId, endUsers.integratorId), eq(wallets.userRef, endUsers.userRef)),
      )
      .leftJoin(
        calls,
        and(eq(calls.integratorId, endUsers.integratorId), eq(calls.userRef, endUsers.userRef)),
      )
      .where(eq(endUsers.integratorId, integratorId))
      .groupBy(endUsers.userRef, endUsers.status, wallets.balance)
      .orderBy(sql`max(${calls.createdAt}) desc nulls last`);
    return rows.map((r) => ({
      userRef: r.userRef,
      status: r.status,
      balance: Number(r.balance),
      totalCalls: Number(r.totalCalls),
      lastCallAt: r.lastCallAt,
    }));
  }
}
