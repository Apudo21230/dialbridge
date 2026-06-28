import type { Db } from '../db/client.js';
import { auditLogs } from '../db/schema.js';

export interface AuditEntry {
  adminUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditRepository {
  constructor(private readonly db: Db) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      adminUserId: entry.adminUserId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    });
  }
}
