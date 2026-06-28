import type { Request, Response, NextFunction } from 'express';
import type { IntegratorService } from '../integrators/integratorService.js';

/**
 * Authenticates an API caller by EITHER an integrator API key (`db_live_…`,
 * server-to-server) OR a short-lived client token (from the mobile SDK).
 * Both must resolve to an active integrator. Sets `req.integrator`.
 */
export function createRequireCaller(service: IntegratorService) {
  return async function requireCaller(req: Request, res: Response, next: NextFunction): Promise<void> {
    const [scheme, credential] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !credential) {
      res.status(401).json({ error: 'missing credential' });
      return;
    }

    const result = credential.startsWith('db_live_')
      ? await service.authenticate(credential)
      : await service.authenticateClientToken(credential);

    if (!result) {
      res.status(401).json({ error: 'invalid credential' });
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
