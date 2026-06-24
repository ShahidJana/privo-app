/**
 * Repository provider. Lazily opens the encrypted DB once and hands feature
 * hooks their repositories. Hooks `await` these inside query/mutation functions,
 * so no React context is needed and the DB opens on first use.
 *
 * As more repos land (documents, udhaar), add their accessors here.
 */
import { getDatabase } from '@core/db';
import { rnfsFileStorage } from '@core/files/fileStorage';
import { newId } from '@lib/uuid';
import { now } from '@lib/date';
import { createVaultRepo, type VaultRepo } from '@features/vault/VaultRepo';
import { DocumentsRepo } from '@features/documents/DocumentsRepo';
import { UdhaarRepo } from '@features/udhaar/UdhaarRepo';

let vaultRepo: VaultRepo | null = null;
let documentsRepo: DocumentsRepo | null = null;
let udhaarRepo: UdhaarRepo | null = null;

export async function getVaultRepo(): Promise<VaultRepo> {
  if (!vaultRepo) {
    const db = await getDatabase();
    vaultRepo = createVaultRepo(db);
  }
  return vaultRepo;
}

export async function getDocumentsRepo(): Promise<DocumentsRepo> {
  if (!documentsRepo) {
    const db = await getDatabase();
    documentsRepo = new DocumentsRepo(db, {
      fileStorage: rnfsFileStorage,
      now,
      newId,
    });
  }
  return documentsRepo;
}

export async function getUdhaarRepo(): Promise<UdhaarRepo> {
  if (!udhaarRepo) {
    const db = await getDatabase();
    udhaarRepo = new UdhaarRepo(db, { now, newId });
  }
  return udhaarRepo;
}

/** Test hook — clears memoized repos so a fresh DB can be injected. */
export function __resetRepositories(): void {
  vaultRepo = null;
  documentsRepo = null;
  udhaarRepo = null;
}
