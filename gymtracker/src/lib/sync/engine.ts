import { supabase } from "../supabase";
import type { OutboxRecord } from "../db";
import {
  getAllOperations,
  removeOperation,
  updateOperation,
  countByStatus,
} from "./outbox";
import {
  classifyError,
  backoffDelayMs,
  describeError,
  MAX_ATTEMPTS,
} from "./errors";
import { setSyncState, getSnapshot } from "./syncStore";
import {
  favoriteTable,
  type FavoritePayload,
  type SessionPayload,
} from "./mappers";

/**
 * Drains the outbox.
 *
 * Module-level state on purpose: there is one queue, so there is one drainer.
 * `isFlushing` is not optional — React StrictMode double-invokes the boot
 * effect in development, and without it two flush loops race on the same rows,
 * double-sending and corrupting attempt counts.
 */
let isFlushing = false;
let flushAgainWhenDone = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * At most one token refresh per flush cycle.
 *
 * Scoped to the cycle rather than to a single drain() call on purpose: a
 * successful refresh re-runs drain(), so a call-scoped flag would be recreated
 * each time and a token that keeps getting rejected would refresh forever.
 */
let authRefreshedThisCycle = false;

// ── Performing one operation ─────────────────────────────────────────────────

async function executeOperation(record: OutboxRecord): Promise<void> {
  if (record.entity === "session") {
    if (record.op === "upsert") {
      // One RPC = one round trip = one transaction. Pushing a session as three
      // separate PostgREST calls would be three transactions, and a tab killed
      // between them leaves a workout on the server with half its sets — wrong
      // data that no derivation hook would ever flag.
      const { error } = await supabase.rpc("sync_upsert_session", {
        p_session: record.payload as SessionPayload,
      });
      if (error) throw error;
      return;
    }

    // Cascades to workout_exercises and workout_sets.
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", record.entityId);
    if (error) throw error;
    return;
  }

  if (record.entity === "favorite") {
    const payload = record.payload as FavoritePayload;
    const table = favoriteTable(payload.kind);

    if (record.op === "upsert") {
      const { error } = await supabase.from(table).upsert(payload.row!);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", record.entityId);
    if (error) throw error;
    return;
  }

  if (record.entity === "routine") {
    if (record.op === "upsert") {
      // Same shape as sessions, for the same reason: a routine is a row plus
      // N ordered items, and separate calls would be separate transactions.
      const { error } = await supabase.rpc("sync_upsert_routine", {
        p_routine: record.payload,
      });
      if (error) throw error;
      return;
    }

    // Cascades to routine_favorite_items.
    const { error } = await supabase
      .from("routine_favorites")
      .delete()
      .eq("id", record.entityId);
    if (error) throw error;
    return;
  }

  // Reaching here means the queue holds something this build does not
  // understand — an operation written by a newer version, say. Parking it is
  // safer than guessing at what it meant.
  throw Object.assign(
    new Error(`Operazione sconosciuta: ${record.entity}/${record.op}`),
    { code: "UNSUPPORTED" }
  );
}

// ── Draining ─────────────────────────────────────────────────────────────────

/** Keeps "last synced" honest: with something parked, nothing just succeeded. */
function snapshotLastSyncedAt(): number | null {
  return getSnapshot().lastSyncedAt;
}

async function publishCounts(): Promise<{ pending: number; failed: number }> {
  const [pending, failed] = await Promise.all([
    countByStatus("pending"),
    countByStatus("failed"),
  ]);
  setSyncState({ pendingCount: pending, failedCount: failed });
  return { pending, failed };
}

async function drain(): Promise<void> {
  const all = await getAllOperations();
  // `seq` is autoIncrement, so this is insertion order.
  const queue = all
    .filter((r) => r.status === "pending")
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  if (queue.length === 0) {
    // Nothing PENDING is not the same as nothing wrong. Parked operations are
    // skipped by the drain on purpose — retrying a permanent failure forever is
    // how a queue stays poisoned — but they must still be reported, or a reload
    // makes the badge read "Sincronizzato" while a workout sits unsynced. That
    // silence is exactly what this design exists to prevent.
    const counts = await publishCounts();
    setSyncState({
      state: counts.failed > 0 ? "error" : "idle",
      lastSyncedAt: counts.failed > 0 ? snapshotLastSyncedAt() : Date.now(),
    });
    return;
  }

  if (!navigator.onLine) {
    setSyncState({ state: "offline" });
    return;
  }

  setSyncState({ state: "syncing" });

  const now = Date.now();

  for (const record of queue) {
    // Backing off: leave it, but keep going. Its turn comes on a later flush.
    if (record.nextAttemptAt > now) continue;

    try {
      await executeOperation(record);
      await removeOperation(record.seq!);
      continue;
    } catch (error) {
      const kind = classifyError(error, record.op);

      if (kind === "converged") {
        // The server already agrees — a delete whose row is gone, or a favorite
        // that already exists. Nothing left to do.
        await removeOperation(record.seq!);
        continue;
      }

      if (kind === "auth") {
        // Do NOT burn an attempt on an expired token; that is our problem, not
        // a bad operation. One refresh, then let the next flush retry.
        if (!authRefreshedThisCycle) {
          authRefreshedThisCycle = true;
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            flushAgainWhenDone = true;
            return;
          }
        }
        setSyncState({ state: "needs-reauth" });
        return;
      }

      const failure = describeError(error);

      if (kind === "permanent") {
        // Retrying cannot help: the request is wrong, not unlucky. Park it —
        // but never drop it. The badge surfaces it for the user to decide.
        await updateOperation({
          ...record,
          status: "failed",
          lastError: { ...failure, at: Date.now() },
        });
        continue;
      }

      // Transient. Back off, and STOP here rather than skipping ahead: causal
      // order within an entity must hold, so an upsert followed by a delete of
      // the same row can never invert.
      const attempts = record.attempts + 1;
      await updateOperation({
        ...record,
        attempts,
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        nextAttemptAt: Date.now() + backoffDelayMs(attempts),
        lastError: { ...failure, at: Date.now() },
      });

      const counts = await publishCounts();
      setSyncState({
        state: navigator.onLine
          ? counts.failed > 0
            ? "error"
            : "idle"
          : "offline",
      });
      return;
    }
  }

  const counts = await publishCounts();
  setSyncState({
    state: counts.failed > 0 ? "error" : "idle",
    lastSyncedAt: counts.pending === 0 ? Date.now() : null,
  });
}

