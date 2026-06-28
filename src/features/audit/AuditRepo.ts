/**
 * AuditRepo — persistence for the security audit log. Append-only from the app's
 * point of view; the table is self-capped to the most recent {@link MAX_ROWS}
 * events so it can't grow unbounded. Clock/id are injected for testability.
 */
import { selectRows } from '@core/db/dao/queryHelpers';
import type { TransactionalExecutor } from '@core/db/types';
import { newId } from '@lib/uuid';
import { now } from '@lib/date';
import type { AuditEvent, AuditEventType, AuditRow } from './audit.types';

const MAX_ROWS = 200;

export interface AuditRepoDeps {
  now(): number;
  newId(): string;
}

function rowToEvent(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    type: row.type as AuditEventType,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export class AuditRepo {
  constructor(
    private readonly db: TransactionalExecutor,
    private readonly deps: AuditRepoDeps,
  ) {}

  /** Appends an event, then trims the table back to the newest MAX_ROWS rows. */
  async record(type: AuditEventType, detail?: string | null): Promise<void> {
    const id = this.deps.newId();
    const ts = this.deps.now();
    await this.db.transaction(async tx => {
      await tx.execute(
        'INSERT INTO audit_log (id, type, detail, created_at) VALUES (?, ?, ?, ?)',
        [id, type, detail ?? null, ts],
      );
      await tx.execute(
        `DELETE FROM audit_log WHERE id NOT IN (
           SELECT id FROM audit_log ORDER BY created_at DESC LIMIT ?
         )`,
        [MAX_ROWS],
      );
    });
  }

  /** Most recent events first. */
  async list(limit = 20): Promise<AuditEvent[]> {
    const rows = await selectRows<AuditRow>(
      this.db,
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    return rows.map(rowToEvent);
  }
}

/** Production-wired repo: system clock and UUIDs. */
export function createAuditRepo(db: TransactionalExecutor): AuditRepo {
  return new AuditRepo(db, { now, newId });
}
