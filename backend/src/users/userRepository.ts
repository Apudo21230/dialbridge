import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { users, type UserRow, type NewUserRow } from '../db/schema.js';

export class UserRepository {
  constructor(private readonly db: Db) {}

  async create(data: NewUserRow): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(data).returning();
    return row;
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  }

  async findByPhone(phone: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return row;
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }
}
