/**
 * Migration runner — version tracking, idempotency, downgrade guard, and
 * transactional rollback on failure (plan §4.2, Challenges M2).
 *
 * Uses an in-memory fake that satisfies TransactionalExecutor — no native DB.
 */
import {
  runMigrations,
  getSchemaVersion,
  LATEST_VERSION,
} from '@core/db/migrations';
import type {
  QueryResult,
  Scalar,
  TransactionalExecutor,
  Transaction,
} from '@core/db/types';

const SET_VERSION = /PRAGMA user_version\s*=\s*(\d+)/i;
const GET_VERSION = /PRAGMA user_version\s*;?\s*$/i;

/** Minimal in-memory SQL executor that models user_version + transaction rollback. */
class FakeDb implements TransactionalExecutor {
  userVersion = 0;
  executed: string[] = [];
  /** If set, execute() throws when a statement matches this substring. */
  failOn: string | null = null;

  execute(query: string, _params?: Scalar[]): Promise<QueryResult> {
    this.executed.push(query.trim());

    if (this.failOn && query.includes(this.failOn)) {
      return Promise.reject(new Error(`simulated failure on: ${this.failOn}`));
    }

    const setMatch = SET_VERSION.exec(query);
    if (setMatch) {
      this.userVersion = Number(setMatch[1]);
      return Promise.resolve({ rows: [], rowsAffected: 0 });
    }
    if (GET_VERSION.test(query)) {
      return Promise.resolve({
        rows: [{ user_version: this.userVersion }],
        rowsAffected: 0,
      });
    }
    return Promise.resolve({ rows: [], rowsAffected: 0 });
  }

  async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    const versionSnapshot = this.userVersion;
    const logSnapshot = [...this.executed];
    try {
      // The transaction shares this executor; that is enough for the runner.
      await fn(this as unknown as Transaction);
    } catch (error) {
      this.userVersion = versionSnapshot;
      this.executed = logSnapshot;
      throw error;
    }
  }
}

describe('runMigrations', () => {
  it('applies all migrations on a fresh database', async () => {
    const db = new FakeDb();
    const version = await runMigrations(db);

    expect(version).toBe(LATEST_VERSION);
    expect(await getSchemaVersion(db)).toBe(LATEST_VERSION);
  });

  it('seeds the meta table and creates core tables', async () => {
    const db = new FakeDb();
    await runMigrations(db);
    const sql = db.executed.join('\n');

    expect(sql).toContain('CREATE TABLE meta');
    expect(sql).toContain('CREATE TABLE vault');
    expect(sql).toContain('CREATE TABLE udhaar');
    // Seed values are bound as parameters (not inlined), so assert on the
    // statement shape and count rather than the parameter values.
    const metaInserts = db.executed.filter(s => s.startsWith('INSERT INTO meta'));
    expect(metaInserts.length).toBe(5);
  });

  it('is idempotent — a second run applies nothing', async () => {
    const db = new FakeDb();
    await runMigrations(db);
    const countAfterFirst = db.executed.length;

    await runMigrations(db);
    const newStatements = db.executed.slice(countAfterFirst);

    // Only the version probe should run on the second pass.
    expect(newStatements.every(s => /PRAGMA user_version/i.test(s))).toBe(true);
  });

  it('rejects a downgrade (DB newer than app)', async () => {
    const db = new FakeDb();
    db.userVersion = LATEST_VERSION + 5;

    await expect(runMigrations(db)).rejects.toThrow(/newer than app/i);
  });

  it('rolls back the version bump if a migration fails', async () => {
    const db = new FakeDb();
    db.failOn = 'CREATE TABLE vault';

    await expect(runMigrations(db)).rejects.toThrow(/simulated failure/);
    // Transaction rolled back → version untouched.
    expect(db.userVersion).toBe(0);
  });
});
