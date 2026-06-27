/**
 * File picker — thin wrapper over react-native-image-picker that returns a
 * {@link PickedFile} (the shape repos/import expect) or null when the user
 * cancels. Lives in core/files alongside fileStorage so the native picker is
 * only imported here, never from presentational screens.
 *
 * Only images (camera + gallery) are supported today; PDF/document picking needs
 * a separate native dependency and is a follow-up.
 */
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import type { PickedFile } from './fileStorage';

export type PickSource = 'camera' | 'library';

function toPickedFile(asset: Asset): PickedFile | null {
  if (!asset.uri) {
    return null;
  }
  return {
    uri: asset.uri,
    name: asset.fileName ?? null,
    size: asset.fileSize ?? null,
    mimeType: asset.type ?? null,
  };
}

/** Launch the camera or gallery; resolves to the picked image or null. */
export async function pickImage(source: PickSource): Promise<PickedFile | null> {
  const response =
    source === 'camera'
      ? await launchCamera({ mediaType: 'photo', saveToPhotos: false })
      : await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });

  if (response.didCancel || response.errorCode) {
    return null;
  }
  const asset = response.assets?.[0];
  return asset ? toPickedFile(asset) : null;
}
