import { Calendar, ArrowLeft } from "lucide-react";
import { formatDateItalian } from "../../lib/utils";

interface SessionHeaderProps {
  muscleGroups: string;
  date: string;
  onCancel: () => void;
}

export default function SessionHeader({
  muscleGroups,
  date,
  onCancel,
}: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-muted/80 hover:bg-muted active:scale-95 text-foreground hover:text-foreground rounded-xl text-xs font-bold border border-border transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Annulla
        </button>

        <div className="text-center min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-heading font-black text-foreground truncate uppercase tracking-wide">
            {muscleGroups || "Allenamento"}
          </h1>
          <p className="text-sm text-primary font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {formatDateItalian(date, "long")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            In Corso...
          </span>
        </div>
      </div>
    </header>
  );
}
