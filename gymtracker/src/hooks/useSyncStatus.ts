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

  const retryFailed = useCallback(async () => {
    await retryFailedOperations();
    await publishCounts();
    await requestFlush();
  }, []);

  const discard = useCallback(async (seq: number) => {
    await discardOperation(seq);
    await publishCounts();
  }, []);

  const refreshFailedList = useCallback(async () => {
    const all = await getAllOperations();
    setSyncState({ failedOperations: all.filter((r) => r.status === "failed") });
  }, []);

  return { ...snapshot, retryFailed, discard, refreshFailedList, requestFlush };
}
