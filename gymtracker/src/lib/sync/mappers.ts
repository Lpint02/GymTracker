import type { WorkoutSession } from "../../types";
import type { FavoriteRecord } from "../db";

/**
 * The single place where the domain model and the database representation are
 * translated into each other.
 *
 * This file exists because of one detail: WorkoutSet.weight and .reps are
 * `number | ""`, where `""` means empty. Postgres columns are `numeric` and
 * `int`, where empty is NULL. If a `""` ever reaches the network the request
 * fails with 22P02 invalid input syntax — which the sync engine classifies as
 * permanent, so the operation is parked forever rather than retried.
 *
 * With no type checker enforcing the boundary at build time, the defence is to
 * keep the conversion in exactly one place and validate before enqueuing rather
 * than after the network. Do not inline `=== ""` checks in callers.
 */

/** Domain `number | ""` -> column value. */
function toNullable(value: number | ""): number | null {
  return value === "" ? null : value;
}

/** Column value -> domain `number | ""`. */
function fromNullable(value: number | null | undefined): number | "" {
  return value === null || value === undefined ? "" : Number(value);
}

/** Shape accepted by the `sync_upsert_session` RPC. */
export interface SessionPayload {
  id: string;
  date: string;
  muscleGroups: string;
  completedAt: string;
  exercises: {
    id: string;
    name: string;
    sets: { id: string; weight: number | null; reps: number | null }[];
  }[];
}

export function toSessionPayload(session: WorkoutSession): SessionPayload {
  return {
    id: session.id,
    date: session.date,
    muscleGroups: session.muscleGroups,
    // completedAt is optional on the type (absent means in-progress), but only
    // completed sessions are ever synced. assertValidSession enforces that.
    completedAt: session.completedAt as string,
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        weight: toNullable(set.weight),
        reps: toNullable(set.reps),
      })),
    })),
  };
}

/** Rebuilds the domain object from what `export_user_data` returns. */
export function fromSessionPayload(raw: SessionPayload): WorkoutSession {
  return {
    id: raw.id,
    date: raw.date,
    muscleGroups: raw.muscleGroups ?? "",
    completedAt: raw.completedAt,
    exercises: (raw.exercises ?? []).map((exercise) => ({
      id: exercise.id,
      name: exercise.name ?? "",
      sets: (exercise.sets ?? []).map((set) => ({
        id: set.id,
        weight: fromNullable(set.weight),
        reps: fromNullable(set.reps),
      })),
    })),
  };
}

/**
 * Thrown when a session could never be accepted by the database. Raised at
 * enqueue time so a malformed record is rejected while the user is still
 * looking at the app, instead of becoming a poisoned queue entry later.
 */
export class InvalidSessionError extends Error {}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertValidSession(session: WorkoutSession): void {
  const fail = (why: string): never => {
    throw new InvalidSessionError(`${why} (sessione ${session.id})`);
  };

  // Entities created before the switch to crypto.randomUUID() carry 7-char ids
  // that a `uuid` column rejects outright. Catch them here rather than as a
  // permanent 22P02 from the server.
  if (!UUID_RE.test(session.id)) fail("id sessione non è un UUID");
  if (!DATE_RE.test(session.date)) fail("data non in formato YYYY-MM-DD");
  if (!session.completedAt) fail("sessione non completata");

  for (const exercise of session.exercises) {
    if (!UUID_RE.test(exercise.id)) fail(`id esercizio non è un UUID`);
    for (const set of exercise.sets) {
      if (!UUID_RE.test(set.id)) fail(`id serie non è un UUID`);
      // Mirrors the workout_sets_not_empty check constraint. finalizeSession
      // already drops these, but the constraint violation would be permanent.
      if (set.weight === "" && set.reps === "") {
        fail("una serie non ha né peso né ripetizioni");
      }
    }
  }
}

// ── Favorites ────────────────────────────────────────────────────────────────

/**
 * Favorites split across two tables by kind.
 *
 * Exercise-name favorites map to exercise_favorites. Workout-name favorites map
 * to routine_favorites: a routine's name IS the workout name, and a routine
 * with no items behaves exactly like today's name pill. That is why there is no
 * separate third table — the routine UI arriving later fills in the items.
 */
export type FavoriteKindTag = FavoriteRecord["kind"];

export function favoriteTable(kind: FavoriteKindTag): string {
  return kind === "exercise" ? "exercise_favorites" : "routine_favorites";
}

/**
 * Queue payload for a favorite.
 *
 * `kind` travels with the operation — including on deletes, whose payload is
 * otherwise empty — because it is what decides which table to act on. Without
 * it, a queued delete replayed after a reload would have no way to know where
 * the row lives.
 */
export interface FavoritePayload {
  kind: FavoriteKindTag;
  row?: Record<string, unknown>;
}

export function toFavoritePayload(favorite: FavoriteRecord): FavoritePayload {
  // user_id is intentionally absent from the row: the column defaults to
  // auth.uid() and the RLS policy pins it. A client that sends it could send
  // anyone's.
  return {
    kind: favorite.kind,
    row:
      favorite.kind === "exercise"
        ? { id: favorite.id, label: favorite.label }
        : { id: favorite.id, name: favorite.label },
  };
}
