import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';

export type AuditRecord = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
};

export function logAudit(
  db: AppDatabase,
  entry: { userId?: string | null; userName?: string | null; action: string; entity?: string; entityId?: string; detail?: string },
): void {
  try {
    db.sqlite
      .prepare('INSERT INTO audit_log (id, user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), entry.userId ?? null, entry.userName ?? null, entry.action, entry.entity ?? null, entry.entityId ?? null, entry.detail ?? null);
  } catch {
    // audit must never block the business action
  }
}

export function listAuditLogs(db: AppDatabase, limit = 200): AuditRecord[] {
  const rows = db.sqlite
    .prepare('SELECT * FROM audit_log ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .all(Math.min(Math.max(limit, 1), 500)) as any[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id ?? null,
    userName: r.user_name ?? null,
    action: r.action,
    entity: r.entity ?? null,
    entityId: r.entity_id ?? null,
    detail: r.detail ?? null,
    createdAt: r.created_at,
  }));
}
