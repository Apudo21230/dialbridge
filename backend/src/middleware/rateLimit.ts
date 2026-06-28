import rateLimit from 'express-rate-limit';

/** General API limiter. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** Stricter limiter for auth-sensitive endpoints (brute-force / abuse). */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** Factory (used by tests / custom limits). */
export function makeLimiter(limit: number, windowMs = 60_000) {
  return rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false });
}
