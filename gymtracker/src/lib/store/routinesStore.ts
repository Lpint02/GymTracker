import { getDb, type RoutineRecord } from "../db";
import { enqueueInTransaction } from "../sync/outbox";
import { normalizeKey } from "../utils";

/**
 * Persistence for saved routines.
 *
 * A routine is a workout name plus an ordered list of exercise names. It is
 * also what the workout-name favorites became: a routine with no exercises
 * behaves exactly like the old name pill, which is why there is no separate
 * favorites list for workout names.
 *
 * Same rule as sessionsStore: the data and its sync operation are written in
 * one transaction, so they commit together or not at all.
 */

export async function getAllRoutines(): Promise<RoutineRecord[]> {
  const db = await getDb();
  const rows = await db.getAll("routines");
  return rows.sort(
    (a, b) =>
      a.position - b.position ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id)
  );
}

export async function putRoutine(routine: RoutineRecord): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["routines", "outbox"], "readwrite");

  await tx.objectStore("routines").put(routine);
  await enqueueInTransaction(tx.objectStore("outbox"), {
    entity: "routine",
    op: "upsert",
    entityId: routine.id,
    payload: {
      id: routine.id,
      name: routine.name,
      position: routine.position,
      exerciseNames: routine.exerciseNames,
    },
  });

  await tx.done;
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["routines", "outbox"], "readwrite");

  await tx.objectStore("routines").delete(id);
  await enqueueInTransaction(tx.objectStore("outbox"), {
    entity: "routine",
    op: "delete",
    entityId: id,
    payload: null,
  });

  await tx.done;
}

/**
 * One-time carry-over of workout-name favorites into routines.
 *
 * Those favorites were stored as `kind: "workout"` entries before routines had
 * a UI, and they already sync to routine_favorites — so a device that restores
 * from the server gets them back as routines automatically. This covers the
 * device that never restores: without it, switching the UI over to routines
 * would make a user's saved workout names appear to vanish.
 *
 * Reuses each favorite's existing id, so the row it already created on the
 * server is updated rather than duplicated.
 */
export async function migrateWorkoutFavoritesToRoutines(): Promise<number> {
  const db = await getDb();
  const existing = await db.getAll("routines");
  const known = new Set(existing.map((r) => normalizeKey(r.name)));

  const workoutFavorites = await db.getAllFromIndex(
    "favorites",
    "by-kind",
    "workout"
  );

  let migrated = 0;
  for (const favorite of workoutFavorites) {
    if (known.has(normalizeKey(favorite.label))) continue;

    // Written directly, with no outbox operation: these rows already exist on
    // the server from when they synced as favorites. Re-pushing them would be
    // a round trip that changes nothing.
    await db.put("routines", {
      id: favorite.id,
      name: favorite.label,
      exerciseNames: [],
      position: 0,
      createdAt: favorite.createdAt,
      updatedAt: favorite.createdAt,
    });
    known.add(normalizeKey(favorite.label));
    migrated++;
  }

  return migrated;
}
