import type { OutboxRecord } from "../db";

/**
 * Observable sync state, read through useSyncExternalStore.
 *
 * Deliberately NOT part of WorkoutContext. That provider builds a fresh object
 * literal every render and is not memoized, so every consumer re-renders on any
 * change. Putting a value that ticks during background sync in there would
 * re-render the recharts SVG on every flush. Here, only the badge subscribes.
 */

export type SyncState =
  | "idle"
  | "syncing"
  | "offline"
  | "error"
  | "needs-reauth";

export interface SyncSnapshot {
  state: SyncState;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: number | null;
  failedOperations: OutboxRecord[];
  /** A durable local write failed — what is on screen may not be saved. */
  storageError: string | null;
}

let snapshot: SyncSnapshot = {
  state: "idle",
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  failedOperations: [],
  storageError: null,
};

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * useSyncExternalStore compares snapshots by identity and will loop forever if
 * a new object comes back every call, so this returns the same frozen object
 * until something actually changes.
 */
export function getSnapshot(): SyncSnapshot {
  return snapshot;
}

export function setSyncState(patch: Partial<SyncSnapshot>): void {
  const next = { ...snapshot, ...patch };

  const unchanged =
    next.state === snapshot.state &&
    next.pendingCount === snapshot.pendingCount &&
    next.failedCount === snapshot.failedCount &&
    next.lastSyncedAt === snapshot.lastSyncedAt &&
    next.storageError === snapshot.storageError &&
    next.failedOperations === snapshot.failedOperations;

  if (unchanged) return;

  snapshot = next;
  for (const listener of listeners) listener();
}

export function reportStorageFailure(message: string): void {
  setSyncState({ storageError: message });
}
