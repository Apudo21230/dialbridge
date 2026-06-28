import { eq, and, isNull, or, lt, ilike, desc, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { integrators, apiKeys, type IntegratorRow, type ApiKeyRow } from '../db/schema.js';

export interface ListParams {
  limit: number;
  cursor?: { createdAt: string; id: string };
  status?: string;
  search?: string;
}

export class IntegratorRepository {
  constructor(private readonly db: Db) {}

  async create(name: string): Promise<IntegratorRow> {
    const [row] = await this.db.insert(integrators).values({ name }).returning();
    return row;
  }

  async findById(id: string): Promise<IntegratorRow | undefined> {
    const [row] = await this.db.select().from(integrators).where(eq(integrators.id, id)).limit(1);
    return row;
  }

  async setStatus(id: string, status: string): Promise<IntegratorRow | undefined> {
    const [row] = await this.db.update(integrators).set({ status }).where(eq(integrators.id, id)).returning();
    return row;
  }

  /** Keyset (cursor) pagination, newest first, with optional status filter + name search. */
  async list(params: ListParams): Promise<IntegratorRow[]> {
    const conds = [];
    if (params.status) conds.push(eq(integrators.status, params.status));
    if (params.search) conds.push(ilike(integrators.name, `%${params.search}%`));
    if (params.cursor) {
      const c = new Date(params.cursor.createdAt);
      conds.push(
        or(lt(integrators.createdAt, c), and(eq(integrators.createdAt, c), lt(integrators.id, params.cursor.id))),
      );
    }
    return this.db
      .select()
      .from(integrators)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(integrators.createdAt), desc(integrators.id))
      .limit(params.limit);
  }

  async addApiKey(integratorId: string, keyHash: string, prefix: string, label = 'default'): Promise<ApiKeyRow> {
    const [row] = await this.db.insert(apiKeys).values({ integratorId, keyHash, prefix, label }).returning();
    return row;
  }

  async listApiKeys(integratorId: string): Promise<ApiKeyRow[]> {
    return this.db.select().from(apiKeys).where(eq(apiKeys.integratorId, integratorId)).orderBy(desc(apiKeys.createdAt));
  }

  async revokeApiKey(keyId: string): Promise<ApiKeyRow | undefined> {
    const [row] = await this.db
      .update(apiKeys)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)))
      .returning();
    return row;
  }

  /** Auth lookup: a non-revoked key joined to its integrator. */
  async findKeyWithIntegrator(keyHash: string): Promise<{ key: ApiKeyRow; integrator: IntegratorRow } | undefined> {
    const [row] = await this.db
      .select({ key: apiKeys, integrator: integrators })
      .from(apiKeys)
      .innerJoin(integrators, eq(apiKeys.integratorId, integrators.id))
      .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
      .limit(1);
    return row ? { key: row.key, integrator: row.integrator } : undefined;
  }

  async touchApiKey(keyId: string): Promise<void> {
    await this.db.update(apiKeys).set({ lastUsedAt: sql`now()` }).where(eq(apiKeys.id, keyId));
  }
}
