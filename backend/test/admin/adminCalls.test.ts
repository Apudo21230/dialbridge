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

async function adminToken(): Promise<string> {
  await new AdminService(new AdminRepository(db)).seed(ADMIN_EMAIL, ADMIN_PW);
  const res = await request(app).post('/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PW });
  return res.body.token as string;
}

beforeEach(async () => {
  await db.execute(
    sql`truncate table wallet_transactions, wallets, calls, audit_logs, api_keys, integrators, admin_users restart identity cascade`,
  );
});
afterAll(async () => { await pool.end(); });

describe('admin: calls + overview', () => {
  it("lists every integrator's calls and aggregates the overview", async () => {
    const token = await adminToken();
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post('/admin/integrators').set(auth).send({ name: 'Acme' });
    expect(created.status).toBe(201);
    const apiKey = created.body.apiKey as string;

    // fund a user and place a billed masked call
    await request(app).post('/wallets/topup').set('Authorization', `Bearer ${apiKey}`).send({ userRef: 'fan-1', amount: 5000 });
    const call = await request(app).post('/calls').set('Authorization', `Bearer ${apiKey}`).send({
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      userRef: 'fan-1',
      ratePerMinute: 1000,
    });
    expect(call.body.sessionId).toBeTruthy();

    const ov = await request(app).get('/admin/overview').set(auth);
    expect(ov.status).toBe(200);
    expect(ov.body.integrators).toBe(1);
    expect(ov.body.calls).toBe(1);
    expect(ov.body.activeCalls).toBe(1);

    const list = await request(app).get('/admin/calls').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.calls).toHaveLength(1);
    expect(list.body.calls[0].integratorName).toBe('Acme');
    expect(list.body.calls[0].userRef).toBe('fan-1');
    expect(list.body.calls[0].status).toBe('ringing');
  });

  it('requires an admin token', async () => {
    expect((await request(app).get('/admin/calls')).status).toBe(401);
    expect((await request(app).get('/admin/overview')).status).toBe(401);
  });
});
