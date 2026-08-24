import { Flame } from "lucide-react";
import { useStreak } from "../../context/WorkoutContext";

export default function WeeklyStreakSection() {
  const { currentStreak, bestStreak } = useStreak();

  return (
    <div className="bg-background border border-border rounded-2xl p-5 space-y-4 shadow-md">
      <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-primary" />
        Streak Settimanale
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card/40 p-3 rounded-xl border border-border text-center">
          <span className="text-xs font-semibold text-muted-foreground/70 uppercase">
            Streak Attuale
          </span>
          <p className="text-lg font-heading font-black text-foreground mt-1">
            {currentStreak}{" "}
            <span className="text-xs text-muted-foreground font-semibold">
              {currentStreak === 1 ? "settimana" : "settimane"}
            </span>
          </p>
        </div>

        <div className="bg-card/40 p-3 rounded-xl border border-border text-center">
          <span className="text-xs font-semibold text-muted-foreground/70 uppercase">
            Record
          </span>
          <p className="text-lg font-heading font-black text-foreground mt-1">
            {bestStreak}{" "}
            <span className="text-xs text-muted-foreground font-semibold">
              {bestStreak === 1 ? "settimana" : "settimane"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
