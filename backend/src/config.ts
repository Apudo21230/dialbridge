import 'dotenv/config';

/**
 * Read a secret from the environment. Fails closed in production: if the value
 * is missing or weak, throw at startup rather than silently using a known
 * default. A dev/test fallback is used ONLY when NODE_ENV !== 'production'.
 */
function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to a strong value (>= 16 chars) in production`);
  }
  return devFallback;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://apple@localhost:5432/dialbridge_dev',
  adminSecret: requireSecret('ADMIN_SECRET', 'dev-admin-secret-change-me'),
  port: Number(process.env.PORT ?? 3000),
};
