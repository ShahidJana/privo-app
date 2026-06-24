/**
 * Migration v1 — initial schema (plan §3). Creates every table, index and the
 * meta seed in one transaction. All timestamps are UTC epoch ms (INTEGER), all
 * money is integer paisa, every entity is soft-deletable via `deleted_at`.
 */
import type { Migration } from './index';

const CREATE_META = `
  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const CREATE_DOCUMENTS = `
  CREATE TABLE documents (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    category      TEXT NOT NULL CHECK(category IN ('educational','personal')),
    doc_type      TEXT,
    file_uri      TEXT,
    file_hash     TEXT,
    file_size_kb  INTEGER,
    expiry_date   INTEGER,
    notes         TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,
    deleted_at    INTEGER
  );
`;

const CREATE_PERSONS = `
  CREATE TABLE persons (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT,
    created_at INTEGER NOT NULL
  );
`;

const CREATE_UDHAAR = `
  CREATE TABLE udhaar (
    id          TEXT PRIMARY KEY,
    person_id   TEXT NOT NULL REFERENCES persons(id),
    amount      INTEGER NOT NULL CHECK(amount > 0),
    direction   TEXT NOT NULL CHECK(direction IN ('lena','dena')),
    currency    TEXT NOT NULL DEFAULT 'PKR',
    date        INTEGER NOT NULL,
    return_date INTEGER,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','partial','settled')),
    note        TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER
  );
`;

const CREATE_UDHAAR_PAYMENTS = `
  CREATE TABLE udhaar_payments (
    id         TEXT PRIMARY KEY,
    udhaar_id  TEXT NOT NULL REFERENCES udhaar(id),
    amount     INTEGER NOT NULL CHECK(amount > 0),
    date       INTEGER NOT NULL,
    note       TEXT,
    created_at INTEGER NOT NULL
  );
`;

const CREATE_VAULT = `
  CREATE TABLE vault (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    username    TEXT,
    secret_enc  TEXT NOT NULL,
    iv          TEXT NOT NULL,
    tag         TEXT NOT NULL,
    category    TEXT,
    url         TEXT,
    notes_enc   TEXT,
    enc_version INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER
  );
`;

const CREATE_INDEXES = [
  `CREATE INDEX idx_documents_category ON documents(category) WHERE deleted_at IS NULL;`,
  `CREATE INDEX idx_documents_expiry ON documents(expiry_date) WHERE deleted_at IS NULL;`,
  `CREATE INDEX idx_udhaar_person ON udhaar(person_id) WHERE deleted_at IS NULL;`,
  `CREATE INDEX idx_udhaar_status ON udhaar(status) WHERE deleted_at IS NULL;`,
  `CREATE INDEX idx_udhaar_return ON udhaar(return_date) WHERE deleted_at IS NULL AND status != 'settled';`,
  `CREATE INDEX idx_udhaar_payments_udhaar ON udhaar_payments(udhaar_id);`,
  `CREATE INDEX idx_vault_category ON vault(category) WHERE deleted_at IS NULL;`,
];

/** Seed values for the meta table. Defaults match the plan's onboarding spec. */
const SEED_META: ReadonlyArray<[string, string]> = [
  ['schema_version', '1'],
  ['app_lock_enabled', 'true'],
  ['lock_timeout_seconds', '30'],
  ['wipe_after_attempts', '0'], // 0 = disabled
  ['onboarding_complete', 'false'],
];

export const v1Initial: Migration = {
  version: 1,
  async up(tx) {
    await tx.execute(CREATE_META);
    await tx.execute(CREATE_DOCUMENTS);
    await tx.execute(CREATE_PERSONS);
    await tx.execute(CREATE_UDHAAR);
    await tx.execute(CREATE_UDHAAR_PAYMENTS);
    await tx.execute(CREATE_VAULT);
    for (const indexSql of CREATE_INDEXES) {
      await tx.execute(indexSql);
    }
    for (const [key, value] of SEED_META) {
      await tx.execute('INSERT INTO meta (key, value) VALUES (?, ?);', [key, value]);
    }
  },
  async down(tx) {
    for (const table of [
      'vault',
      'udhaar_payments',
      'udhaar',
      'persons',
      'documents',
      'meta',
    ]) {
      await tx.execute(`DROP TABLE IF EXISTS ${table};`);
    }
  },
};
