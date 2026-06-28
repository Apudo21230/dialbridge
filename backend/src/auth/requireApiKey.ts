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
    const header = req.headers.authorization ?? '';
    const [scheme, key] = header.split(' ');
    if (scheme !== 'Bearer' || !key) {
      res.status(401).json({ error: 'missing API key' });
      return;
    }
    const integrator = await service.authenticate(key);
    if (!integrator) {
      res.status(401).json({ error: 'invalid API key' });
      return;
    }
    req.integrator = integrator;
    next();
  };
}
