/**
 * Security audit log types. Events are recorded as security-relevant actions
 * happen (vault unlock/lock, secret reveal, entry creation) and surfaced on the
 * dashboard. `detail` is optional, non-secret context only.
 */

export type AuditEventType =
  | 'vault_unlocked'
  | 'vault_unlock_failed'
  | 'vault_locked'
  | 'vault_entry_created'
  | 'secret_revealed';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  detail: string | null;
  createdAt: number;
}

/** Raw DB row shape for the `audit_log` table. */
export interface AuditRow {
  id: string;
  type: string;
  detail: string | null;
  created_at: number;
}
