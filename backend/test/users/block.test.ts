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

const callBody = {
  creatorNumber: '+919800000001',
  fanNumber: '+919800000002',
  userRef: 'fan-1',
  ratePerMinute: 1000,
};

beforeEach(async () => {
  await db.execute(
    sql`truncate table wallet_transactions, wallets, calls, end_users, audit_logs, api_keys, integrators, admin_users restart identity cascade`,
  );
});
afterAll(async () => { await pool.end(); });

describe('admin: block an end-user', () => {
  it('blocking cuts the active call and stops new ones (balance frozen); unblock restores', async () => {
    const token = await adminToken();
    const auth = { Authorization: `Bearer ${token}` };
    const created = await request(app).post('/admin/integrators').set(auth).send({ name: 'FanCall' });
    const id = created.body.integratorId as string;
    const akey = { Authorization: `Bearer ${created.body.apiKey}` };

    // fund + start a call → user is registered and active
    await request(app).post('/wallets/topup').set(akey).send({ userRef: 'fan-1', amount: 5000 });
    const call = await request(app).post('/calls').set(akey).send(callBody);
    expect(call.status).toBe(201);
    const callId = call.body.sessionId;

    const users1 = await request(app).get(`/admin/integrators/${id}/users`).set(auth);
    const u1 = users1.body.users.find((u: { userRef: string }) => u.userRef === 'fan-1');
    expect(u1.status).toBe('active');
    expect(u1.balance).toBe(5000);
    expect(u1.totalCalls).toBe(1);

    // block → cuts the active call
    const blocked = await request(app).post(`/admin/integrators/${id}/users/fan-1/block`).set(auth);
    expect(blocked.status).toBe(200);
    expect(blocked.body.status).toBe('blocked');
    expect(blocked.body.cutCalls).toContain(callId);

    // the call is now terminal
    const row = await request(app).get(`/calls/${callId}`).set(akey);
    expect(row.body.status).toBe('failed');

    // a NEW call is refused with 403 even though the wallet still holds balance
    const refused = await request(app).post('/calls').set(akey).send(callBody);
    expect(refused.status).toBe(403);

    const wallet = await request(app).get('/wallets/fan-1').set(akey);
    expect(wallet.body.balance).toBe(5000); // frozen, not refunded

    // unblock → new calls allowed again
    const unblocked = await request(app).post(`/admin/integrators/${id}/users/fan-1/unblock`).set(auth);
    expect(unblocked.body.status).toBe('active');
    const ok = await request(app).post('/calls').set(akey).send(callBody);
    expect(ok.status).toBe(201);
  });
});
