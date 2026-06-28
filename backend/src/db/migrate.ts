import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool, createDb } from './client.js';

const pool = createPool();
const db = createDb(pool);
await migrate(db, { migrationsFolder: './drizzle' });
await pool.end();
console.log('migrations applied');
