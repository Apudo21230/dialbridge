import { describe, it, expect, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';

const pool = createPool();
const db = createDb(pool);

afterAll(async () => { await pool.end(); });

describe('users table', () => {
  it('exists with the expected columns', async () => {
    const res = await db.execute(
      sql`select column_name from information_schema.columns where table_name = 'users' order by column_name`,
    );
    const cols = res.rows.map((r) => r.column_name as string);
    expect(cols).toEqual(['created_at', 'email', 'id', 'password_hash', 'phone', 'role']);
  });
});
