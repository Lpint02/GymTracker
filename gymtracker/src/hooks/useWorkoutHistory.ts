import { useState, useEffect, useCallback } from "react";
import { WorkoutSession } from "../types";
import {
  getAllSessions,
  putSession,
  deleteSession,
} from "../lib/store/sessionsStore";
import { sortSessionsNewestFirst } from "../lib/store/order";
import { reportStorageError } from "../lib/store/errors";

/**
 * Hook that encapsulates workout history CRUD, search/filter, and persistence.
 *
 * Storage moved from localStorage to IndexedDB (see lib/db.ts), but the return
 * shape is unchanged apart from the additive `isLoading`. That matters: the
 * context types this as `ReturnType<typeof useWorkoutHistory>`, so this object
 * IS the contract that eight components destructure from.
 *
 * The four pure derivation hooks (stats, progress, streak, PRs) still receive a
 * plain synchronous `WorkoutSession[]`. They see an empty array while hydrating
 * and the real one after — so their logic needed no changes at all.
 */
export function useWorkoutHistory() {
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPastWorkout, setSelectedPastWorkout] =
    useState<WorkoutSession | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Hydrate once from IndexedDB. The `cancelled` flag is not ceremony: React
  // StrictMode double-invokes this effect in development.
  useEffect(() => {
    let cancelled = false;

    getAllSessions()
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((error) => reportStorageError("lettura dello storico", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered history based on search term
  const filteredHistory = history.filter((session) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchesMuscle = session.muscleGroups.toLowerCase().includes(term);
    const matchesExercises = session.exercises.some((ex) =>
      ex.name.toLowerCase().includes(term)
    );
    const matchesDate = session.date.includes(term);
    return matchesMuscle || matchesExercises || matchesDate;
  });

  const addToHistory = useCallback((session: WorkoutSession) => {
    // Optimistic and synchronous, so the UI is instant and the list's exit
    // animations behave exactly as before. The durable write follows.
    setHistory((prev) => sortSessionsNewestFirst([session, ...prev]));

    void putSession(session).catch((error) =>
      reportStorageError(`salvataggio dell'allenamento ${session.id}`, error)
    );
  }, []);

  const deleteWorkout = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (selectedPastWorkout?.id === id) {
        setSelectedPastWorkout(null);
      }
      setConfirmDeleteId(null);

      void deleteSession(id).catch((error) =>
        reportStorageError(`eliminazione dell'allenamento ${id}`, error)
      );
    },
    [selectedPastWorkout]
  );

  return {
    history,
    isLoading,
    searchTerm,
    setSearchTerm,
    filteredHistory,
    addToHistory,
    deleteWorkout,
    selectedPastWorkout,
    setSelectedPastWorkout,
    confirmDeleteId,
    setConfirmDeleteId,
  };
}
