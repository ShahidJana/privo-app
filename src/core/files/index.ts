/**
 * File core public surface.
 */
export {
  rnfsFileStorage,
  DOCUMENTS_DIR,
  type FileStorage,
  type PickedFile,
} from './fileStorage';
export { FileTooLargeError, UnsupportedFileTypeError } from './errors';
