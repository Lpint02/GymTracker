import { useSyncExternalStore, useCallback } from "react";
import { subscribe, getSnapshot, setSyncState } from "../lib/sync/syncStore";
import {
  retryFailedOperations,
  discardOperation,
  getAllOperations,
} from "../lib/sync/outbox";
import { requestFlush, publishCounts } from "../lib/sync/engine";

/**
 * Sync status for the UI.
 *
 * Uses useSyncExternalStore rather than living in WorkoutContext: that context
 * value is a fresh object literal on every render and is not memoized, so
 * anything placed there re-renders every consumer — including the recharts SVG
 * — on each change. A value that ticks during background sync belongs nowhere
 * near it. Here, only the components that call this hook subscribe.
 */
export function useSyncStatus() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refreshFailedList = useCallback(async () => {
    const all = await getAllOperations();
    setSyncState({ failedOperations: all.filter((r) => r.status === "failed") });
  }, []);

  // Both actions change the queue, so both must re-derive the state AND the
  // list from it. Counts alone are not enough: after discarding the last parked
  // operation the badge read "Sincronizzazione bloccata (0)" and the panel kept
  // showing the row that was gone. requestFlush recomputes state from the
  // queue even when there is nothing pending to send.
  const retryFailed = useCallback(async () => {
    await retryFailedOperations();
    await publishCounts();
    await requestFlush();
    await refreshFailedList();
  }, [refreshFailedList]);

  const discard = useCallback(async (seq: number) => {
    await discardOperation(seq);
    await requestFlush();
    await refreshFailedList();
  }, [refreshFailedList]);

  return { ...snapshot, retryFailed, discard, refreshFailedList, requestFlush };
}
