import { useMemo } from "react";
import { WorkoutSession } from "../types";
import { normalizeKey, displayLabel } from "../lib/utils";

export interface ExerciseProgressPoint {
  sessionId: string;
  date: string; // session.date (YYYY-MM-DD)
  maxWeight: number;
  repsAtMax: number;
}

/**
 * Derives per-exercise "top weight per session" progress series from
 * workout history. Pure computation — no side effects.
 */
export function useExerciseProgress(history: WorkoutSession[]) {
  return useMemo(() => {
    // key: lowercase-trimmed name -> { label: original casing, points }
    const byExercise: Record<
      string,
      { label: string; points: ExerciseProgressPoint[] }
    > = {};

    // history is newest-first; walk in reverse so points build up oldest-first
    for (let i = history.length - 1; i >= 0; i--) {
      const session = history[i];

      for (const exercise of session.exercises) {
        const key = normalizeKey(exercise.name);
        if (!key) continue;

        let best: { weight: number; reps: number } | null = null;
        for (const set of exercise.sets) {
          if (set.weight === "") continue;
          const weight = set.weight;
          const reps = set.reps === "" ? 0 : set.reps;
          if (
            !best ||
            weight > best.weight ||
            (weight === best.weight && reps > best.reps)
          ) {
            best = { weight, reps };
          }
        }
        if (!best) continue;

        if (!byExercise[key]) {
          byExercise[key] = { label: displayLabel(exercise.name), points: [] };
        }
        byExercise[key].points.push({
          sessionId: session.id,
          date: session.date,
          maxWeight: best.weight,
          repsAtMax: best.reps,
        });
      }
    }

    const exerciseNames = Object.values(byExercise)
      .map((e) => e.label)
      .sort((a, b) => a.localeCompare(b));

    const progressByExercise: Record<string, ExerciseProgressPoint[]> = {};
    for (const { label, points } of Object.values(byExercise)) {
      progressByExercise[label] = points;
    }

    return { exerciseNames, progressByExercise };
  }, [history]);
}
