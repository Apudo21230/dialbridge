import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { UserRepository } from '../../src/users/userRepository.js';

const pool = createPool();
const db = createDb(pool);
const repo = new UserRepository(db);

beforeEach(async () => { await db.execute(sql`truncate table users restart identity cascade`); });
afterAll(async () => { await pool.end(); });

describe('UserRepository', () => {
  it('creates and finds a user by email', async () => {
    const created = await repo.create({ email: 'a@b.com', passwordHash: 'h', role: 'fan' });
    expect(created.id).toBeTruthy();
    const found = await repo.findByEmail('a@b.com');
    expect(found?.id).toBe(created.id);
  });

  it('finds by phone and id, returns undefined when absent', async () => {
    const created = await repo.create({ phone: '+919800000001', role: 'creator' });
    expect((await repo.findByPhone('+919800000001'))?.id).toBe(created.id);
    expect((await repo.findById(created.id))?.role).toBe('creator');
    expect(await repo.findByEmail('missing@x.com')).toBeUndefined();
  });
});
