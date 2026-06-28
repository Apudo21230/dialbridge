import { createPool, createDb } from './client.js';
import { AdminRepository } from '../admin/adminRepository.js';
import { AdminService } from '../admin/adminService.js';

const email = process.env.ADMIN_EMAIL ?? process.argv[2];
const password = process.env.ADMIN_PASSWORD ?? process.argv[3];

if (!email || !password) {
  console.error('usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=secret npm run db:seed-admin');
  process.exit(1);
}

const pool = createPool();
const service = new AdminService(new AdminRepository(createDb(pool)));
await service.seed(email, password);
await pool.end();
console.log(`admin seeded: ${email}`);
