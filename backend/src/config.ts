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
  jwtSecret: requireSecret('JWT_SECRET', 'dev-jwt-secret-change-me-please'),
  webhookSecret: requireSecret('WEBHOOK_SECRET', 'dev-webhook-secret-change-me'),
  port: Number(process.env.PORT ?? 3000),
};

/** S3 recording storage — only configured when AWS_BUCKET is set (creds via the default AWS env chain). */
export const recordingStorage = process.env.AWS_BUCKET
  ? {
      region: process.env.AWS_REGION ?? 'ap-south-1',
      bucket: process.env.AWS_BUCKET,
      folder: process.env.AWS_FOLDER ?? '',
    }
  : undefined;
