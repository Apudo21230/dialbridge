import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { createApp } from '../../src/app.js';
import { AdminService } from '../../src/admin/adminService.js';
import { AdminRepository } from '../../src/admin/adminRepository.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });

const ADMIN_EMAIL = 'admin@dialbridge.dev';
const ADMIN_PW = 'admin-password-123';
const validCall = { bookingId: 'b1', creatorNumber: '+919800000001', fanNumber: '+919800000002', record: true };

async function adminToken(): Promise<string> {
  await new AdminService(new AdminRepository(db)).seed(ADMIN_EMAIL, ADMIN_PW);
  const res = await request(app).post('/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PW });
  return res.body.token as string;
}

beforeEach(async () => {
  await db.execute(sql`truncate table audit_logs, api_keys, integrators, admin_users restart identity cascade`);
});
afterAll(async () => { await pool.end(); });

describe('admin console', () => {
  it('login: wrong creds 401, right creds returns token', async () => {
    await new AdminService(new AdminRepository(db)).seed(ADMIN_EMAIL, ADMIN_PW);
    expect((await request(app).post('/admin/login').send({ email: ADMIN_EMAIL, password: 'nope' })).status).toBe(401);
    const ok = await request(app).post('/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PW });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  it('admin endpoints require a token', async () => {
    expect((await request(app).get('/admin/integrators')).status).toBe(401);
  });

  it('creates an integrator; its key works on /calls; list + detail reflect it', async () => {
    const token = await adminToken();
    const create = await request(app).post('/admin/integrators').set('Authorization', `Bearer ${token}`).send({ name: 'Acme' });
    expect(create.status).toBe(201);
    expect(create.body.apiKey).toMatch(/^db_live_/);

    const call = await request(app).post('/calls').set('Authorization', `Bearer ${create.body.apiKey}`).send(validCall);
    expect(call.status).toBe(201);

    const list = await request(app).get('/admin/integrators').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.integrators).toHaveLength(1);
    expect(list.body.integrators[0].name).toBe('Acme');

    const detail = await request(app).get(`/admin/integrators/${create.body.integratorId}`).set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.keys).toHaveLength(1);
    expect(detail.body.keys[0].prefix).toMatch(/^db_live_/);
    expect(detail.body.keys[0]).not.toHaveProperty('keyHash');
  });

  it('suspend blocks /calls (403), activate restores it (201)', async () => {
    const token = await adminToken();
    const create = await request(app).post('/admin/integrators').set('Authorization', `Bearer ${token}`).send({ name: 'Acme' });
    const id = create.body.integratorId;
    const apiKey = create.body.apiKey;

    await request(app).post(`/admin/integrators/${id}/suspend`).set('Authorization', `Bearer ${token}`).expect(200);
    expect((await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(validCall)).status).toBe(403);

    await request(app).post(`/admin/integrators/${id}/activate`).set('Authorization', `Bearer ${token}`).expect(200);
    expect((await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send(validCall)).status).toBe(201);
  });

  it('rotates keys: issue new + revoke old; revoked key rejected, new key works', async () => {
    const token = await adminToken();
    const create = await request(app).post('/admin/integrators').set('Authorization', `Bearer ${token}`).send({ name: 'Acme' });
    const id = create.body.integratorId;
    const firstKey = create.body.apiKey;
    const firstKeyId = create.body.keyId;

    const issue = await request(app).post(`/admin/integrators/${id}/keys`).set('Authorization', `Bearer ${token}`).send({ label: 'server-2' });
    expect(issue.status).toBe(201);
    const secondKey = issue.body.apiKey;

    await request(app).post(`/admin/api-keys/${firstKeyId}/revoke`).set('Authorization', `Bearer ${token}`).expect(200);

    expect((await request(app).post('/calls').set('Authorization', `Bearer ${firstKey}`).send(validCall)).status).toBe(401);
    expect((await request(app).post('/calls').set('Authorization', `Bearer ${secondKey}`).send(validCall)).status).toBe(201);
  });

  it('writes an audit log entry for admin actions', async () => {
    const token = await adminToken();
    await request(app).post('/admin/integrators').set('Authorization', `Bearer ${token}`).send({ name: 'Acme' });
    const res = await db.execute(sql`select count(*)::int as c from audit_logs where action = 'integrator.create'`);
    expect(Number(res.rows[0].c)).toBeGreaterThanOrEqual(1);
  });
});
