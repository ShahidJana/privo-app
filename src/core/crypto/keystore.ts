/**
 * Hardware-backed key management. The actual key bytes live in the Android
 * Keystore (via react-native-keychain) and are non-exportable (threat T8). The
 * app only ever holds them transiently to open the DB or decrypt a field.
 *
 * Two independent 256-bit keys:
 *   - DB key   → opens the SQLCipher database (whole-DB encryption at rest, T2).
 *   - Data key → field-level AES for vault secrets (defence-in-depth, see aes.ts).
 *
 * Storage choice: `AES_GCM_NO_AUTH` + `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. We do
 * NOT bind keys to the current biometric set, because the DB must open without a
 * prompt — app-level lock (Phase 1 lock screen) handles user authentication.
 * This also sidesteps Keystore key invalidation on biometric re-enrolment (C2)
 * for the data-at-rest keys. `KeyInvalidatedError` handling still lives in
 * errors.ts for any future biometric-bound keys.
 */
import * as Keychain from 'react-native-keychain';
import { ACCESSIBLE, SECURITY_LEVEL, STORAGE_TYPE } from 'react-native-keychain';
import Aes from 'react-native-aes-crypto';
import { logger } from '@lib/logger';

const KEY_BYTES = 32; // 256-bit
const KEY_USERNAME = 'privo';

const DB_KEY_SERVICE = 'com.privo.keys.db';
const DATA_KEY_SERVICE = 'com.privo.keys.data';

const SET_OPTIONS: Keychain.SetOptions = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  storage: STORAGE_TYPE.AES_GCM_NO_AUTH,
};

/**
 * Returns the key stored under `service`, creating and persisting a fresh random
 * key on first run. Hex string (32 bytes → 64 chars).
 */
async function getOrCreateKey(service: string): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service });
  if (existing && existing.password) {
    return existing.password;
  }
  const key = await Aes.randomKey(KEY_BYTES);
  const result = await Keychain.setGenericPassword(KEY_USERNAME, key, {
    ...SET_OPTIONS,
    service,
  });
  if (result === false) {
    throw new Error(`Failed to persist key for service ${service}`);
  }
  logger.info('Generated new key', { service, storage: result.storage });
  return key;
}

/** SQLCipher database encryption key. */
export function getDatabaseKey(): Promise<string> {
  return getOrCreateKey(DB_KEY_SERVICE);
}

/** Field-level data encryption key (vault secrets). */
export function getDataEncryptionKey(): Promise<string> {
  return getOrCreateKey(DATA_KEY_SERVICE);
}

/** True if both keys already exist — used to detect first launch / onboarding state. */
export async function hasKeys(): Promise<boolean> {
  const [db, data] = await Promise.all([
    Keychain.hasGenericPassword({ service: DB_KEY_SERVICE }),
    Keychain.hasGenericPassword({ service: DATA_KEY_SERVICE }),
  ]);
  return db && data;
}

/**
 * Reports whether the device backed key storage with secure hardware (TEE/SE).
 * Used in onboarding to warn when only software-level security is available.
 */
export async function isHardwareBacked(): Promise<boolean> {
  const level = await Keychain.getSecurityLevel(SET_OPTIONS);
  return level === SECURITY_LEVEL.SECURE_HARDWARE;
}

/**
 * Destroys all key material. After this the encrypted DB is permanently
 * unreadable — only call on explicit wipe (PIN-lockout wipe / factory reset).
 */
export async function resetAllKeys(): Promise<void> {
  await Promise.all([
    Keychain.resetGenericPassword({ service: DB_KEY_SERVICE }),
    Keychain.resetGenericPassword({ service: DATA_KEY_SERVICE }),
  ]);
  logger.warn('All encryption keys reset — encrypted data is now unrecoverable');
}
