import { useMemo, useState } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { useProgress, usePRs } from "../../context/WorkoutContext";
import { formatDateItalian } from "../../lib/utils";
import ExerciseProgressChart from "./ExerciseProgressChart";

/** Picks the exercise with the most logged sessions (most recent last-logged wins ties). */
function pickDefaultExercise(
  exerciseNames: string[],
  progressByExercise: Record<string, { date: string }[]>
): string | null {
  let best: string | null = null;
  for (const name of exerciseNames) {
    const points = progressByExercise[name];
    if (!best) {
      best = name;
      continue;
    }
    const bestPoints = progressByExercise[best];
    if (points.length > bestPoints.length) {
      best = name;
    } else if (
      points.length === bestPoints.length &&
      points[points.length - 1].date > bestPoints[bestPoints.length - 1].date
    ) {
      best = name;
    }
  }
  return best;
}

export default function ExerciseProgressSection() {
  const { exerciseNames, progressByExercise } = useProgress();
  const { currentPRsByExercise } = usePRs();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(
    null
  );

  const effectiveExercise = useMemo(() => {
    if (selectedExercise && exerciseNames.includes(selectedExercise)) {
      return selectedExercise;
    }
    return pickDefaultExercise(exerciseNames, progressByExercise);
  }, [selectedExercise, exerciseNames, progressByExercise]);

  const points = effectiveExercise
    ? progressByExercise[effectiveExercise]
    : [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-md">
      <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <LineChartIcon className="w-4 h-4 text-primary" />
        Andamento Esercizio
      </h3>

      {exerciseNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground/60 mb-3">
            <LineChartIcon className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            Nessun dato ancora. Completa un allenamento per vedere i tuoi
            progressi.
          </p>
        </div>
      ) : (
        <>
          {/* Exercise picker */}
          <div className="flex flex-wrap gap-1.5">
            {exerciseNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedExercise(name)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  name === effectiveExercise
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {points.length === 1 ? (
            <div className="bg-background border border-border rounded-xl p-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                Ultimo
              </span>
              <span className="font-heading font-black text-foreground">
                {points[0].maxWeight} kg{" "}
                <span className="text-muted-foreground font-normal">
                  × {points[0].repsAtMax} reps
                </span>{" "}
                — {formatDateItalian(points[0].date)}
              </span>
            </div>
          ) : (
            <>
              <ExerciseProgressChart
                dataPoints={points}
                prSessionId={
                  effectiveExercise
                    ? currentPRsByExercise[effectiveExercise]?.maxWeight
                        ?.sessionId ?? null
                    : null
                }
              />
              {points.length < 4 && (
                <p className="text-xs text-muted-foreground/60 text-center">
                  Pochi dati disponibili, continua ad allenarti per un trend
                  più preciso.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
