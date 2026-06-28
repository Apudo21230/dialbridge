import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from './token.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: { sub: string; role: string };
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'admin auth required' });
    return;
  }
  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'invalid admin token' });
  }
}
