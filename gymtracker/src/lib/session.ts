import type { WorkoutSession, WorkoutSet } from "../types";

/**
 * Domain rules about what makes a workout worth saving.
 *
 * These live here rather than inside a component or a hook because two places
 * need to agree on them exactly: the footer decides whether the save button is
 * enabled, and finalizeSession decides whether there is anything to save. When
 * those were written separately they had to be kept in step by hand — a comment
 * in the view literally asked the next reader to do that.
 */

/** A set counts if the user entered a weight or a rep count. */
export function isSetLogged(set: WorkoutSet): boolean {
  return set.weight !== "" || set.reps !== "";
}

/**
 * Is there anything here worth recording?
 *
 * Note this is false for a session with no exercises at all, since `.every()`
 * over an empty array is true — which is the behaviour we want: an untouched
 * session is not savable.
 */
export function hasLoggedWork(session: WorkoutSession): boolean {
  return session.exercises.some((exercise) => exercise.sets.some(isSetLogged));
}

/**
 * Strip a session down to what is worth keeping: sets the user actually filled
 * in, exercises that still have at least one, and a name for anything left
 * unnamed.
 */
export function cleanSessionExercises(
  session: WorkoutSession
): WorkoutSession["exercises"] {
  return session.exercises
    .map((exercise) => ({
      ...exercise,
      name: exercise.name.trim() || "Esercizio Senza Nome",
      sets: exercise.sets.filter(isSetLogged),
    }))
    .filter((exercise) => exercise.sets.length > 0);
}
