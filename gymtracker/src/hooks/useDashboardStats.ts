import { useMemo } from "react";
import { WorkoutSession } from "../types";
import { formatDateItalian, normalizeKey, displayLabel } from "../lib/utils";

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
        const mg = normalizeKey(session.muscleGroups);
        if (mg) {
          counts[mg] = (counts[mg] || 0) + 1;
        }
      });

      let maxCount = 0;
      Object.entries(counts).forEach(([mg, count]) => {
        if (count > maxCount) {
          maxCount = count;
          // Preserve the user's own casing rather than showing the lowercased
          // grouping key. Trimmed on the way out: the raw value was displayed
          // untrimmed here, so a group saved as " Petto " rendered with its
          // padding intact.
          const match = history.find(
            (h) => normalizeKey(h.muscleGroups) === mg
          )?.muscleGroups;
          popularMuscleGroup = match ? displayLabel(match) : mg;
        }
      });
    }

    return { totalWorkouts, lastWorkoutDate, popularMuscleGroup };
  }, [history]);
}
