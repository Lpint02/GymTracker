import { useState, useEffect, useCallback } from "react";
import type { RoutineRecord } from "../lib/db";
import {
  getAllRoutines,
  putRoutine,
  deleteRoutine,
  migrateWorkoutFavoritesToRoutines,
} from "../lib/store/routinesStore";
import { reportStorageError } from "../lib/store/errors";
import { requestFlush } from "../lib/sync/engine";
import { generateId, normalizeKey, displayLabel } from "../lib/utils";

/**
 * Saved routines: a workout name plus an ordered list of exercise names.
 *
 * This replaced the workout-name favorites list rather than sitting beside it.
 * A routine with no exercises behaves exactly like the old name pill, so
 * nothing regressed and there is one list instead of two.
 *
 * Names stay free text — no enum, no autocorrection. Duplicates are prevented
 * by the shared normalizeKey convention, which the database enforces
 * independently through the generated name_key column.
 */
export function useRoutines() {
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    migrateWorkoutFavoritesToRoutines()
      .then(() => getAllRoutines())
      .then((rows) => {
        if (!cancelled) setRoutines(rows);
      })
      .catch((error) => reportStorageError("lettura delle routine", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const findByName = useCallback(
    (name: string): RoutineRecord | undefined => {
      const key = normalizeKey(name);
      if (!key) return undefined;
      return routines.find((r) => normalizeKey(r.name) === key);
    },
    [routines]
  );

  const isSaved = useCallback(
    (name: string) => findByName(name) !== undefined,
    [findByName]
  );

  /**
   * Create or update a routine by name.
   *
   * Keyed by name rather than id so saving "Petto" twice edits the existing
   * routine instead of creating a second one the database would reject with a
   * unique-violation.
   */
  const saveRoutine = useCallback(
    (name: string, exerciseNames: string[] = []) => {
      const label = displayLabel(name);
      if (!label) return;

      const existing = findByName(label);
      const now = new Date().toISOString();
      const record: RoutineRecord = existing
        ? { ...existing, name: label, exerciseNames, updatedAt: now }
        : {
            id: generateId(),
            name: label,
            exerciseNames,
            position: routines.length,
            createdAt: now,
            updatedAt: now,
          };

      setRoutines((prev) => {
        const rest = prev.filter((r) => r.id !== record.id);
        return [...rest, record].sort(
          (a, b) => a.position - b.position || a.id.localeCompare(b.id)
        );
      });

      void putRoutine(record)
        .then(() => requestFlush())
        .catch((error) =>
          reportStorageError(`salvataggio della routine ${record.id}`, error)
        );
    },
    [findByName, routines.length]
  );

  const removeRoutine = useCallback((id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    void deleteRoutine(id)
      .then(() => requestFlush())
      .catch((error) =>
        reportStorageError(`eliminazione della routine ${id}`, error)
      );
  }, []);

  /**
   * Toggle a routine on or off — the star gesture.
   *
   * `exerciseNames` is REQUIRED rather than defaulted. It used to be optional,
   * which meant the star saved an empty routine and silently discarded whatever
   * the user had just prepared on screen. A default that quietly throws data
   * away is worse than an argument the caller has to think about.
   */
  const toggleRoutine = useCallback(
    (name: string, exerciseNames: string[]) => {
      const existing = findByName(name);
      if (existing) removeRoutine(existing.id);
      else saveRoutine(name, exerciseNames);
    },
    [findByName, removeRoutine, saveRoutine]
  );

  return {
    routines,
    isLoading,
    isSaved,
    findByName,
    saveRoutine,
    removeRoutine,
    toggleRoutine,
  };
}
