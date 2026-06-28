import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { createApp } from '../../src/app.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });

beforeEach(async () => { await db.execute(sql`truncate table users restart identity cascade`); });
afterAll(async () => { await pool.end(); });

describe('email auth', () => {
  it('signs up then logs in', async () => {
    const signup = await request(app).post('/auth/signup').send({ email: 'a@b.com', password: 'pw123456', role: 'creator' });
    expect(signup.status).toBe(201);
    expect(signup.body.token).toBeTruthy();
    expect(signup.body.user.role).toBe('creator');

    const login = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'pw123456' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  it('rejects duplicate signup and bad login', async () => {
    await request(app).post('/auth/signup').send({ email: 'a@b.com', password: 'pw123456' });
    const dup = await request(app).post('/auth/signup').send({ email: 'a@b.com', password: 'pw123456' });
    expect(dup.status).toBe(400);
    const bad = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });
});
