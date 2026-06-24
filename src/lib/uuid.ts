/**
 * UUID generation. Thin wrapper so the rest of the app never imports the
 * library directly — makes it trivial to swap implementations later.
 */
import uuid from 'react-native-uuid';

/** Returns a RFC-4122 v4 UUID string. Used for all primary keys. */
export function newId(): string {
  return uuid.v4() as string;
}
