import { useState } from "react";
import { useSession } from "../../context/WorkoutContext";
import HeroStartCard from "./HeroStartCard";
import SetupSessionModal from "./SetupSessionModal";

/**
 * Home tab — the entry point for starting a new workout session.
 */
export default function HomeView() {
  const { startSession } = useSession();
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const handleStartSession = (date: string, muscleGroups: string) => {
    startSession(date, muscleGroups);
    setIsSetupOpen(false);
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-28">
      <HeroStartCard onStartClick={() => setIsSetupOpen(true)} />

      <SetupSessionModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStart={handleStartSession}
      />
    </main>
  );
}
