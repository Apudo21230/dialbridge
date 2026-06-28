import { eq, and, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { wallets, walletTransactions, type WalletRow } from '../db/schema.js';

export class WalletRepository {
  constructor(private readonly db: Db) {}

  async find(integratorId: string, userRef: string): Promise<WalletRow | undefined> {
    const [row] = await this.db
      .select()
      .from(wallets)
      .where(and(eq(wallets.integratorId, integratorId), eq(wallets.userRef, userRef)))
      .limit(1);
    return row;
  }

  async getOrCreate(integratorId: string, userRef: string): Promise<WalletRow> {
    const existing = await this.find(integratorId, userRef);
    if (existing) return existing;
    await this.db.insert(wallets).values({ integratorId, userRef }).onConflictDoNothing();
    return (await this.find(integratorId, userRef))!;
  }

  async credit(walletId: string, amount: number, refCallId?: string): Promise<WalletRow> {
    return this.adjust(walletId, amount, 'credit', refCallId);
  }

  async debit(walletId: string, amount: number, refCallId?: string): Promise<WalletRow> {
    return this.adjust(walletId, -amount, 'debit', refCallId);
  }

  private async adjust(walletId: string, delta: number, type: 'credit' | 'debit', refCallId?: string): Promise<WalletRow> {
    const [row] = await this.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${delta}` })
      .where(eq(wallets.id, walletId))
      .returning();
    await this.db.insert(walletTransactions).values({ walletId, type, amount: Math.abs(delta), refCallId });
    return row;
  }
}
