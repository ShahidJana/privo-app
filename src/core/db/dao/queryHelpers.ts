/**
 * Thin typed helpers over op-sqlite. DAOs use these so query results are typed
 * and every write goes through a transaction (golden rule §12.2).
 */
import type { Scalar, SqlExecutor, TransactionalExecutor } from '@core/db/types';

/** Runs a SELECT and returns rows cast to `T`. Caller owns correctness of `T`. */
export async function selectRows<T>(
  db: SqlExecutor,
  query: string,
  params?: Scalar[],
): Promise<T[]> {
  const result = await db.execute(query, params);
  return result.rows as T[];
}

/** Returns the first row of a SELECT, or `null` if there are none. */
export async function selectOne<T>(
  db: SqlExecutor,
  query: string,
  params?: Scalar[],
): Promise<T | null> {
  const rows = await selectRows<T>(db, query, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Runs a write and returns the number of affected rows. */
export async function execWrite(
  db: SqlExecutor,
  query: string,
  params?: Scalar[],
): Promise<number> {
  const result = await db.execute(query, params);
  return result.rowsAffected;
}

/**
 * Convenience wrapper around op-sqlite's `transaction` so DAOs read cleanly.
 * The callback receives the transaction executor.
 */
export function withTransaction(
  db: TransactionalExecutor,
  work: Parameters<TransactionalExecutor['transaction']>[0],
): Promise<void> {
  return db.transaction(work);
}
