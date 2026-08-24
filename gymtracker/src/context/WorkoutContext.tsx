import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import { useWorkoutHistory } from "../hooks/useWorkoutHistory";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useFavoritesList } from "../hooks/useFavoritesList";
import { useExerciseProgress } from "../hooks/useExerciseProgress";
import { useWeeklyStreak } from "../hooks/useWeeklyStreak";
import { useExercisePRs } from "../hooks/useExercisePRs";
import type { WorkoutSession } from "../types";

const WORKOUT_FAVORITES_KEY = "gym_tracker_favorites";
const EXERCISE_FAVORITES_KEY = "gym_tracker_favorite_exercises";

// ── Types ───────────────────────────────────────────────────────────────

type WorkoutSessionAPI = ReturnType<typeof useWorkoutSession>;
type WorkoutHistoryAPI = ReturnType<typeof useWorkoutHistory>;
type DashboardStatsAPI = ReturnType<typeof useDashboardStats>;
type FavoritesListAPI = ReturnType<typeof useFavoritesList>;
type ExerciseProgressAPI = ReturnType<typeof useExerciseProgress>;
type WeeklyStreakAPI = ReturnType<typeof useWeeklyStreak>;
type ExercisePRsAPI = ReturnType<typeof useExercisePRs>;

interface WorkoutContextValue {
  /** Active session state & mutations */
  sessionAPI: WorkoutSessionAPI;
  /** History CRUD, search, selection */
  historyAPI: WorkoutHistoryAPI;
  /** Derived dashboard statistics */
  stats: DashboardStatsAPI;
  /** Favorite workout-name/muscle-group shortcuts */
  favoritesAPI: FavoritesListAPI;
  /** Favorite exercise-name shortcuts */
  exerciseFavoritesAPI: FavoritesListAPI;
  /** Derived per-exercise progress-over-time series */
  progressAPI: ExerciseProgressAPI;
  /** Derived weekly training streak (current + best) */
  streakAPI: WeeklyStreakAPI;
  /** Derived per-exercise personal records */
  prAPI: ExercisePRsAPI;
  /**
   * Finalize the active session, clean it, and add it to history.
   * This bridges the session and history hooks.
   */
  saveSession: () => void;
}

// ── Context ─────────────────────────────────────────────────────────────

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const sessionAPI = useWorkoutSession();
  const historyAPI = useWorkoutHistory();
  const stats = useDashboardStats(historyAPI.history);
  const favoritesAPI = useFavoritesList(WORKOUT_FAVORITES_KEY);
  const exerciseFavoritesAPI = useFavoritesList(EXERCISE_FAVORITES_KEY);
  const progressAPI = useExerciseProgress(historyAPI.history);
  const streakAPI = useWeeklyStreak(historyAPI.history);
  const prAPI = useExercisePRs(historyAPI.history, progressAPI.progressByExercise);

  const saveSession = useCallback(() => {
    const completed = sessionAPI.finalizeSession();
    if (completed) {
      historyAPI.addToHistory(completed);
    }
  }, [sessionAPI, historyAPI]);

  return (
    <WorkoutContext.Provider
      value={{
        sessionAPI,
        historyAPI,
        stats,
        favoritesAPI,
        exerciseFavoritesAPI,
        progressAPI,
        streakAPI,
        prAPI,
        saveSession,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

// ── Consumer hooks ──────────────────────────────────────────────────────

function useWorkoutContext(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }
  return ctx;
}

/** Access active session state and mutations */
export function useSession() {
  return useWorkoutContext().sessionAPI;
}

/** Access workout history, search, and selection */
export function useHistory() {
  return useWorkoutContext().historyAPI;
}

/** Access derived dashboard statistics */
export function useStats() {
  return useWorkoutContext().stats;
}

/** Access favorite workout-name/muscle-group shortcuts */
export function useFavorites() {
  return useWorkoutContext().favoritesAPI;
}

/** Access favorite exercise-name shortcuts */
export function useExerciseFavorites() {
  return useWorkoutContext().exerciseFavoritesAPI;
}

/** Access derived per-exercise progress-over-time series */
export function useProgress() {
  return useWorkoutContext().progressAPI;
}

/** Access derived weekly training streak (current + best) */
export function useStreak() {
  return useWorkoutContext().streakAPI;
}

/** Access derived per-exercise personal records */
export function usePRs() {
  return useWorkoutContext().prAPI;
}

/** Save current session to history (bridge between the two hooks) */
export function useSaveSession() {
  return useWorkoutContext().saveSession;
}