/**
 * Ask the engine to drain. Safe to call from anywhere, any number of times:
 * overlapping calls collapse into one run followed by at most one more.
 */
export async function requestFlush(): Promise<void> {
  if (isFlushing) {
    flushAgainWhenDone = true;
    return;
  }

  isFlushing = true;
  authRefreshedThisCycle = false;
  try {
    do {
      flushAgainWhenDone = false;
      await drain();
    } while (flushAgainWhenDone);
  } catch (error) {
    // A failure in the drainer itself must not wedge the queue permanently.
    console.error("[sync] flush interrotto", error);
  } finally {
    isFlushing = false;
    await publishCounts().catch(() => {});
    scheduleAdaptiveInterval();
  }
}

// ── Triggers ─────────────────────────────────────────────────────────────────

/**
 * A 60s tick that exists ONLY while there is something queued and the tab is
 * visible, and clears itself the moment the queue drains.
 *
 * A background poll against an empty queue would be pure battery and token
 * churn. Its one real use is "phone on the bench, flaky gym wifi, app open for
 * ninety minutes".
 */
function scheduleAdaptiveInterval(): void {
  void countByStatus("pending").then((pending) => {
    const wanted = pending > 0 && document.visibilityState === "visible";

    if (wanted && intervalId === null) {
      intervalId = setInterval(() => void requestFlush(), 60_000);
    } else if (!wanted && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });
}

let started = false;

/**
 * Wire up the flush triggers. Idempotent — StrictMode calls this twice.
 *
 * The four that matter:
 *  - boot: recovers anything left by a tab killed mid-flight
 *  - visibilitychange: THE mobile trigger. Installed PWAs get backgrounded,
 *    not closed, and their timers are throttled hard, so returning to the app
 *    is the reliable signal — not a setInterval.
 *  - online: matters on desktop, where the tab stays visible straight through
 *    a network drop and recovery so visibilitychange never fires
 *  - end of workout: called directly by saveSession
 *
 * Deliberately absent: beforeunload + sendBeacon. sendBeacon cannot set the
 * apikey and Authorization headers PostgREST requires, and keepalive fetch
 * cannot observe its response, so it could never confirm an operation as done.
 * It is unnecessary anyway — operations are written to IndexedDB in the same
 * transaction as the data, so nothing is ever awaiting enqueue at unload.
 */
export function startSyncEngine(): () => void {
  if (started) return () => {};
  started = true;

  const onVisible = () => {
    if (document.visibilityState === "visible") void requestFlush();
    else scheduleAdaptiveInterval();
  };

  // navigator.onLine going true is a hint, not a promise — captive portals and
  // gym wifi lie constantly — so a flush attempt still handles failure normally.
  const onOnline = () => void requestFlush();
  const onOffline = () => setSyncState({ state: "offline" });

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  void requestFlush();

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    started = false;
  };
}

export { publishCounts };
