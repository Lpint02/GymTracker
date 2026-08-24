import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WorkoutSession } from "../types";

/**
 * IndexedDB is the durable home for everything that syncs: completed workouts,
 * favorites, routines, and the outbox of pending sync operations.
 *
 * Why not localStorage, given the data comfortably fits in 5 MB?
 *
 *   1. Atomicity. "Write the workout AND enqueue its sync operation" has to be
 *      one unit. localStorage has no transactions, so a crash between the two
 *      writes leaves either an un-synced workout with no operation (silent data
 *      loss) or an operation for data that isn't there. An outbox on
 *      localStorage is an outbox with a correctness hole.
 *   2. Write amplification. The previous implementation re-serialized the ENTIRE
 *      history array on every change, synchronously, on the main thread — a
 *      visible stutter on the exact interaction you least want to stutter.
 *   3. A service worker can read IndexedDB and cannot read localStorage.
 *
 * Note what IndexedDB does NOT buy us: read performance. The derivation hooks
 * want the whole history array in memory anyway, so hydration is one getAll().
 *
 * The ACTIVE session deliberately stays in localStorage (useWorkoutSession) —
 * it is device-local, never synced, and written on every keystroke, where a
 * synchronous write that cannot be lost to a tab kill is a feature.
 */

const DB_NAME = "gymtracker";
const DB_VERSION = 1;

export type FavoriteKind = "workout" | "exercise";

export interface FavoriteRecord {
  id: string;
  kind: FavoriteKind;
  label: string;
  createdAt: string;
}

export interface RoutineRecord {
  id: string;
  name: string;
  exerciseNames: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type OutboxEntity = "session" | "favorite" | "routine";
export type OutboxOp = "upsert" | "delete";
export type OutboxStatus = "pending" | "failed";

export interface OutboxRecord {
  /** autoIncrement primary key — this is the FIFO order, for free. */
  seq?: number;
  /** Stable across retries; used for logging and for discarding one poisoned op. */
  opId: string;
  entity: OutboxEntity;
  op: OutboxOp;
  entityId: string;
  /** Full snapshot for upserts, null for deletes. Never a delta. */
  payload: unknown;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  status: OutboxStatus;
  lastError: { code: string; message: string; at: number } | null;
}

export interface SyncMetaRecord {
  key: string;
  value: unknown;
}

interface GymTrackerDB extends DBSchema {
  /**
   * Values are `WorkoutSession` VERBATIM — no `dirty` flag, no `updatedAt`, no
   * `user_id`. That is what lets getAll() feed the four pure derivation hooks
   * with zero mapping. Whether an entity needs syncing is derived instead: it
   * does iff a pending outbox row exists for it (see the by-entity index).
   */
  sessions: {
    key: string;
    value: WorkoutSession;
    indexes: { "by-date": string };
  };
  favorites: {
    key: string;
    value: FavoriteRecord;
    indexes: { "by-kind": FavoriteKind };
  };
  routines: {
    key: string;
    value: RoutineRecord;
    indexes: { "by-position": number };
  };
  outbox: {
    key: number;
    value: OutboxRecord;
    indexes: {
      "by-status": OutboxStatus;
      "by-entity": [OutboxEntity, string];
      "by-nextAttemptAt": number;
    };
  };
  syncMeta: {
    key: string;
    value: SyncMetaRecord;
  };
}

export type GymTrackerDatabase = IDBPDatabase<GymTrackerDB>;

let dbPromise: Promise<GymTrackerDatabase> | null = null;

/**
 * Open (or create) the database. The promise is memoized, so concurrent callers
 * — and React StrictMode's double-invoked effects — share one connection.
 */
export function getDb(): Promise<GymTrackerDatabase> {
  if (!dbPromise) {
    dbPromise = openDB<GymTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("sessions")) {
          const sessions = db.createObjectStore("sessions", { keyPath: "id" });
          sessions.createIndex("by-date", "date");
        }

        if (!db.objectStoreNames.contains("favorites")) {
          const favorites = db.createObjectStore("favorites", { keyPath: "id" });
          favorites.createIndex("by-kind", "kind");
        }

        if (!db.objectStoreNames.contains("routines")) {
          const routines = db.createObjectStore("routines", { keyPath: "id" });
          routines.createIndex("by-position", "position");
        }

        // Created now, in v1, even though the sync engine lands later — so that
        // enabling sync never needs a schema version bump.
        if (!db.objectStoreNames.contains("outbox")) {
          const outbox = db.createObjectStore("outbox", {
            keyPath: "seq",
            autoIncrement: true,
          });
          outbox.createIndex("by-status", "status");
          outbox.createIndex("by-entity", ["entity", "entityId"]);
          outbox.createIndex("by-nextAttemptAt", "nextAttemptAt");
        }

        if (!db.objectStoreNames.contains("syncMeta")) {
          db.createObjectStore("syncMeta", { keyPath: "key" });
        }
      },
      blocked() {
        console.warn(
          "[db] Un'altra scheda sta bloccando l'aggiornamento del database."
        );
      },
      blocking() {
        // Another tab wants to upgrade; drop our connection so it can proceed.
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/**
 * Ask the browser to exempt our storage from automatic eviction.
 *
 * This matters more once the outbox exists. Safari's ITP can evict IndexedDB
 * after roughly a week of not visiting a non-installed site, and evicting the
 * outbox does not lose a cache — it loses workouts that were never synced.
 *
 * Best-effort by design: Chrome decides silently based on engagement, installed
 * PWAs are largely exempt anyway, and a refusal is not an error. Never throws.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// ── syncMeta helpers ─────────────────────────────────────────────────────────

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get("syncMeta", key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("syncMeta", { key, value });
}

// ── Wipe ─────────────────────────────────────────────────────────────────────

/**
 * Clear every store in a single transaction. Used on sign-out and on account
 * switch. Callers MUST have already dealt with a non-empty outbox: wiping with
 * pending operations destroys workouts that exist nowhere else.
 */
export async function wipeLocalData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ["sessions", "favorites", "routines", "outbox", "syncMeta"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("sessions").clear(),
    tx.objectStore("favorites").clear(),
    tx.objectStore("routines").clear(),
    tx.objectStore("outbox").clear(),
    tx.objectStore("syncMeta").clear(),
    tx.done,
  ]);
}
