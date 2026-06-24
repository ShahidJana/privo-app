/**
 * File-domain errors (plan §4.3 / Challenges H1, M3). Kept free of native
 * imports so they can be thrown/caught anywhere, including in unit tests.
 */
import { AppError } from '@lib/errors';

const MB = 1024 * 1024;

/** Picked file exceeds the allowed size. */
export class FileTooLargeError extends AppError {
  constructor(
    readonly sizeBytes: number,
    readonly maxBytes: number,
  ) {
    super(
      `File is ${(sizeBytes / MB).toFixed(1)}MB, max ${(maxBytes / MB).toFixed(0)}MB`,
    );
    this.name = 'FileTooLargeError';
  }
}

/** Picked file has an extension outside the allow-list. */
export class UnsupportedFileTypeError extends AppError {
  constructor(readonly extension: string) {
    super(`Unsupported file type: .${extension || 'unknown'}`);
    this.name = 'UnsupportedFileTypeError';
  }
}
