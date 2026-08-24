import { memo, useState } from "react";
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
 * Parse what the user typed into a weight.
 *
 * Accepts a comma as the decimal separator: the UI is Italian, and on an
 * Italian keyboard `inputMode="decimal"` offers a comma, which parseFloat
 * would otherwise truncate ("82,5" -> 82).
 *
 * Partial input ("", "82.", ",") has no numeric value yet and maps to "", the
 * domain's empty marker.
 */
function parseWeight(raw: string): number | "" {
  const normalized = raw.replace(",", ".");
  if (normalized === "" || normalized === ".") return "";
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? "" : parsed;
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

  /**
   * Raw text of the weight field while the user is typing; null means "just
   * show the stored number".
   *
   * A plain controlled input over `number | ""` cannot accept decimals at all.
   * Typing "82." parses to 82, the re-render writes "82" back into the field,
   * and the dot is swallowed before the next keystroke — so "82.5" always ended
   * up as 825. Keeping the in-progress text separate from the parsed value is
   * what lets an intermediate state like "82." exist.
   */
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [lastWeightProp, setLastWeightProp] = useState<number | "">(set.weight);

  // Adjusting state during render (the documented React pattern) rather than in
  // an effect: an effect would repaint with a stale value first, and this is
  // the hottest render path in the app.
  if (set.weight !== lastWeightProp) {
    setLastWeightProp(set.weight);
    // A change we did not cause — the +/- buttons, or a restored session — wins
    // over whatever is half-typed.
    if (weightDraft === null || parseWeight(weightDraft) !== set.weight) {
      setWeightDraft(null);
    }
  }

  const weightValue =
    weightDraft ?? (set.weight === "" ? "" : String(set.weight));

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
            value={weightValue}
            onChange={(e) => {
              const raw = e.target.value;
              // Reject anything that is not a partial decimal, so a stray
              // letter cannot silently wipe the field.
              if (raw !== "" && !/^\d*[.,]?\d*$/.test(raw)) return;
              setWeightDraft(raw);
              const parsed = parseWeight(raw);
              setLastWeightProp(parsed);
              onUpdate(exerciseId, set.id, "weight", parsed);
            }}
            onBlur={() => setWeightDraft(null)}
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
