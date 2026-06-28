import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../../src/auth/apiKey.js';

describe('apiKey util', () => {
  it('generates a prefixed key whose sha256 hash is reproducible', () => {
    const { raw, hash, prefix } = generateApiKey();
    expect(raw.startsWith('db_live_')).toBe(true);
    expect(prefix).toBe(raw.slice(0, 12));
    expect(hash).toBe(hashApiKey(raw));
    expect(hash).toHaveLength(64);
  });

  it('produces different raw keys each call', () => {
    expect(generateApiKey().raw).not.toBe(generateApiKey().raw);
  });
});
