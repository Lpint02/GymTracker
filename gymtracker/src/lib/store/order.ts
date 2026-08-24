import type { WorkoutSession } from "../../types";

/**
 * Order completed workouts newest-first.
 *
 * Every derivation hook depends on this ordering: useDashboardStats reads
 * history[0] as "last workout", and useExerciseProgress walks the array in
 * reverse specifically to build its series oldest-first, which in turn is what
 * makes useExercisePRs' first-occurrence-is-never-a-PR logic correct.
 *
 * This is a deliberate behavior change from the localStorage implementation,
 * and it is a bug fix. That version ordered by INSERTION (addToHistory
 * prepended), so a backdated workout landed at index 0 — reported as the most
 * recent workout, and fed to the progress walk out of chronological order,
 * corrupting PR detection. Ordering by date fixes all three at once.
 *
 * IndexedDB also has no insertion order to fall back on, so the ordering has to
 * be explicit at read time regardless.
 *
 * Note we do NOT read the `by-date` index in reverse instead: IDB breaks index
 * ties by primary key, and ours are random UUIDs, so two workouts sharing a
 * date would come back in arbitrary — and unstable — order between reloads.
 * A three-level comparator over a few hundred rows costs microseconds and is
 * deterministic.
 *
 * `YYYY-MM-DD` and ISO-8601 both sort correctly as plain strings, so there is
 * no Date parsing here and therefore no timezone exposure.
 */
export function sortSessionsNewestFirst(
  sessions: WorkoutSession[]
): WorkoutSession[] {
  return [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.completedAt ?? "").localeCompare(a.completedAt ?? "") ||
      // Total order, so the result is stable across reloads.
      a.id.localeCompare(b.id)
  );
}
