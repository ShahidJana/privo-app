/**
 * DB type surface. We define a minimal `SqlExecutor` interface that op-sqlite's
 * `DB`/`Transaction` both satisfy. Depending on this interface (instead of the
 * concrete library type) keeps the migration runner and DAOs unit-testable with
 * a plain in-memory fake — no native module required.
 */
import type { QueryResult, Scalar, Transaction } from '@op-engineering/op-sqlite';

export type { QueryResult, Scalar, Transaction };

/** Anything that can run a parameterised SQL statement. */
export interface SqlExecutor {
  execute(query: string, params?: Scalar[]): Promise<QueryResult>;
}

/** An executor that can also open transactions (op-sqlite `DB`). */
export interface TransactionalExecutor extends SqlExecutor {
  transaction(fn: (tx: Transaction) => Promise<void>): Promise<void>;
}

/** Strongly-typed row accessor over op-sqlite's untyped `rows`. */
export type Row<T> = T & Record<string, Scalar>;
