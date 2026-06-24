/**
 * Repository provider. Lazily opens the encrypted DB once and hands feature
 * hooks their repositories. Hooks `await` these inside query/mutation functions,
 * so no React context is needed and the DB opens on first use.
 *
 * As more repos land (documents, udhaar), add their accessors here.
 */
import { getDatabase } from '@core/db';
import { createVaultRepo, type VaultRepo } from '@features/vault/VaultRepo';

let vaultRepo: VaultRepo | null = null;

export async function getVaultRepo(): Promise<VaultRepo> {
  if (!vaultRepo) {
    const db = await getDatabase();
    vaultRepo = createVaultRepo(db);
  }
  return vaultRepo;
}

/** Test hook — clears memoized repos so a fresh DB can be injected. */
export function __resetRepositories(): void {
  vaultRepo = null;
}
