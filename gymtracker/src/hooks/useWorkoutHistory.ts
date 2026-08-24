import { useState, useEffect, useCallback } from "react";
import { WorkoutSession } from "../types";

const STORAGE_KEY = "gym_tracker_history";

/**
 * Hook that encapsulates workout history CRUD, search/filter, and localStorage persistence.
 */
export function useWorkoutHistory() {
  const [history, setHistory] = useState<WorkoutSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPastWorkout, setSelectedPastWorkout] =
    useState<WorkoutSession | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

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
    setHistory((prev) => [session, ...prev]);
  }, []);

  const deleteWorkout = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (selectedPastWorkout?.id === id) {
        setSelectedPastWorkout(null);
      }
      setConfirmDeleteId(null);
    },
    [selectedPastWorkout]
  );

  return {
    history,
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
