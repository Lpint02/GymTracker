import { reportStorageFailure } from "../sync/syncStore";

/**
 * Single funnel for "the durable write failed but the UI already moved on".
 *
 * This matters more than it looks: mutations update React state optimistically
 * and persist in the background, so a rejected IndexedDB write (quota exceeded,
 * corrupted database, Safari evicting storage mid-session) leaves what the user
 * sees and what is actually saved out of agreement, with no visible symptom.
 *
 * Routed into the sync store so the header badge surfaces it — deliberately not
 * an alert(), which blocks the thread and is unusable in an installed PWA.
 */
export function reportStorageError(context: string, error: unknown): void {
  console.error(`[store] scrittura fallita: ${context}`, error);
  const message = error instanceof Error ? error.message : String(error);
  reportStorageFailure(`${context}: ${message}`);
}
