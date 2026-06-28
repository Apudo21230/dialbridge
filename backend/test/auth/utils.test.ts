import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/auth/token.js';

describe('token util', () => {
  it('signs and verifies a JWT round-trip', () => {
    const token = signToken({ sub: 'u1', role: 'integrator' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('integrator');
  });
});
