import { TrendingUp } from "lucide-react";

interface StatsPanelProps {
  totalWorkouts: number;
  popularMuscleGroup: string;
  lastWorkoutDate: string;
}

export default function StatsPanel({
  totalWorkouts,
  popularMuscleGroup,
  lastWorkoutDate,
}: StatsPanelProps) {
  return (
    <div className="bg-background border border-border rounded-2xl p-5 space-y-4 shadow-md">
      <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-primary" />
        Le Tue Statistiche
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card/40 p-3 rounded-xl border border-border text-center">
          <span className="text-xs font-semibold text-muted-foreground/70 uppercase">
            Totali
          </span>
          <p className="text-lg font-heading font-black text-foreground mt-1">{totalWorkouts}</p>
        </div>

        <div className="bg-card/40 p-3 rounded-xl border border-border text-center col-span-2">
          <span className="text-xs font-semibold text-muted-foreground/70 uppercase">
            Gruppo Frequente
          </span>
          <p
            className="text-xs font-extrabold text-primary mt-2 truncate px-1"
            title={popularMuscleGroup}
          >
            {popularMuscleGroup}
          </p>
        </div>
      </div>

      <div className="bg-card/40 p-3.5 rounded-xl border border-border flex items-center justify-between text-xs">
        <span className="font-semibold text-muted-foreground">Ultimo Allenamento</span>
        <span className="font-heading font-extrabold text-foreground bg-card border border-border px-2.5 py-1 rounded-md">
          {lastWorkoutDate}
        </span>
      </div>
    </div>
  );
}
