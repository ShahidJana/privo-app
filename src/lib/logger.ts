/**
 * Sanitizing logger. The ONLY approved logging path in the app.
 *
 * Golden rule (plan §12.9): never log sensitive input. This wrapper redacts
 * known-sensitive keys before anything reaches the console or a crash report,
 * so an accidental `logger.info('saving', vaultRow)` cannot leak a secret.
 *
 * Raw `console.*` is banned in production code — use this instead.
 */

/** Substrings that, if present in an object key, get redacted. */
const SENSITIVE_KEY_PARTS = [
  'secret',
  'iv',
  'tag',
  'password',
  'passcode',
  'pin',
  'key',
  'token',
  'mac',
  'cipher',
  'plaintext',
  'encryptionkey',
];

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 4;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some(part => lower.includes(part));
}

/**
 * Recursively redact sensitive fields. Returns a structurally-similar copy that
 * is safe to print. Cycles and very deep objects are truncated defensively.
 */
export function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return '[Truncated]';
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitize(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitize(val, depth + 1),
    ]),
  );
}

export interface Logger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}

/* eslint-disable no-console */
export const logger: Logger = {
  info(message, data) {
    if (__DEV__) {
      console.log(`[privo] ${message}`, data === undefined ? '' : sanitize(data));
    }
    // Production: forward a sanitized breadcrumb to Sentry once it is wired up.
  },
  warn(message, data) {
    if (__DEV__) {
      console.warn(`[privo] ${message}`, data === undefined ? '' : sanitize(data));
    }
  },
  error(message, error) {
    if (__DEV__) {
      console.error(`[privo] ${message}`, error);
    }
    // Production: Sentry.captureException(error, { extra: { message } }).
  },
};
/* eslint-enable no-console */
