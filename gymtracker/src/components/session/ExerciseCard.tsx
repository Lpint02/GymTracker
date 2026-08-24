import { Plus, Trash2, Star, X } from "lucide-react";
import { Exercise } from "../../types";
import ExerciseSetRow from "./ExerciseSetRow";
import { useMemo } from "react";
import { useExerciseFavorites, useProgress } from "../../context/WorkoutContext";
import { motion, AnimatePresence } from "motion/react";
import ExerciseNameInput from "./ExerciseNameInput";
import { normalizeKey } from "../../lib/utils";

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  onUpdateName: (exerciseId: string, name: string) => void;
  onRemove: (exerciseId: string) => void;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: number | ""
  ) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
}

export default function ExerciseCard({
  exercise,
  index,
  onUpdateName,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: ExerciseCardProps) {
  const { favorites, isFavorite, toggleFavorite, removeFavorite } =
    useExerciseFavorites();
  const { exerciseNames } = useProgress();

  // Names actually performed, plus ones saved as favorites but never logged
  // with a weight (which is what keeps them out of exerciseNames).
  const suggestions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const name of [...exerciseNames, ...favorites.map((f) => f.label)]) {
      const key = normalizeKey(name);
      if (key && !seen.has(key)) seen.set(key, name);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [exerciseNames, favorites]);

  return (
    <motion.div
      key={exercise.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border/60 border-l-4 border-l-primary/60 rounded-2xl p-5 relative shadow-xl"
    >
      {/* Exercise Number Badge, Name Input & Actions */}
      <div className="flex items-center gap-3 mb-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary font-heading font-bold text-xs shrink-0">
          {index + 1}
        </span>
        <ExerciseNameInput
          value={exercise.name}
          onChange={(name) => onUpdateName(exercise.id, name)}
          suggestions={suggestions}
          placeholder="Nome Esercizio (es. Panca Piana, Squat...)"
          className="w-full min-w-0 bg-transparent text-base sm:text-lg font-heading font-extrabold text-foreground placeholder-muted-foreground/50 border-b border-transparent hover:border-border focus:border-primary focus:outline-none pb-1 transition-colors"
        />

        {/* Favorite toggle */}
        <button
          type="button"
          onClick={() => toggleFavorite(exercise.name)}
          disabled={!exercise.name.trim()}
          title={
            isFavorite(exercise.name)
              ? "Rimuovi dai preferiti"
              : "Salva nei preferiti"
          }
          className={`p-1.5 rounded-lg transition-all shrink-0 ${
            !exercise.name.trim()
              ? "text-muted-foreground/30 cursor-not-allowed"
              : isFavorite(exercise.name)
              ? "text-primary cursor-pointer"
              : "text-muted-foreground hover:text-primary cursor-pointer"
          }`}
        >
          <Star
            className="w-4 h-4"
            fill={isFavorite(exercise.name) ? "currentColor" : "none"}
          />
        </button>

        {/* Divider separating safe actions from the destructive one */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Remove Exercise Button */}
        <button
          type="button"
          onClick={() => onRemove(exercise.id)}
          className="text-muted-foreground hover:text-destructive p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0"
          title="Elimina Esercizio"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Exercise Favorites Pills — only while naming a fresh exercise */}
      {!exercise.name.trim() && favorites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {favorites.map((fav) => (
            <span
              key={fav.id}
              className="group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border bg-background text-muted-foreground border-border hover:text-foreground transition-all"
            >
              <button
                type="button"
                onClick={() => onUpdateName(exercise.id, fav.label)}
                className="text-xs font-bold cursor-pointer"
              >
                {fav.label}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavorite(fav.id);
                }}
                title="Rimuovi preferito"
                className="p-0.5 rounded opacity-60 hover:opacity-100 hover:text-destructive cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {exercise.name.trim() !== "" && <div className="mb-5" />}

      {/* Series List */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {exercise.sets.map((set) => (
            <ExerciseSetRow
              key={set.id}
              exerciseId={exercise.id}
              set={set}
              onUpdate={onUpdateSet}
              onRemove={onRemoveSet}
            />
          ))}
        </AnimatePresence>

        {/* Empty state for Sets */}
        {exercise.sets.length === 0 && (
          <p className="text-center py-3 text-muted-foreground text-xs italic">
            Nessuna serie inserita. Clicca "+ Aggiungi Serie" qui sotto.
          </p>
        )}
      </div>

      {/* Add Set Button */}
      <button
        type="button"
        onClick={() => onAddSet(exercise.id)}
        className="mt-4 w-full py-3 border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-xl text-xs font-bold text-primary/80 hover:text-primary hover:bg-primary/5 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Aggiungi Serie
      </button>
    </motion.div>
  );
}
