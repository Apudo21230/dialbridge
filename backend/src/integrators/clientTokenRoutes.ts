import { Router, type RequestHandler } from 'express';
import { signClientToken } from '../auth/clientToken.js';

/**
 * POST /client-tokens — minted by the integrator's BACKEND (API-key protected).
 * Returns a short-lived token the mobile SDK uses; the raw API key never leaves the server.
 */
export function createClientTokenRouter(requireApiKey: RequestHandler): Router {
  const router = Router();

  router.post('/client-tokens', requireApiKey, (req, res) => {
    const userRef = typeof req.body?.userRef === 'string' ? req.body.userRef : undefined;
    const { token, expiresIn } = signClientToken({ integratorId: req.integrator!.id, userRef });
    res.status(201).json({ token, expiresIn });
  });

  return router;
}
