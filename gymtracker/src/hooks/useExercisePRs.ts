import { useMemo } from "react";
import { WorkoutSession } from "../types";
import { ExerciseProgressPoint } from "./useExerciseProgress";
import { normalizeKey } from "../lib/utils";

export interface SessionPRFlags {
  maxWeightPR: boolean;
  bestSetPR: boolean;
}

export interface ExerciseCurrentPR {
  maxWeight: { weight: number; date: string; sessionId: string } | null;
  bestSet: { weight: number; reps: number; score: number; date: string } | null;
}

/**
 * Derives per-exercise personal records (max weight, best single-set
 * weight x reps score) and, for every historical session, whether it set
 * a new record at the time it happened. Single linear pass, memoized on
 * [history, progressByExercise] — consumers do O(1) lookups per session
 * afterward instead of rescanning history per card.
 *
 * A record can never be set on an exercise's very first-ever logged
 * occurrence — there's nothing prior to beat, it just establishes the
 * baseline.
 */
export function useExercisePRs(
  history: WorkoutSession[],
  progressByExercise: Record<string, ExerciseProgressPoint[]>
) {
  return useMemo(() => {
    const sessionPRs: Record<string, Record<string, SessionPRFlags>> = {};
    const currentPRsByExercise: Record<string, ExerciseCurrentPR> = {};

    // sessionPRs is keyed by the normalized (trim+lowercase) exercise key,
    // not the display label — a session can log an exercise with different
    // casing than the label's first-ever occurrence, and lookups from any
    // consumer (HistoryWorkoutCard, PastWorkoutDetailModal) only have that
    // session's own casing on hand, not the canonical label.
    const setFlag = (
      sessionId: string,
      key: string,
      field: keyof SessionPRFlags
    ) => {
      if (!sessionPRs[sessionId]) sessionPRs[sessionId] = {};
      if (!sessionPRs[sessionId][key]) {
        sessionPRs[sessionId][key] = {
          maxWeightPR: false,
          bestSetPR: false,
        };
      }
      sessionPRs[sessionId][key][field] = true;
    };

    // key: lowercase-trimmed name -> label, matching progressByExercise's
    // own casing convention so both categories share one label per exercise
    const keyToLabel: Record<string, string> = {};
    for (const label of Object.keys(progressByExercise)) {
      keyToLabel[normalizeKey(label)] = label;
    }

    // ── Category (a): max weight — reuses useExerciseProgress's data ──
    for (const [label, points] of Object.entries(progressByExercise)) {
      const key = normalizeKey(label);
      let best: { weight: number; date: string; sessionId: string } | null =
        null;
      for (const point of points) {
        if (!best) {
          best = {
            weight: point.maxWeight,
            date: point.date,
            sessionId: point.sessionId,
          };
        } else if (point.maxWeight > best.weight) {
          best = {
            weight: point.maxWeight,
            date: point.date,
            sessionId: point.sessionId,
          };
          setFlag(point.sessionId, key, "maxWeightPR");
        }
      }
      currentPRsByExercise[label] = { maxWeight: best, bestSet: null };
    }

    const bestSetRunning: Record<
      string,
      { weight: number; reps: number; score: number; date: string }
    > = {};

    // history is newest-first; walk in reverse for chronological order
    for (let i = history.length - 1; i >= 0; i--) {
      const session = history[i];
      for (const exercise of session.exercises) {
        const key = normalizeKey(exercise.name);
        const label = keyToLabel[key];
        if (!label) continue; // no valid weight ever logged for this exercise

        let sessionBest: { weight: number; reps: number; score: number } | null =
          null;
        for (const set of exercise.sets) {
          if (set.weight === "" || set.reps === "") continue;
          const score = set.weight * set.reps;
          if (!sessionBest || score > sessionBest.score) {
            sessionBest = { weight: set.weight, reps: set.reps, score };
          }
        }
        if (!sessionBest) continue;

        const running = bestSetRunning[key];
        if (!running) {
          bestSetRunning[key] = { ...sessionBest, date: session.date };
        } else if (sessionBest.score > running.score) {
          bestSetRunning[key] = { ...sessionBest, date: session.date };
          setFlag(session.id, key, "bestSetPR");
        }
      }
    }

    for (const [key, label] of Object.entries(keyToLabel)) {
      const running = bestSetRunning[key];
      if (running) {
        currentPRsByExercise[label].bestSet = running;
      }
    }

    return { sessionPRs, currentPRsByExercise };
  }, [history, progressByExercise]);
}
