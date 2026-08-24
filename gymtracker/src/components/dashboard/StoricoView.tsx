import { useHistory } from "../../context/WorkoutContext";
import HistoryList from "./HistoryList";
import PastWorkoutDetailModal from "../shared/PastWorkoutDetailModal";
import { AnimatePresence } from "motion/react";

/**
 * Storico tab — full workout history, search, and past-workout detail.
 */
export default function StoricoView() {
  const { selectedPastWorkout, setSelectedPastWorkout } = useHistory();

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-28">
      <HistoryList />

      <AnimatePresence>
        {selectedPastWorkout && (
          <PastWorkoutDetailModal
            workout={selectedPastWorkout}
            onClose={() => setSelectedPastWorkout(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
