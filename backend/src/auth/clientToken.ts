import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const TTL_SECONDS = 15 * 60;

export interface ClientTokenClaims {
  integratorId: string;
  userRef?: string;
}

export function signClientToken(claims: ClientTokenClaims): { token: string; expiresIn: number } {
  const token = jwt.sign(
    { typ: 'client', sub: claims.integratorId, userRef: claims.userRef },
    config.jwtSecret,
    { expiresIn: TTL_SECONDS },
  );
  return { token, expiresIn: TTL_SECONDS };
}

export function verifyClientToken(token: string): ClientTokenClaims | undefined {
  try {
    const d = jwt.verify(token, config.jwtSecret) as { typ?: string; sub?: string; userRef?: string };
    if (d.typ !== 'client' || !d.sub) return undefined;
    return { integratorId: String(d.sub), userRef: d.userRef };
  } catch {
    return undefined;
  }
}
