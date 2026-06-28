import type { Request, Response, NextFunction } from 'express';
import type { IntegratorService } from '../integrators/integratorService.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      integrator?: { id: string };
    }
  }
}

export function createRequireApiKey(service: IntegratorService) {
  return async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    const [scheme, key] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !key) {
      res.status(401).json({ error: 'missing API key' });
      return;
    }
    const result = await service.authenticate(key);
    if (!result) {
      res.status(401).json({ error: 'invalid API key' });
      return;
    }
    if ('suspended' in result) {
      res.status(403).json({ error: 'integrator suspended' });
      return;
    }
    req.integrator = { id: result.integratorId };
    next();
  };
}
