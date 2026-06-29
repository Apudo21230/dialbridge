import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config.js';
import * as schema from './schema.js';

/**
 * TLS for managed Postgres. Off by default (local/test). `DATABASE_SSL=true`
 * uses a VERIFIED connection (system CAs). Only use `no-verify` if your provider
 * serves a self-signed cert you can't add to the trust store — it's explicit and
 * named so you never disable verification by accident.
 */
function poolSsl(): pg.PoolConfig['ssl'] {
  switch (process.env.DATABASE_SSL) {
    case 'true':
    case 'require':
      return true;
    case 'no-verify':
      return { rejectUnauthorized: false };
    default:
      return undefined;
  }
}

export function createPool(url: string = config.databaseUrl): pg.Pool {
  return new pg.Pool({ connectionString: url, ssl: poolSsl() });
}

export function createDb(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
