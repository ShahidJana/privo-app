/**
 * App PIN credential. The 6-digit PIN set during onboarding is an *alternative*
 * unlock method to biometrics — same session gate, never key material. We store
 * only a PBKDF2 hash (+ salt) in the hardware-backed Keychain, never the PIN
 * itself, and verify by re-deriving and comparing in constant time.
 *
 * Note: a 6-digit PIN is low entropy, so the Keychain's hardware protection is
 * the real defence; the KDF just stops the stored value from being the PIN.
 */
import * as Keychain from 'react-native-keychain';
import { ACCESSIBLE, STORAGE_TYPE } from 'react-native-keychain';
import { deriveKeyFromPassword, generateSalt } from '@core/crypto';
import { logger } from '@lib/logger';

const PIN_SERVICE = 'com.privo.keys.pin';
const PIN_USERNAME = 'privo-pin';
// Lower than the export profile (600k) so unlock stays snappy on low-end
// devices, but high enough to slow brute-forcing of the stored hash.
const PIN_ITERATIONS = 100_000;

interface StoredPin {
  salt: string;
  hash: string;
  iterations: number;
}

const SET_OPTIONS: Keychain.SetOptions = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  storage: STORAGE_TYPE.AES_GCM_NO_AUTH,
};

/** Hashes and stores the PIN, replacing any existing one. */
export async function setPin(pin: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await deriveKeyFromPassword(pin, salt, {
    iterations: PIN_ITERATIONS,
    algorithm: 'sha256',
  });
  const payload: StoredPin = { salt, hash, iterations: PIN_ITERATIONS };
  const result = await Keychain.setGenericPassword(
    PIN_USERNAME,
    JSON.stringify(payload),
    { ...SET_OPTIONS, service: PIN_SERVICE },
  );
  if (result === false) {
    throw new Error('Failed to persist PIN');
  }
  logger.info('PIN credential stored');
}

/** True once a PIN has been set — used to decide whether to offer PIN unlock. */
export function hasPin(): Promise<boolean> {
  return Keychain.hasGenericPassword({ service: PIN_SERVICE });
}

/** Verifies a candidate PIN against the stored hash. Never throws. */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = await Keychain.getGenericPassword({ service: PIN_SERVICE });
    if (!stored || !stored.password) {
      return false;
    }
    const { salt, hash, iterations } = JSON.parse(stored.password) as StoredPin;
    const candidate = await deriveKeyFromPassword(pin, salt, {
      iterations,
      algorithm: 'sha256',
    });
    return timingSafeEqual(candidate, hash);
  } catch (error) {
    logger.error('PIN verification failed', { error });
    return false;
  }
}

/** Removes the stored PIN (e.g. on wipe). */
export async function resetPin(): Promise<void> {
  await Keychain.resetGenericPassword({ service: PIN_SERVICE });
}

/** Length-independent equality to avoid leaking match progress via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
