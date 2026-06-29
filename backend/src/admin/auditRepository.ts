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

  /** Best-effort: a failed audit write is logged but never fails the request it describes. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        adminUserId: entry.adminUserId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? null,
      });
    } catch (err) {
      console.warn('audit log failed', { action: entry.action, error: (err as Error).message });
    }
  }
}
