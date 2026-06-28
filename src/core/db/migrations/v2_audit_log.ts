/**
 * Migration v2 — security audit log. A lightweight append-only feed of
 * security-relevant events (unlock / lock / reveal / create) shown on the
 * dashboard. Timestamps are UTC epoch ms; `detail` holds optional non-secret
 * context (e.g. an entry title). The table is capped by the repo, not here.
 */
import type { Migration } from './index';

const CREATE_AUDIT_LOG = `
  CREATE TABLE audit_log (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    detail     TEXT,
    created_at INTEGER NOT NULL
  );
`;

const CREATE_INDEX = `CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);`;

export const v2AuditLog: Migration = {
  version: 2,
  async up(tx) {
    await tx.execute(CREATE_AUDIT_LOG);
    await tx.execute(CREATE_INDEX);
  },
  async down(tx) {
    await tx.execute('DROP TABLE IF EXISTS audit_log;');
  },
};
