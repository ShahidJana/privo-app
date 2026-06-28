/**
 * Biometric authentication for the app-level vault lock. This is the *session*
 * gate: it proves a live, authorised user is present before the vault UI is
 * revealed. It does NOT gate key material — the encryption keys are
 * hardware-backed and open without a prompt (see keystore.ts). Losing/changing
 * biometrics therefore never makes stored data unrecoverable.
 *
 * `allowDeviceCredentials` lets the OS fall back to the device PIN/pattern when
 * no fingerprint/face is enrolled, so the lock still works on every device.
 */
import ReactNativeBiometrics, {
  type BiometryType,
} from 'react-native-biometrics';
import { logger } from '@lib/logger';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

export interface BiometryAvailability {
  available: boolean;
  biometryType: BiometryType | undefined;
}

/** What the device can offer — used to label the Settings screen. */
export async function getBiometryAvailability(): Promise<BiometryAvailability> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType };
  } catch (error) {
    logger.error('Biometric sensor check failed', { error });
    return { available: false, biometryType: undefined };
  }
}

export interface AuthResult {
  success: boolean;
  error?: string | undefined;
}

/**
 * Prompts the user to confirm their identity. Resolves `{ success: true }` only
 * when the OS confirms a live match; a cancel/failure resolves with
 * `success: false` (never throws) so callers can simply stay locked.
 */
export async function authenticate(
  promptMessage = 'Unlock your Privo vault',
): Promise<AuthResult> {
  try {
    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });
    if (!success) {
      logger.info('Biometric prompt not satisfied', { error });
    }
    return { success, error };
  } catch (error) {
    logger.error('Biometric authentication errored', { error });
    return { success: false, error: 'Authentication is unavailable on this device.' };
  }
}
