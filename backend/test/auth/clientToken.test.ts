import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../../src/db/client.js';
import { createApp } from '../../src/app.js';
import { IntegratorService } from '../../src/integrators/integratorService.js';
import { IntegratorRepository } from '../../src/integrators/integratorRepository.js';
import { AdminService } from '../../src/admin/adminService.js';
import { AdminRepository } from '../../src/admin/adminRepository.js';

const pool = createPool();
const db = createDb(pool);
const app = createApp({ db });
const validCall = { bookingId: 'b1', creatorNumber: '+919800000001', fanNumber: '+919800000002' };

async function onboard(): Promise<{ apiKey: string; integratorId: string }> {
  const r = await new IntegratorService(new IntegratorRepository(db)).onboard('Acme');
  return { apiKey: r.apiKey, integratorId: r.integratorId };
}

beforeEach(async () => {
  await db.execute(sql`truncate table audit_logs, api_keys, integrators, admin_users restart identity cascade`);
});
afterAll(async () => { await pool.end(); });

describe('client tokens', () => {
  it('mints a client token via API key; the token authenticates /calls', async () => {
    const { apiKey } = await onboard();
    const mint = await request(app).post('/client-tokens').set('Authorization', `Bearer ${apiKey}`).send({ userRef: 'u1' });
    expect(mint.status).toBe(201);
    expect(mint.body.token).toBeTruthy();
    expect(mint.body.expiresIn).toBeGreaterThan(0);

    const call = await request(app).post('/calls').set('Authorization', `Bearer ${mint.body.token}`).send(validCall);
    expect(call.status).toBe(201);
  });

  it('minting requires an API key (a client token cannot mint, and no-auth is rejected)', async () => {
    const { apiKey } = await onboard();
    const mint = await request(app).post('/client-tokens').set('Authorization', `Bearer ${apiKey}`).send({});
    const clientToken = mint.body.token as string;

    expect((await request(app).post('/client-tokens').set('Authorization', `Bearer ${clientToken}`).send({})).status).toBe(401);
    expect((await request(app).post('/client-tokens').send({})).status).toBe(401);
  });

  it('a suspended integrator: its client token is rejected on /calls (403)', async () => {
    const { apiKey, integratorId } = await onboard();
    const mint = await request(app).post('/client-tokens').set('Authorization', `Bearer ${apiKey}`).send({});
    await new IntegratorRepository(db).setStatus(integratorId, 'suspended');
    const call = await request(app).post('/calls').set('Authorization', `Bearer ${mint.body.token}`).send(validCall);
    expect(call.status).toBe(403);
  });

  it('an admin token cannot be used on /calls', async () => {
    await new AdminService(new AdminRepository(db)).seed('a@b.com', 'admin-password-123');
    const login = await request(app).post('/admin/login').send({ email: 'a@b.com', password: 'admin-password-123' });
    const call = await request(app).post('/calls').set('Authorization', `Bearer ${login.body.token}`).send(validCall);
    expect(call.status).toBe(401);
  });
});
