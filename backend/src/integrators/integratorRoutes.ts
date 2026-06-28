import { Router } from 'express';
import type { IntegratorService } from './integratorService.js';
import { config } from '../config.js';

export function createIntegratorRouter(service: IntegratorService): Router {
  const router = Router();

  // Admin-only onboarding. Returns the raw API key ONCE.
  router.post('/integrators', async (req, res) => {
    if (req.headers['x-admin-secret'] !== config.adminSecret) {
      res.status(401).json({ error: 'admin secret required' });
      return;
    }
    const { name } = req.body ?? {};
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const { integratorId, apiKey } = await service.onboard(name.trim());
    res.status(201).json({ integratorId, apiKey });
  });

  return router;
}
