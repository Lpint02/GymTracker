import { memo } from "react";
import { Trash2 } from "lucide-react";
import { WorkoutSet } from "../../types";
import { motion } from "motion/react";

interface ExerciseSetRowProps {
  exerciseId: string;
  set: WorkoutSet;
  onUpdate: (
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: number | ""
  ) => void;
  onRemove: (exerciseId: string, setId: string) => void;
}

/**
 * A single set row within an exercise card.
 * Wrapped in React.memo to avoid re-rendering when sibling sets change —
 * this is the hottest render path (every keystroke triggers state updates).
 */
function ExerciseSetRowInner({
  exerciseId,
  set,
  onUpdate,
  onRemove,
}: ExerciseSetRowProps) {
  const currentWeight =
    typeof set.weight === "number"
      ? set.weight
      : parseFloat(String(set.weight)) || 0;
  const currentReps =
    typeof set.reps === "number" ? set.reps : parseInt(String(set.reps), 10) || 0;

  return (
    <motion.div
      key={set.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 bg-background border border-border/40 p-3 rounded-2xl shadow-inner"
    >
      {/* Weight stat block */}
      <div className="flex-1 min-w-0 flex flex-col items-center gap-1 bg-card/60 border border-border/60 rounded-xl py-2 px-1">
        <div className="flex items-center justify-between w-full gap-1">
          <button
            type="button"
            onClick={() =>
              onUpdate(
                exerciseId,
                set.id,
                "weight",
                Math.max(0, currentWeight - 2.5)
              )
            }
            className="w-9 h-9 shrink-0 flex items-center justify-center text-xl font-black text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 rounded-md transition-all cursor-pointer select-none"
            title="Sottrai 2.5 kg"
          >
            −
          </button>

          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={set.weight}
            onChange={(e) => {
              const val =
                e.target.value === "" ? "" : parseFloat(e.target.value);
              onUpdate(
                exerciseId,
                set.id,
                "weight",
                isNaN(Number(val)) ? "" : val
              );
            }}
            className="w-full min-w-0 bg-transparent outline-none text-center font-heading font-black text-2xl text-foreground placeholder-muted-foreground/40"
          />

          <button
            type="button"
            onClick={() =>
              onUpdate(exerciseId, set.id, "weight", currentWeight + 2.5)
            }
            className="w-9 h-9 shrink-0 flex items-center justify-center text-xl font-black text-primary hover:text-foreground hover:bg-muted active:scale-90 rounded-md transition-all cursor-pointer select-none"
            title="Aggiungi 2.5 kg"
          >
            +
          </button>
        </div>
        <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
          kg
        </span>
      </div>

      {/* Reps stat block */}
      <div className="flex-1 min-w-0 flex flex-col items-center gap-1 bg-card/60 border border-border/60 rounded-xl py-2 px-1">
        <div className="flex items-center justify-between w-full gap-1">
          <button
            type="button"
            onClick={() =>
              onUpdate(exerciseId, set.id, "reps", Math.max(0, currentReps - 1))
            }
            className="w-9 h-9 shrink-0 flex items-center justify-center text-xl font-black text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 rounded-md transition-all cursor-pointer select-none"
            title="Sottrai 1 ripetizione"
          >
            −
          </button>

          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={set.reps}
            onChange={(e) => {
              const val =
                e.target.value === "" ? "" : parseInt(e.target.value, 10);
              onUpdate(
                exerciseId,
                set.id,
                "reps",
                isNaN(Number(val)) ? "" : val
              );
            }}
            className="w-full min-w-0 bg-transparent outline-none text-center font-heading font-black text-2xl text-foreground placeholder-muted-foreground/40"
          />

          <button
            type="button"
            onClick={() => onUpdate(exerciseId, set.id, "reps", currentReps + 1)}
            className="w-9 h-9 shrink-0 flex items-center justify-center text-xl font-black text-primary hover:text-foreground hover:bg-muted active:scale-90 rounded-md transition-all cursor-pointer select-none"
            title="Aggiungi 1 ripetizione"
          >
            +
          </button>
        </div>
        <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
          reps
        </span>
      </div>

      {/* Delete Set Button */}
      <button
        type="button"
        onClick={() => onRemove(exerciseId, set.id)}
        className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-card transition-all cursor-pointer shrink-0"
        title="Elimina serie"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

const ExerciseSetRow = memo(ExerciseSetRowInner);
export default ExerciseSetRow;
