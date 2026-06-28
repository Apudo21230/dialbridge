import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { adminUsers, type AdminUserRow } from '../db/schema.js';

export class AdminRepository {
  constructor(private readonly db: Db) {}

  async create(email: string, passwordHash: string, role = 'admin'): Promise<AdminUserRow> {
    const [row] = await this.db.insert(adminUsers).values({ email, passwordHash, role }).returning();
    return row;
  }

  async findByEmail(email: string): Promise<AdminUserRow | undefined> {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return row;
  }
}
