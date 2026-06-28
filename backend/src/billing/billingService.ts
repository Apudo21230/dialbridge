import type { WalletRepository } from './walletRepository.js';

/** Platform-owned per-minute billing against an end-user's prepaid wallet. Money in minor units. */
export class BillingService {
  constructor(private readonly wallets: WalletRepository) {}

  /**
   * How long the current balance affords, for the provider to auto-cut at.
   * Throws 'insufficient balance' if it can't afford at least 1 second.
   */
  async precheck(integratorId: string, userRef: string, ratePerMinute: number): Promise<{ maxSeconds: number }> {
    if (!Number.isFinite(ratePerMinute) || ratePerMinute <= 0) throw new Error('rate must be positive');
    const wallet = await this.wallets.getOrCreate(integratorId, userRef);
    const maxSeconds = Math.floor((wallet.balance / ratePerMinute) * 60);
    if (maxSeconds < 1) throw new Error('insufficient balance');
    return { maxSeconds };
  }

  /** Deduct the actual cost (whole minutes) on call end, capped at the balance. Returns the cost charged. */
  async finalize(integratorId: string, userRef: string, ratePerMinute: number, billableSeconds: number, callId: string): Promise<number> {
    const wallet = await this.wallets.find(integratorId, userRef);
    if (!wallet) return 0;
    const minutes = Math.ceil(billableSeconds / 60);
    const cost = Math.min(minutes * ratePerMinute, wallet.balance);
    if (cost > 0) await this.wallets.debit(wallet.id, cost, callId);
    return cost;
  }
}
