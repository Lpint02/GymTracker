import { useState } from "react";
import {
  Dumbbell,
  Calendar,
  X,
  Play,
  Star,
  Pencil,
  Plus,
  GripVertical,
  Check,
} from "lucide-react";
import { getTodayISO, normalizeKey, displayLabel } from "../../lib/utils";
import { useRoutinesList, useProgress } from "../../context/WorkoutContext";
import { motion, AnimatePresence } from "motion/react";
import ExerciseNameInput from "../session/ExerciseNameInput";

interface SetupSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (
    date: string,
    muscleGroups: string,
    exerciseNames: string[]
  ) => void;
}

/**
 * Pre-workout setup: name, date, and optionally a saved routine.
 *
 * The pills are routines now, not plain name favorites. Tapping one fills the
 * name AND queues its exercises; a routine with no exercises behaves exactly
 * like the old pill, so nothing about the previous flow got slower.
 */
export default function SetupSessionModal({
  isOpen,
  onClose,
  onStart,
}: SetupSessionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && <SetupSessionForm onClose={onClose} onStart={onStart} />}
    </AnimatePresence>
  );
}

/**
 * The form itself, mounted only while the modal is open.
 *
 * Splitting it out is what lets the fields start empty every time with plain
 * useState initializers. Previously an effect reset five pieces of state
 * whenever `isOpen` flipped, which meant a render with the previous workout's
 * values still on screen before the reset landed.
 */
