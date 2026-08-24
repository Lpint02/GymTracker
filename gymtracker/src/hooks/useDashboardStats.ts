import { useMemo } from "react";
import { WorkoutSession } from "../types";
import { formatDateItalian } from "../lib/utils";

/**
 * Hook that derives dashboard statistics from workout history.
 * Pure computation — no side effects.
 */
export function useDashboardStats(history: WorkoutSession[]) {
  return useMemo(() => {
    const totalWorkouts = history.length;

    const lastWorkoutDate = history[0]
      ? formatDateItalian(history[0].date)
      : "Nessuno";

    // Find most popular muscle group
    let popularMuscleGroup = "Nessuno";
    if (history.length > 0) {
      const counts: Record<string, number> = {};
      history.forEach((session) => {
        const mg = session.muscleGroups.trim().toLowerCase();
        if (mg) {
          counts[mg] = (counts[mg] || 0) + 1;
        }
      });

      let maxCount = 0;
      Object.entries(counts).forEach(([mg, count]) => {
        if (count > maxCount) {
          maxCount = count;
          // Preserve original casing from the first match
          const original =
            history.find(
              (h) => h.muscleGroups.trim().toLowerCase() === mg
            )?.muscleGroups || mg;
          popularMuscleGroup = original;
        }
      });
    }

    return { totalWorkouts, lastWorkoutDate, popularMuscleGroup };
  }, [history]);
}
