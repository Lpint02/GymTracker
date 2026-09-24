import {
  getDb,
  type OutboxEntity,
  type OutboxOp,
  type OutboxRecord,
} from "../db";
import { generateId } from "../utils";

/**
 * The durable queue of changes that have not reached the server yet.
 *
 * The invariant everything else rests on: an operation is written in the SAME
 * IndexedDB transaction as the data it describes. Nothing is ever "waiting to
 * be enqueued" when the tab dies, so delivery is at-least-once across crashes,
 * OS kills and reboots — the queue simply replays on next boot.
 *
 * Payloads are full snapshots, never deltas. Combined with upsert-by-primary-
 * key on the server, replaying an operation any number of times converges on
 * the same row, which turns at-least-once delivery into effectively-once for
 * free — no dedupe table, no server-side bookkeeping.
 */

export interface EnqueueInput {
  entity: OutboxEntity;
  op: OutboxOp;
  entityId: string;
  /** Full snapshot for upserts; null for deletes. */
  payload: unknown;
}

function newRecord(input: EnqueueInput): OutboxRecord {
  return {
    opId: generateId(),
    entity: input.entity,
    op: input.op,
    entityId: input.entityId,
    payload: input.payload,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
    status: "pending",
    lastError: null,
  };
}

/**
 * Queue an operation, superseding everything already queued for the same
 * entity — pending AND parked.
 *
 * Coalescing is not just an optimisation. Editing the same routine five times
 * offline should cost one write, and — more importantly — a delete must remove
 * any pending upsert for that id, so we never push a row we have already
 * deleted locally and then delete it again.
 *
 * Parked (`failed`) rows are superseded too, and that is the part that matters
 * for correctness. Payloads are full snapshots, so the newest operation for an
 * entity already says everything an older one did. Leaving an old one parked
 * means a later "Riprova" replays it AFTER the newer one has synced: a stale
 * upsert overwrites a newer edit, or resurrects a workout the user deleted.
 * This is the only point where both operations are guaranteed to exist — once
 * the newer one syncs it leaves the queue, and the conflict is invisible.
 *
 * Nothing is lost by it. The data itself lives in its own store, written in
 * this same transaction; what goes is an instruction that no longer describes
 * what the user wants. If the new operation fails in turn, it parks with its
 * own, current error.
 */
export async function enqueue(input: EnqueueInput): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  await enqueueInTransaction(tx.objectStore("outbox"), input);
  await tx.done;
}

/**
 * Enqueue inside a caller-owned transaction, so the data write and the queue
 * write commit or fail together. Prefer this over `enqueue` for mutations.
 */
export async function enqueueInTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outboxStore: any,
  input: EnqueueInput
): Promise<void> {
  const existing = await outboxStore
    .index("by-entity")
    .getAll([input.entity, input.entityId]);

  for (const row of existing as OutboxRecord[]) {
    if (row.seq !== undefined) await outboxStore.delete(row.seq);
  }

  await outboxStore.add(newRecord(input));
}

/** Everything still queued, oldest first — `seq` is the FIFO order. */
export async function getAllOperations(): Promise<OutboxRecord[]> {
  const db = await getDb();
  return db.getAll("outbox");
}

export async function countByStatus(
  status: "pending" | "failed"
): Promise<number> {
  const db = await getDb();
  return db.countFromIndex("outbox", "by-status", status);
}

export async function removeOperation(seq: number): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", seq);
}

/**
 * Rewrite an operation, but only if it is still queued.
 *
 * The drainer holds a record across a network round trip. If the user saves
 * the same entity meanwhile, enqueue supersedes that record; a blind put()
 * when the request then fails would recreate it, stale payload and all.
 */
export async function updateOperation(record: OutboxRecord): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  if (await tx.store.get(record.seq!)) await tx.store.put(record);
  await tx.done;
}

/** Put every parked operation back in line, with its attempt count reset. */
export async function retryFailedOperations(): Promise<number> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  const failed = await store.index("by-status").getAll("failed");

  for (const row of failed) {
    await store.put({
      ...row,
      status: "pending" as const,
      attempts: 0,
      nextAttemptAt: 0,
      lastError: null,
    });
  }

  await tx.done;
  return failed.length;
}

/**
 * Discard one operation permanently.
 *
 * Only ever driven by an explicit user choice about a specific parked
 * operation. The engine never drops anything on its own — silently discarding
 * a workout that exists nowhere else is the one outcome this whole design is
 * built to prevent.
 */
export async function discardOperation(seq: number): Promise<void> {
  await removeOperation(seq);
}
