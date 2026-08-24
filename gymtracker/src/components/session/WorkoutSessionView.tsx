import { useState } from "react";
import { Plus } from "lucide-react";
import { useSession, useSaveSession } from "../../context/WorkoutContext";
import SessionHeader from "./SessionHeader";
import ExerciseCard from "./ExerciseCard";
import SessionFooter from "./SessionFooter";
import DiscardConfirmModal from "../shared/DiscardConfirmModal";
import { AnimatePresence } from "motion/react";

/**
 * Orchestrator component for the active workout session.
 * Consumes the session context directly — no props needed from App.tsx.
 */
export default function WorkoutSessionView() {
  const {
    session,
    cancelSession,
    addExercise,
    updateExerciseName,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
  } = useSession();

  const saveSession = useSaveSession();

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  if (!session) return null;

  // Check if session has at least one set with real weight/reps data,
  // matching the validation finalizeSession() performs on save.
  const isSessionEmpty = session.exercises.every(
    (ex) => !ex.sets.some((s) => s.weight !== "" || s.reps !== "")
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none antialiased">
      <SessionHeader
        muscleGroups={session.muscleGroups}
        date={session.date}
        onCancel={() => setShowDiscardConfirm(true)}
      />

      {/* MAIN WORKOUT STAGE */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28">
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {session.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                onUpdateName={updateExerciseName}
                onRemove={removeExercise}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onRemoveSet={removeSet}
              />
            ))}
          </AnimatePresence>

          {/* Add Exercise Button */}
          <button
            type="button"
            id="btn-add-exercise"
            onClick={addExercise}
            className="w-full py-4 bg-primary/5 hover:bg-primary/10 text-primary font-heading font-bold text-sm uppercase tracking-widest rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-md"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:scale-110 text-primary" />
            Aggiungi Esercizio
          </button>
        </div>
      </main>

      <SessionFooter isSessionEmpty={isSessionEmpty} onSave={saveSession} />

      <DiscardConfirmModal
        isOpen={showDiscardConfirm}
        onConfirm={() => {
          cancelSession();
          setShowDiscardConfirm(false);
        }}
        onDismiss={() => setShowDiscardConfirm(false)}
      />
    </div>
  );
}
