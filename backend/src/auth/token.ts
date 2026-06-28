import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AdminTokenPayload {
  sub: string;
  role: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign({ typ: 'admin', sub: payload.sub, role: payload.role }, config.jwtSecret, { expiresIn: '2h' });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as { typ?: string; sub?: string; role?: string };
  if (decoded.typ !== 'admin') {
    throw new Error('not an admin token');
  }
  return { sub: String(decoded.sub), role: String(decoded.role) };
}
