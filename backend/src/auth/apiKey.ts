import { randomBytes, createHash } from 'node:crypto';

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString('base64url');
  const raw = `db_live_${secret}`;
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) };
}
