/**
 * Field-level authenticated encryption for individual secrets (vault entries).
 *
 * NOTE ON ALGORITHM: the plan specifies AES-256-GCM, but the installed
 * `react-native-aes-crypto` exposes only CBC/CTR + HMAC primitives (no GCM). We
 * therefore use **AES-256-CBC + HMAC-SHA256 in Encrypt-then-MAC** order, which
 * provides the same two guarantees the plan wanted from GCM:
 *   - confidentiality (AES-256, per-record random IV)
 *   - integrity / tamper detection (the HMAC plays the role of the GCM auth tag)
 *
 * The on-disk shape is identical to the plan's vault schema: ciphertext ->
 * `secret_enc`, IV -> `iv`, HMAC -> `tag`, with `enc_version` for future
 * migration (e.g. to true GCM via react-native-quick-crypto).
 *
 * Keys are hex strings (the format react-native-aes-crypto expects). The data
 * encryption key comes from `keystore.getDataEncryptionKey()`.
 */
import Aes from 'react-native-aes-crypto';
import { CryptoTamperError, DecryptionError } from './errors';

/** Current encryption scheme version. Bump when the algorithm/format changes. */
export const ENC_VERSION = 1;

const CBC_ALGORITHM = 'aes-256-cbc';
const IV_BYTES = 16; // AES block size
const MAC_DOMAIN = 'privo:mac:v1'; // domain separation for the derived MAC key

export interface EncryptedPayload {
  /** Base64 ciphertext — maps to `vault.secret_enc`. */
  cipher: string;
  /** Hex IV (16 bytes) — maps to `vault.iv`. Never reused across records. */
  iv: string;
  /** Hex HMAC-SHA256 over (iv || cipher) — maps to `vault.tag`. */
  tag: string;
  /** Scheme version — maps to `vault.enc_version`. */
  version: number;
}

/**
 * Derives an independent MAC key from the encryption key so the same key bytes
 * are never used for both confidentiality and authentication.
 */
async function deriveMacKey(keyHex: string): Promise<string> {
  return Aes.sha256(`${keyHex}:${MAC_DOMAIN}`);
}

/** Length-safe, constant-time comparison of two hex strings. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Encrypts UTF-8 plaintext with a per-call random IV, then MACs it.
 * Same plaintext + same key -> different ciphertext every time (no pattern leak).
 */
export async function encrypt(plaintext: string, keyHex: string): Promise<EncryptedPayload> {
  const iv = await Aes.randomKey(IV_BYTES); // hex, 32 chars
  const cipher = await Aes.encrypt(plaintext, keyHex, iv, CBC_ALGORITHM);
  const macKey = await deriveMacKey(keyHex);
  const tag = await Aes.hmac256(iv + cipher, macKey);
  return { cipher, iv, tag, version: ENC_VERSION };
}

/**
 * Serialises a payload into a single self-contained string. Used for columns
 * that have no dedicated iv/tag fields (e.g. `vault.notes_enc`).
 */
export function packPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

/** Inverse of {@link packPayload}. Throws if the stored value is malformed. */
export function unpackPayload(serialized: string): EncryptedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new DecryptionError('Malformed encrypted payload', { cause: error });
  }
  const p = parsed as Partial<EncryptedPayload>;
  if (
    typeof p.cipher !== 'string' ||
    typeof p.iv !== 'string' ||
    typeof p.tag !== 'string' ||
    typeof p.version !== 'number'
  ) {
    throw new DecryptionError('Malformed encrypted payload');
  }
  return { cipher: p.cipher, iv: p.iv, tag: p.tag, version: p.version };
}

/**
 * Verifies the MAC (Encrypt-then-MAC: authenticate BEFORE decrypting), then
 * decrypts. Throws {@link CryptoTamperError} if the MAC does not match.
 */
export async function decrypt(payload: EncryptedPayload, keyHex: string): Promise<string> {
  const macKey = await deriveMacKey(keyHex);
  const expectedTag = await Aes.hmac256(payload.iv + payload.cipher, macKey);
  if (!constantTimeEqual(expectedTag, payload.tag)) {
    throw new CryptoTamperError();
  }
  try {
    return await Aes.decrypt(payload.cipher, keyHex, payload.iv, CBC_ALGORITHM);
  } catch (error) {
    throw new DecryptionError('Failed to decrypt payload', { cause: error });
  }
}
