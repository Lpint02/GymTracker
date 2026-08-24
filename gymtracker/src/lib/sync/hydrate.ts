import { supabase } from "../supabase";
import { getDb, getMeta, setMeta, wipeLocalData } from "../db";
import type { FavoriteRecord, RoutineRecord } from "../db";
import { fromSessionPayload, type SessionPayload } from "./mappers";
import { countByStatus } from "./outbox";
import { requestFlush } from "./engine";

/**
 * Pulling data down from the server.
 *
 * This runs in exactly three situations — a fresh install or new device, an
 * account switch, and an explicit restore. There is deliberately NO ongoing
 * pull loop: with a single device the server can only diverge from local if
 * something else wrote to it, which by construction never happens. Polling
 * would burn battery and introduce a merge problem that does not currently
 * exist.
 */

const OWNER_KEY = "ownerUserId";
const HYDRATED_KEY = "hydratedAt";

interface ExportedData {
  sessions: SessionPayload[];
  exerciseFavorites: { id: string; label: string; createdAt: string }[];
  routines: {
    id: string;
    name: string;
    position: number;
    exerciseNames: string[];
    createdAt: string;
    updatedAt: string;
  }[];
}

export type HydrateOutcome =
  | { status: "skipped"; reason: string }
  | { status: "wiped-and-pulled"; sessions: number }
  | { status: "pulled"; sessions: number };

/**
 * Bring local storage in line with the account, if it needs it.
 *
 * Called once per signed-in mount. Cheap in the common case: if this device
 * already belongs to this user and holds data, it does nothing at all.
 */
export async function hydrateFromServer(
  userId: string
): Promise<HydrateOutcome> {
  const owner = await getMeta<string>(OWNER_KEY);

  // Different account on this device: the local store belongs to someone else.
  // Wipe before pulling, or one user's history bleeds into another's.
  const isAccountSwitch = owner !== undefined && owner !== userId;

  if (!isAccountSwitch) {
    const db = await getDb();
    const localCount = await db.count("sessions");
    const alreadyHydrated = await getMeta<number>(HYDRATED_KEY);

    // Nothing to do: this device is already this user's, and either it has data
    // or we have pulled before and the account is genuinely empty.
    if (owner === userId && (localCount > 0 || alreadyHydrated)) {
      return { status: "skipped", reason: "locale già allineato" };
    }

    // First run on a device that has local data but no owner stamp — the state
    // left by the phases before accounts existed. Claim it rather than
    // destroying it; anything already here belongs to the person signing in.
    if (owner === undefined && localCount > 0) {
      await setMeta(OWNER_KEY, userId);
      await setMeta(HYDRATED_KEY, Date.now());
      return { status: "skipped", reason: "dati locali preesistenti mantenuti" };
    }
  }

  // Anything still queued was created locally and is newer than whatever the
  // server holds. Push it BEFORE pulling, or the pull overwrites it.
  if ((await countByStatus("pending")) > 0) {
    await requestFlush();
  }

  const { data, error } = await supabase.rpc("export_user_data");
  if (error) throw error;

  const exported = (data ?? {
    sessions: [],
    exerciseFavorites: [],
    routines: [],
  }) as ExportedData;

  if (isAccountSwitch) {
    await wipeLocalData();
  }

  await writeExportedData(exported);
  await setMeta(OWNER_KEY, userId);
  await setMeta(HYDRATED_KEY, Date.now());

  return {
    status: isAccountSwitch ? "wiped-and-pulled" : "pulled",
    sessions: exported.sessions?.length ?? 0,
  };
}

/**
 * Write a whole export in one transaction, so a failure part-way cannot leave
 * the store holding half an account.
 *
 * Note these writes go straight to the object stores and deliberately do NOT
 * enqueue outbox operations: this data came FROM the server, so pushing it back
 * would be a pointless round trip.
 */
async function writeExportedData(exported: ExportedData): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["sessions", "favorites", "routines"], "readwrite");

  const sessions = tx.objectStore("sessions");
  for (const raw of exported.sessions ?? []) {
    await sessions.put(fromSessionPayload(raw));
  }

  const favorites = tx.objectStore("favorites");
  for (const fav of exported.exerciseFavorites ?? []) {
    const record: FavoriteRecord = {
      id: fav.id,
      kind: "exercise",
      label: fav.label,
      createdAt: fav.createdAt,
    };
    await favorites.put(record);
  }

  // Routines double as the workout-name favorites: a routine with no items
  // behaves exactly like a name pill, which is why there is no third list.
  const routines = tx.objectStore("routines");
  for (const routine of exported.routines ?? []) {
    const record: RoutineRecord = {
      id: routine.id,
      name: routine.name,
      exerciseNames: routine.exerciseNames ?? [],
      position: routine.position ?? 0,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    };
    await routines.put(record);

    await favorites.put({
      id: routine.id,
      kind: "workout",
      label: routine.name,
      createdAt: routine.createdAt,
    });
  }

  await tx.done;
}

/**
 * Is there data on the server this device does not have?
 *
 * A cheap safety valve for the case where local storage was cleared but the
 * owner stamp survived, or a hydrate failed silently. It PROMPTS rather than
 * merging: automatic merge is where offline-first apps go to die, and a
 * question costs one query.
 */
export async function countServerSessions(): Promise<number> {
  const { count, error } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Discard local state and pull the account down again from scratch. */
export async function forceRestore(userId: string): Promise<number> {
  await wipeLocalData();
  const outcome = await hydrateFromServer(userId);
  return outcome.status === "skipped" ? 0 : outcome.sessions;
}
