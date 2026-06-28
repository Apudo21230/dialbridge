import { eq, and, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { integrators, apiKeys, type IntegratorRow } from '../db/schema.js';

export class IntegratorRepository {
  constructor(private readonly db: Db) {}

  async create(name: string): Promise<IntegratorRow> {
    const [row] = await this.db.insert(integrators).values({ name }).returning();
    return row;
  }

  async addApiKey(integratorId: string, keyHash: string, prefix: string): Promise<void> {
    await this.db.insert(apiKeys).values({ integratorId, keyHash, prefix });
  }

  async findIntegratorByKeyHash(keyHash: string): Promise<IntegratorRow | undefined> {
    const [row] = await this.db
      .select({ integrator: integrators })
      .from(apiKeys)
      .innerJoin(integrators, eq(apiKeys.integratorId, integrators.id))
      .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
      .limit(1);
    return row?.integrator;
  }
}
