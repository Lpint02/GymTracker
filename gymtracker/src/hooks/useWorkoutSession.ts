import { useState, useEffect, useCallback } from "react";
import { WorkoutSession, Exercise, WorkoutSet } from "../types";
import { generateId } from "../lib/utils";

const STORAGE_KEY = "gym_tracker_active_session";

/**
 * Hook that encapsulates all active workout session state and mutations.
 * Handles localStorage persistence internally.
 */
export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persist active session to localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const startSession = useCallback((date: string, muscleGroups: string) => {
    const newSession: WorkoutSession = {
      id: generateId(),
      date: date || new Date().toISOString().split("T")[0],
      muscleGroups: muscleGroups.trim() || "Allenamento Generico",
      exercises: [],
    };
    setSession(newSession);
  }, []);

  const cancelSession = useCallback(() => {
    setSession(null);
  }, []);

  const addExercise = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const newExercise: Exercise = {
        id: generateId(),
        name: "",
        sets: [{ id: generateId(), weight: "", reps: "" }],
      };
      return { ...prev, exercises: [...prev.exercises, newExercise] };
    });
  }, []);

  const updateExerciseName = useCallback(
    (exerciseId: string, name: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, name } : ex
          ),
        };
      });
    },
    []
  );

  const removeExercise = useCallback((exerciseId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.filter((ex) => ex.id !== exerciseId),
      };
    });
  }, []);

  const addSet = useCallback((exerciseId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: WorkoutSet = {
            id: generateId(),
            weight: lastSet ? lastSet.weight : "",
            reps: lastSet ? lastSet.reps : "",
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }),
      };
    });
  }, []);

  const updateSet = useCallback(
    (
      exerciseId: string,
      setId: string,
      field: "reps" | "weight",
      value: number | ""
    ) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s
              ),
            };
          }),
        };
      });
    },
    []
  );

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          return { ...ex, sets: ex.sets.filter((s) => s.id !== setId) };
        }),
      };
    });
  }, []);

  /**
   * Validates, cleans, and finalizes the session for saving.
   * Returns the completed session or null if validation fails.
   */
  const finalizeSession = useCallback((): WorkoutSession | null => {
    if (!session) return null;

    const cleanedExercises = session.exercises
      .map((ex) => ({
        ...ex,
        name: ex.name.trim() || "Esercizio Senza Nome",
        sets: ex.sets.filter((set) => set.weight !== "" || set.reps !== ""),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (cleanedExercises.length === 0) {
      alert(
        "Aggiungi almeno un esercizio con una serie valida (peso o ripetizioni) per salvare l'allenamento."
      );
      return null;
    }

    const completedSession: WorkoutSession = {
      ...session,
      exercises: cleanedExercises,
      completedAt: new Date().toISOString(),
    };

    setSession(null);
    return completedSession;
  }, [session]);

  return {
    session,
    startSession,
    cancelSession,
    addExercise,
    updateExerciseName,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    finalizeSession,
  };
}
