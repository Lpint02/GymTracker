import { useMemo } from "react";
import { WorkoutSession } from "../types";
import { getMondayOfWeek, getTodayISO } from "../lib/utils";

function addWeeks(mondayKey: string, weeks: number): string {
  const [y, m, d] = mondayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + weeks * 7);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Derives the weekly training streak (Monday-Sunday weeks): current
 * streak and all-time best. A week counts as "trained" if at least one
 * session was logged in it. Pure computation — no side effects.
 */
export function useWeeklyStreak(history: WorkoutSession[]) {
  return useMemo(() => {
    const weekKeys = new Set(
      history.map((session) => getMondayOfWeek(session.date))
    );

    // Current streak: this week not having a session yet doesn't break it
    // (the week isn't over) — start from last week in that case instead.
    const thisWeek = getMondayOfWeek(getTodayISO());
    let cursor = weekKeys.has(thisWeek) ? thisWeek : addWeeks(thisWeek, -1);
    let currentStreak = 0;
    while (weekKeys.has(cursor)) {
      currentStreak++;
      cursor = addWeeks(cursor, -1);
    }

    // Best streak: longest run of consecutive Mondays across all history.
    const sortedWeeks = Array.from(weekKeys).sort();
    let bestStreak = 0;
    let run = 0;
    let prevWeek: string | null = null;
    for (const week of sortedWeeks) {
      if (prevWeek !== null && addWeeks(prevWeek, 1) === week) {
        run++;
      } else {
        run = 1;
      }
      bestStreak = Math.max(bestStreak, run);
      prevWeek = week;
    }

    return { currentStreak, bestStreak };
  }, [history]);
}