function SetupSessionForm({
  onClose,
  onStart,
}: Omit<SetupSessionModalProps, "isOpen">) {
  const { routines, isSaved, findByName, toggleRoutine, saveRoutine, removeRoutine } =
    useRoutinesList();
  const { exerciseNames: knownExercises } = useProgress();

  const [muscleGroups, setMuscleGroups] = useState("");
  const [date, setDate] = useState(getTodayISO);
  /** Exercises queued for this workout, from the selected routine or edited here. */
  const [plannedExercises, setPlannedExercises] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftExercise, setDraftExercise] = useState("");

  const selectRoutine = (name: string) => {
    setMuscleGroups(name);
    setPlannedExercises(findByName(name)?.exerciseNames ?? []);
    setIsEditing(false);
  };

  /**
   * Fold a half-typed exercise into the list and return the effective result.
   *
   * Every action that consumes the list goes through this, because otherwise
   * text sitting in the field when you hit save or start is silently thrown
   * away — you typed an exercise, it was on screen, and it just vanished.
   * Returns the list rather than relying on state, since a setState during the
   * same handler would not be visible yet.
   */
  const commitDraft = (): string[] => {
    const label = displayLabel(draftExercise);
    if (!label) return plannedExercises;

    const isDuplicate = plannedExercises.some(
      (e) => normalizeKey(e) === normalizeKey(label)
    );
    setDraftExercise("");
    if (isDuplicate) return plannedExercises;

    const next = [...plannedExercises, label];
    setPlannedExercises(next);
    return next;
  };

  const addPlannedExercise = () => {
    commitDraft();
  };

  const move = (index: number, delta: number) => {
    setPlannedExercises((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveAsRoutine = () => {
    saveRoutine(muscleGroups, commitDraft());
    setIsEditing(false);
  };

  const trimmedName = displayLabel(muscleGroups);
  const currentRoutine = findByName(trimmedName);
  const hasUnsavedChanges =
    !!currentRoutine &&
    JSON.stringify(currentRoutine.exerciseNames) !==
      JSON.stringify(plannedExercises);

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Dumbbell className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-heading font-black text-foreground">
                  Configura Allenamento
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Muscle group / Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                  Gruppo Muscolare / Nome
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="es. Petto & Bicipiti, Dorso, Spalle..."
                    value={muscleGroups}
                    onChange={(e) => setMuscleGroups(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    className="w-full pl-3.5 pr-11 py-3 bg-background border border-border rounded-xl text-sm font-semibold text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    // Passes the prepared exercises: the star used to save an
                    // empty routine and drop them.
                    onClick={() => toggleRoutine(muscleGroups, commitDraft())}
                    disabled={!trimmedName}
                    title={
                      isSaved(muscleGroups)
                        ? "Rimuovi dalle routine"
                        : "Salva come routine"
                    }
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all ${
                      !trimmedName
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : isSaved(muscleGroups)
                        ? "text-primary cursor-pointer"
                        : "text-muted-foreground hover:text-primary cursor-pointer"
                    }`}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={isSaved(muscleGroups) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              </div>

              {/* Routine pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wide">
                  Le tue routine:
                </span>
                {routines.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 font-medium">
                    Tocca la stella per salvare una routine.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {routines.map((routine) => (
                      <span
                        key={routine.id}
                        className={`group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border transition-all ${
                          normalizeKey(muscleGroups) === normalizeKey(routine.name)
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-background text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectRoutine(routine.name)}
                          className="text-xs font-bold cursor-pointer"
                        >
                          {routine.name}
                          {routine.exerciseNames.length > 0 && (
                            <span className="ml-1 opacity-70">
                              · {routine.exerciseNames.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRoutine(routine.id);
                          }}
                          title="Rimuovi routine"
                          className="p-0.5 rounded opacity-60 hover:opacity-100 hover:text-destructive cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Planned exercises */}
              {(plannedExercises.length > 0 || isEditing) && (
                <div className="space-y-2 bg-background border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                      Esercizi previsti
                    </span>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold text-primary hover:text-secondary cursor-pointer flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Modifica
                      </button>
                    )}
                  </div>

                  {plannedExercises.length === 0 && isEditing && (
                    <p className="text-xs text-muted-foreground/60">
                      Aggiungi gli esercizi che vuoi trovare già pronti.
                    </p>
                  )}

                  <ol className="space-y-1">
                    {plannedExercises.map((name, index) => (
                      <li
                        key={`${name}-${index}`}
                        className="flex items-center gap-2 text-sm font-semibold text-foreground"
                      >
                        <span className="text-xs text-muted-foreground/60 w-4 shrink-0">
                          {index + 1}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{name}</span>
                        {isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => move(index, -1)}
                              disabled={index === 0}
                              title="Sposta su"
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            >
                              <GripVertical className="w-3.5 h-3.5 rotate-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPlannedExercises((prev) =>
                                  prev.filter((_, i) => i !== index)
                                )
                              }
                              title="Rimuovi"
                              className="p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>

                  {isEditing && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <ExerciseNameInput
                          value={draftExercise}
                          onChange={setDraftExercise}
                          onSubmit={addPlannedExercise}
                          suggestions={knownExercises}
                          placeholder="Nome esercizio…"
                          className="flex-1 min-w-0 px-3 py-2.5 bg-card border border-border rounded-lg text-sm font-semibold text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={addPlannedExercise}
                          title="Aggiungi esercizio"
                          className="px-3 rounded-lg bg-muted hover:bg-muted/70 text-foreground cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {trimmedName && (
                        <button
                          type="button"
                          onClick={saveAsRoutine}
                          className="w-full py-2.5 bg-card hover:bg-muted text-foreground font-bold rounded-lg text-xs border border-border cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {currentRoutine
                            ? `Aggiorna la routine "${trimmedName}"`
                            : `Salva come routine "${trimmedName}"`}
                        </button>
                      )}
                    </div>
                  )}

                  {!isEditing && hasUnsavedChanges && (
                    <p className="text-xs text-muted-foreground/70">
                      Modifiche non salvate nella routine.
                    </p>
                  )}
                </div>
              )}

              {plannedExercises.length === 0 && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 border border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Prepara gli esercizi
                </button>
              )}

              {/* Date Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                  Data (Presa Automaticamente)
                </label>
                <div className="flex items-center gap-2 min-w-0 w-full pl-3.5 pr-4 py-3 bg-background border border-border rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 min-w-0 max-w-full bg-transparent outline-none text-sm font-semibold text-foreground [-webkit-appearance:none] [appearance:none]"
                  />
                </div>
              </div>
            </div>

            {/* Start Session Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-muted hover:bg-muted/70 text-muted-foreground font-bold rounded-xl text-xs border border-border transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => onStart(date, muscleGroups, commitDraft())}
                className="flex-1 py-3.5 bg-primary hover:bg-secondary text-on-primary font-heading font-black rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Avvia Sessione
              </button>
            </div>
          </motion.div>
        </div>
  );
}
