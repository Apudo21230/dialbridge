import { describe, it, expect } from 'vitest';
import { isCallStatus } from '../../src/telephony/types.js';

describe('isCallStatus', () => {
  it('accepts valid statuses and rejects others', () => {
    expect(isCallStatus('ringing')).toBe(true);
    expect(isCallStatus('in_progress')).toBe(true);
    expect(isCallStatus('banana')).toBe(false);
  });
});
