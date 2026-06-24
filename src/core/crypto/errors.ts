/**
 * Crypto error taxonomy. Specific error types let callers distinguish a tampered
 * record (delete/skip it) from a Keystore key invalidation (re-auth + re-encrypt)
 * from a generic failure (surface and bail).
 */

export class CryptoError extends Error {
  /** Underlying error, if any (older TS libs lack `Error.cause`). */
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'CryptoError';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/** HMAC/auth-tag mismatch on decrypt → ciphertext was tampered or corrupted. */
export class CryptoTamperError extends CryptoError {
  constructor(message = 'Authentication failed — data tampered or corrupt') {
    super(message);
    this.name = 'CryptoTamperError';
  }
}

/** Underlying decrypt failed for a reason other than tampering. */
export class DecryptionError extends CryptoError {
  constructor(message = 'Decryption failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DecryptionError';
  }
}

/**
 * Android Keystore key was permanently invalidated (e.g. biometrics re-enrolled).
 * Recovery: force PIN re-auth, regenerate the key, re-encrypt affected records.
 * See Challenges doc C2.
 */
export class KeyInvalidatedError extends CryptoError {
  constructor(message = 'Encryption key permanently invalidated', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'KeyInvalidatedError';
  }
}

/**
 * Detects the Android `KeyPermanentlyInvalidatedException` from an arbitrary
 * thrown value. Matches on message text because the native layer surfaces it as
 * a plain Error.
 */
export function isKeyInvalidatedError(error: unknown): boolean {
  if (error instanceof KeyInvalidatedError) {
    return true;
  }
  const text = String(
    error instanceof Error ? error.message : error,
  ).toLowerCase();
  return (
    text.includes('permanently invalidated') ||
    text.includes('keypermanentlyinvalidatedexception')
  );
}
