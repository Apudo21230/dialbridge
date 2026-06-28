import { Router, type RequestHandler } from 'express';
import type { WalletRepository } from './walletRepository.js';
import type { CallService } from '../calls/callService.js';

/** Wallet management — integrator backend only (API key). Money in minor units (e.g. paise). */
export function createWalletRouter(wallets: WalletRepository, requireApiKey: RequestHandler, callService: CallService): Router {
  const router = Router();

  router.post('/wallets/topup', requireApiKey, async (req, res) => {
    const { userRef, amount } = req.body ?? {};
    if (typeof userRef !== 'string' || !userRef.trim() || !Number.isInteger(amount) || amount <= 0) {
      res.status(400).json({ error: 'userRef and a positive integer amount (minor units) are required' });
      return;
    }
    const wallet = await wallets.getOrCreate(req.integrator!.id, userRef.trim());
    const updated = await wallets.credit(wallet.id, amount);
    // A top-up extends any of this user's active calls (more balance → more talk time).
    const extendedCalls = await callService.extendActiveCallsForUser(req.integrator!.id, userRef.trim());
    res.status(200).json({
      userRef: updated.userRef,
      balance: updated.balance,
      currency: updated.currency,
      extendedCalls,
    });
  });

  router.get('/wallets/:userRef', requireApiKey, async (req, res) => {
    const wallet = await wallets.find(req.integrator!.id, req.params.userRef);
    if (!wallet) {
      res.status(404).json({ error: 'wallet not found' });
      return;
    }
    res.status(200).json({ userRef: wallet.userRef, balance: wallet.balance, currency: wallet.currency });
  });

  return router;
}
