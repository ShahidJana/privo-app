/**
 * App-wide domain errors. Typed errors let hooks/UI react specifically:
 * NotFound → "deleted elsewhere", Validation → show field issues, etc.
 */

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** A requested entity does not exist (or is soft-deleted). */
export class NotFoundError extends AppError {
  constructor(
    readonly entity: string,
    readonly id: string,
  ) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

/**
 * The operation conflicts with current state (e.g. deleting a person who still
 * has active debts). Caller should surface an actionable message.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Input failed schema validation before reaching the DB (Challenges S3).
 * `issues` carries the structured validation failures (e.g. Zod issues).
 */
export class ValidationError extends AppError {
  readonly issues: unknown;

  constructor(message: string, source?: { issues?: unknown }) {
    super(message);
    this.name = 'ValidationError';
    this.issues = source?.issues;
  }
}
