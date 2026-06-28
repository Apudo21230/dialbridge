import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';
import { signToken, verifyToken } from '../../src/auth/token.js';

describe('auth utils', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('s3cret');
    expect(hash).not.toBe('s3cret');
    expect(await verifyPassword('s3cret', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('signs and verifies a JWT round-trip', () => {
    const token = signToken({ sub: 'u1', role: 'fan' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('fan');
  });
});
