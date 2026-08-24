import { useMemo } from "react";
import { ListOrdered } from "lucide-react";
import { useProgress } from "../../context/WorkoutContext";

export default function TopExercisesSection() {
  const { exerciseNames, progressByExercise } = useProgress();

  const topExercises = useMemo(() => {
    return exerciseNames
      .map((name) => ({ name, count: progressByExercise[name].length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [exerciseNames, progressByExercise]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-md">
      <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <ListOrdered className="w-4 h-4 text-primary" />
        Esercizi Più Eseguiti
      </h3>

      {topExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground/60 mb-3">
            <ListOrdered className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            Nessun dato ancora. Completa un allenamento per vedere la tua
            classifica.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {topExercises.map((exercise, index) => (
            <div
              key={exercise.name}
              className="flex items-center gap-3 bg-background border border-border rounded-xl p-3"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary font-heading font-bold text-xs shrink-0">
                {index + 1}
              </span>
              <span className="flex-1 min-w-0 text-sm font-heading font-bold text-foreground truncate">
                {exercise.name}
              </span>
              <span className="text-xs font-bold text-muted-foreground shrink-0">
                {exercise.count} {exercise.count === 1 ? "sessione" : "sessioni"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
