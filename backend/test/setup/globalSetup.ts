import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool, createDb } from '../../src/db/client.js';

export default async function globalSetup() {
  const pool = createPool();
  const db = createDb(pool);
  await migrate(db, { migrationsFolder: './drizzle' });
  await pool.end();
}
