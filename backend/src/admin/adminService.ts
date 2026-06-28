import type { AdminRepository } from './adminRepository.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signAdminToken } from '../auth/token.js';

export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  /** Idempotent seed of an admin (used by the db:seed-admin CLI). */
  async seed(email: string, password: string): Promise<void> {
    if (await this.repo.findByEmail(email)) return;
    await this.repo.create(email, await hashPassword(password));
  }

  async login(email: string, password: string): Promise<{ token: string } | undefined> {
    const admin = await this.repo.findByEmail(email);
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) return undefined;
    return { token: signAdminToken({ sub: admin.id, role: admin.role }) };
  }
}
