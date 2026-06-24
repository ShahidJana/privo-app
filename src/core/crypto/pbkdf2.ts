/**
 * Password-based key derivation. Two uses:
 *   1. Encrypted backup/export keys (plan Phase 6) — high iteration count.
 *   2. Fallback DB key derivation when the hardware Keystore is unavailable
 *      (plan §4.0) — software-level, with a user warning.
 *
 * Output is a hex key string compatible with {@link module:core/crypto/aes}.
 */
import Aes from 'react-native-aes-crypto';

/** Iteration count for backup/export keys. OWASP-aligned for PBKDF2-SHA512. */
export const EXPORT_ITERATIONS = 600_000;

/** AES-256 key length in bytes. */
export const KEY_BYTES = 32;

const SALT_BYTES = 16;

/** Generates a random salt as a hex string. Store it alongside the ciphertext. */
export async function generateSalt(): Promise<string> {
  return Aes.randomKey(SALT_BYTES);
}

export interface DeriveOptions {
  iterations?: number;
  keyBytes?: number;
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

/**
 * Derives a hex key from a password + salt using PBKDF2. Defaults to
 * SHA-512 / 600k iterations / 32-byte key (the export profile).
 *
 * `react-native-aes-crypto.pbkdf2` takes the key length in BITS.
 */
export async function deriveKeyFromPassword(
  password: string,
  saltHex: string,
  options: DeriveOptions = {},
): Promise<string> {
  const {
    iterations = EXPORT_ITERATIONS,
    keyBytes = KEY_BYTES,
    algorithm = 'sha512',
  } = options;
  return Aes.pbkdf2(password, saltHex, iterations, keyBytes * 8, algorithm);
}
