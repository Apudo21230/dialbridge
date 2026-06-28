import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface TokenPayload {
  sub: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
  return { sub: String(decoded.sub), role: String(decoded.role) };
}
