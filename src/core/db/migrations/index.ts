/**
 * Migration runner. Uses SQLite's `PRAGMA user_version` as the source of truth.
 * Each migration runs inside its own transaction together with the version bump,
 * so a failure rolls back to a clean, consistent state (plan §4.2 / Challenges M2).
 */
import type { Scalar, TransactionalExecutor } from '@core/db/types';
import { logger } from '@lib/logger';
import { v1Initial } from './v1_initial';

/** Statement executor handed to a migration (a DB or a transaction). */
export interface MigrationExecutor {
  execute(query: string, params?: Scalar[]): Promise<unknown>;
}

/** A single forward/backward schema change. */
export interface Migration {
  version: number;
  up(tx: MigrationExecutor): Promise<void>;
  down(tx: MigrationExecutor): Promise<void>;
}

// Registered migrations in ascending version order. Append new ones here.
// The circular import with v1_initial is safe: it imports only the `Migration` type.
export const migrations: readonly Migration[] = [v1Initial];

/** Highest version known to this build of the app. */
export const LATEST_VERSION = migrations.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);

export async function getSchemaVersion(db: TransactionalExecutor): Promise<number> {
  const result = await db.execute('PRAGMA user_version;');
  const row = result.rows[0] as Record<string, Scalar> | undefined;
  const value = row ? row.user_version : 0;
  return Number(value ?? 0);
}

/**
 * Applies all migrations newer than the DB's current version, each in its own
 * transaction. Returns the resulting schema version.
 *
 * Throws on a downgrade (DB newer than the app) — the caller should block with a
 * "please update the app" message rather than risk corruption (plan §4.2).
 */
export async function runMigrations(db: TransactionalExecutor): Promise<number> {
  const current = await getSchemaVersion(db);

  if (current > LATEST_VERSION) {
    throw new Error(
      `Database schema v${current} is newer than app schema v${LATEST_VERSION}. Update the app.`,
    );
  }

  const pending = migrations
    .filter(m => m.version > current)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    logger.info('DB schema up to date', { version: current });
    return current;
  }

  for (const migration of pending) {
    await db.transaction(async tx => {
      await migration.up(tx);
      // PRAGMA user_version cannot be parameterised; version is an integer we own.
      await tx.execute(`PRAGMA user_version = ${migration.version};`);
    });
    logger.info('Applied migration', { version: migration.version });
  }

  return pending[pending.length - 1].version;
}
