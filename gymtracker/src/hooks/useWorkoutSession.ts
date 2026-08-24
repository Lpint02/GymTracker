import { useState, useEffect, useCallback } from "react";
import { WorkoutSession, Exercise, WorkoutSet } from "../types";
import { generateId } from "../lib/utils";
import { cleanSessionExercises } from "../lib/session";

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

  /**
   * Start a workout.
   *
   * `exerciseNames` comes from a saved routine and pre-creates those exercises,
   * each with one empty set, in order. Nothing is prescribed beyond the names:
   * a routine says which exercises, never how much to lift.
   */
  const startSession = useCallback(
    (date: string, muscleGroups: string, exerciseNames: string[] = []) => {
      const newSession: WorkoutSession = {
        id: generateId(),
        date: date || new Date().toISOString().split("T")[0],
        muscleGroups: muscleGroups.trim() || "Allenamento Generico",
        exercises: exerciseNames
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({
            id: generateId(),
            name,
            sets: [{ id: generateId(), weight: "" as const, reps: "" as const }],
          })),
      };
      setSession(newSession);
    },
    []
  );

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
   * Returns the completed session, or null if there is nothing worth saving.
   *
   * Returning null is silent by design. This hook is a state transition and has
   * no business talking to the user — and it has nothing to add anyway: the
   * save button is disabled under exactly this condition (both now ask
   * `hasLoggedWork`), and the footer already explains why, permanently, right
   * under the button. The alert() that used to live here was a second copy of
   * that same sentence, reachable only if something bypassed the button, and it
   * blocked the main thread to say it — which would have frozen the rest timer.
   */
  const finalizeSession = useCallback((): WorkoutSession | null => {
    if (!session) return null;

    const cleanedExercises = cleanSessionExercises(session);

    if (cleanedExercises.length === 0) {
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
