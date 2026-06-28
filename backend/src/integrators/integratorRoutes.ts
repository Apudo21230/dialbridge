import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { IntegratorService } from './integratorService.js';
import { config } from '../config.js';

function adminSecretOk(provided: unknown): boolean {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(config.adminSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createIntegratorRouter(service: IntegratorService): Router {
  const router = Router();

  // Admin-only onboarding. Returns the raw API key ONCE.
  router.post('/integrators', async (req, res) => {
    if (!adminSecretOk(req.headers['x-admin-secret'])) {
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
