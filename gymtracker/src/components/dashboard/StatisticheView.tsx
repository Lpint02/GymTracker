import { useStats } from "../../context/WorkoutContext";
import StatsPanel from "./StatsPanel";
import WeeklyStreakSection from "./WeeklyStreakSection";
import ExerciseProgressSection from "./ExerciseProgressSection";
import TopExercisesSection from "./TopExercisesSection";

/**
 * Statistiche tab — summary stats, weekly streak, per-exercise progress
 * (with PR markers), and the most-performed-exercises leaderboard.
 */
export default function StatisticheView() {
  const { totalWorkouts, lastWorkoutDate, popularMuscleGroup } = useStats();

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-28 space-y-6">
      <StatsPanel
        totalWorkouts={totalWorkouts}
        popularMuscleGroup={popularMuscleGroup}
        lastWorkoutDate={lastWorkoutDate}
      />
      <WeeklyStreakSection />
      <ExerciseProgressSection />
      <TopExercisesSection />
    </main>
  );
}
