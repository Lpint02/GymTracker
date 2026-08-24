import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import { useWorkoutHistory } from "../hooks/useWorkoutHistory";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useFavoritesList } from "../hooks/useFavoritesList";
import { useRoutines } from "../hooks/useRoutines";
import { useExerciseProgress } from "../hooks/useExerciseProgress";
import { useWeeklyStreak } from "../hooks/useWeeklyStreak";
import { useExercisePRs } from "../hooks/useExercisePRs";

// ── Types ───────────────────────────────────────────────────────────────

type WorkoutSessionAPI = ReturnType<typeof useWorkoutSession>;
type WorkoutHistoryAPI = ReturnType<typeof useWorkoutHistory>;
type DashboardStatsAPI = ReturnType<typeof useDashboardStats>;
type FavoritesListAPI = ReturnType<typeof useFavoritesList>;
type RoutinesAPI = ReturnType<typeof useRoutines>;
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
  /**
   * Saved routines: a workout name plus an ordered list of exercise names.
   * Replaced the workout-name favorites list — a routine with no exercises
   * behaves exactly like the old name pill, so there is one list, not two.
   */
  routinesAPI: RoutinesAPI;
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
  const routinesAPI = useRoutines();
  const exerciseFavoritesAPI = useFavoritesList("exercise");
  const progressAPI = useExerciseProgress(historyAPI.history);
  const streakAPI = useWeeklyStreak(historyAPI.history);
  const prAPI = useExercisePRs(historyAPI.history, progressAPI.progressByExercise);

  const saveSession = useCallback(() => {
    const completed = sessionAPI.finalizeSession();
    if (completed) {
      historyAPI.addToHistory(completed);
    }
  }, [sessionAPI, historyAPI]);

  // KNOWN ISSUE — do not "fix" this by wrapping the literal below in useMemo.
  //
  // That memo would never hit. useWorkoutSession, useWorkoutHistory and the two
  // useFavoritesList instances each return a fresh object literal on every
  // render, so the dependency array changes every time regardless. (The four
  // derivation hooks are already stable — they return useMemo results.)
  //
  // The consequence today: any state change re-renders every consumer, so a
  // keystroke in the history search box re-renders the recharts SVG in
  // ExerciseProgressSection. Making this real means memoizing the return object
  // of each stateful hook first; a memo here without that is decoration.
  //
  // This is also why sync status must NOT be added to this context: it would
  // put a value that ticks during background sync behind the same broadcast.
  return (
    <WorkoutContext.Provider
      value={{
        sessionAPI,
        historyAPI,
        stats,
        routinesAPI,
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

/** Access saved routines (workout name + ordered exercise names) */
export function useRoutinesList() {
  return useWorkoutContext().routinesAPI;
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
