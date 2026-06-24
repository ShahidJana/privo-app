/**
 * Crypto core public surface. Feature code should import from here, never from
 * the underlying libraries directly.
 */
export {
  CryptoError,
  CryptoTamperError,
  DecryptionError,
  KeyInvalidatedError,
  isKeyInvalidatedError,
} from './errors';
export {
  encrypt,
  decrypt,
  packPayload,
  unpackPayload,
  ENC_VERSION,
  type EncryptedPayload,
} from './aes';
export {
  deriveKeyFromPassword,
  generateSalt,
  EXPORT_ITERATIONS,
  KEY_BYTES,
  type DeriveOptions,
} from './pbkdf2';
export {
  getDatabaseKey,
  getDataEncryptionKey,
  hasKeys,
  isHardwareBacked,
  resetAllKeys,
} from './keystore';
