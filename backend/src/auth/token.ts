import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AdminTokenPayload {
  sub: string;
  role: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '2h' });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as AdminTokenPayload;
  return { sub: String(decoded.sub), role: String(decoded.role) };
}
