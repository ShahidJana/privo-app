/**
 * DB core public surface.
 */
export { getDatabase, closeDatabase } from './database';
export {
  runMigrations,
  getSchemaVersion,
  migrations,
  LATEST_VERSION,
  type Migration,
  type MigrationExecutor,
} from './migrations';
export {
  selectRows,
  selectOne,
  execWrite,
  withTransaction,
} from './dao/queryHelpers';
export type {
  SqlExecutor,
  TransactionalExecutor,
  QueryResult,
  Scalar,
  Transaction,
  Row,
} from './types';
