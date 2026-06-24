/**
 * Time helpers. All timestamps in Privo are UTC epoch milliseconds (INTEGER) so
 * storage is timezone-safe (plan §3). Formatting for display happens at the UI
 * edge, never in logic.
 */

/** Current time as UTC epoch ms. The single source of "now" for the app. */
export function now(): number {
  return Date.now();
}

/** True if `value` is a plausible epoch-ms timestamp (positive integer). */
export function isValidEpochMs(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
