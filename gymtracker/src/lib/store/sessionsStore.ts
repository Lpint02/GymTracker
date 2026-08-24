import { getDb } from "../db";
import { sortSessionsNewestFirst } from "./order";
import type { WorkoutSession } from "../../types";

/**
 * Persistence for completed workouts. Plain async functions, no React — the
 * hook layer owns the state, this layer owns the storage.
 *
 * Writes here will later be paired with an outbox enqueue inside a single
 * transaction (see db.ts). Until the sync engine lands these are plain puts.
 */

export async function getAllSessions(): Promise<WorkoutSession[]> {
  const db = await getDb();
  const rows = await db.getAll("sessions");
  return sortSessionsNewestFirst(rows);
}

export async function putSession(session: WorkoutSession): Promise<void> {
  const db = await getDb();
  await db.put("sessions", session);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("sessions", id);
}
