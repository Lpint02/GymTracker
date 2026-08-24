import { getDb } from "../db";
import { sortSessionsNewestFirst } from "./order";
import { enqueueInTransaction } from "../sync/outbox";
import { toSessionPayload, assertValidSession } from "../sync/mappers";
import type { WorkoutSession } from "../../types";

/**
 * Persistence for completed workouts.
 *
 * Every mutation writes the data AND its sync operation in a single IndexedDB
 * transaction. That is the invariant the whole offline story rests on: the two
 * commit together or not at all, so there can never be an unsynced workout with
 * no queued operation, nor an operation for data that is not there. Nothing is
 * ever "waiting to be enqueued" when the tab dies.
 */

export async function getAllSessions(): Promise<WorkoutSession[]> {
  const db = await getDb();
  const rows = await db.getAll("sessions");
  return sortSessionsNewestFirst(rows);
}

export async function putSession(session: WorkoutSession): Promise<void> {
  // Validate BEFORE the write, not after the network. A malformed session
  // would come back as a permanent 22P02 and park itself in the queue; failing
  // here surfaces it while the user is still looking at the app.
  assertValidSession(session);

  const db = await getDb();
  const tx = db.transaction(["sessions", "outbox"], "readwrite");

  await tx.objectStore("sessions").put(session);
  await enqueueInTransaction(tx.objectStore("outbox"), {
    entity: "session",
    op: "upsert",
    entityId: session.id,
    payload: toSessionPayload(session),
  });

  await tx.done;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["sessions", "outbox"], "readwrite");

  await tx.objectStore("sessions").delete(id);
  // Coalescing inside enqueue drops any pending upsert for this id first, so we
  // never push a workout we have already deleted and then delete it again.
  await enqueueInTransaction(tx.objectStore("outbox"), {
    entity: "session",
    op: "delete",
    entityId: id,
    payload: null,
  });

  await tx.done;
}
