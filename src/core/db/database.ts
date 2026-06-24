/**
 * SQLCipher database lifecycle. Opens a single encrypted connection keyed from
 * the hardware Keystore, applies pragmas, and runs migrations. The opened DB is
 * cached so the rest of the app shares one connection.
 *
 * Security (plan Phase 1):
 *   - encryptionKey comes from {@link getDatabaseKey} → whole DB is AES-encrypted
 *     at rest. `adb pull` of the file is unreadable without the Keystore key (T2).
 *   - WAL mode for crash-safe atomic transactions (plan §4.2).
 *   - foreign_keys ON so REFERENCES constraints are enforced.
 */
import { open, isSQLCipher, type DB } from '@op-engineering/op-sqlite';
import { getDatabaseKey } from '@core/crypto';
import { logger } from '@lib/logger';
import { runMigrations } from './migrations';

const DB_NAME = 'privo.db';

let instance: DB | null = null;
let openPromise: Promise<DB> | null = null;

async function openAndPrepare(): Promise<DB> {
  if (!isSQLCipher()) {
    // The plain-SQLite build would silently store data unencrypted — refuse it.
    throw new Error(
      'op-sqlite is not built with SQLCipher. Encryption at rest is mandatory.',
    );
  }

  const key = await getDatabaseKey();
  const db = open({ name: DB_NAME, encryptionKey: key });

  await db.execute('PRAGMA journal_mode = WAL;');
  await db.execute('PRAGMA foreign_keys = ON;');

  const version = await runMigrations(db);
  logger.info('Database ready', { schemaVersion: version });

  return db;
}

/**
 * Returns the shared encrypted DB connection, opening it on first call.
 * Concurrent callers during startup share a single open operation.
 */
export function getDatabase(): Promise<DB> {
  if (instance) {
    return Promise.resolve(instance);
  }
  if (!openPromise) {
    openPromise = openAndPrepare()
      .then(db => {
        instance = db;
        return db;
      })
      .catch(error => {
        openPromise = null; // allow retry after a failed open
        throw error;
      });
  }
  return openPromise;
}

/** Closes the shared connection. Mainly for tests and explicit shutdown. */
export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
    openPromise = null;
  }
}
