/**
 * File storage port + the production (react-native-fs) implementation.
 *
 * All files are copied into the app's private sandbox immediately on pick
 * (Challenges H1 — never reference an external/content URI long-term, it breaks
 * under Scoped Storage). Repos depend on the `FileStorage` interface, not RNFS,
 * so they stay unit-testable with a fake.
 */
import RNFS from 'react-native-fs';

/** A file chosen by the picker, before it is imported into the sandbox. */
export interface PickedFile {
  uri: string;
  name?: string | null;
  size?: number | null; // bytes, if the picker reported it
  mimeType?: string | null;
}

export interface FileStorage {
  /** Copy a source URI into the sandbox under `destFileName`; returns its path. */
  importFile(srcUri: string, destFileName: string): Promise<string>;
  /** SHA-256 hex of a file at `path`. */
  hash(path: string): Promise<string>;
  /** Size in bytes of a file/URI. */
  sizeBytes(uri: string): Promise<number>;
  /** Delete a file; resolves even if it was already gone. */
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/** Sandbox directory for imported documents. */
export const DOCUMENTS_DIR = `${RNFS.DocumentDirectoryPath}/privo/documents`;

export const rnfsFileStorage: FileStorage = {
  async importFile(srcUri, destFileName) {
    await RNFS.mkdir(DOCUMENTS_DIR);
    const dest = `${DOCUMENTS_DIR}/${destFileName}`;
    await RNFS.copyFile(srcUri, dest);
    return dest;
  },
  hash(path) {
    return RNFS.hash(path, 'sha256');
  },
  async sizeBytes(uri) {
    const info = await RNFS.stat(uri);
    return info.size;
  },
  async delete(path) {
    const present = await RNFS.exists(path);
    if (present) {
      await RNFS.unlink(path);
    }
  },
  exists(path) {
    return RNFS.exists(path);
  },
};
