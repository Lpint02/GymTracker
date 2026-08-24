import { Calendar, ChevronRight, Trash2, Trophy } from "lucide-react";
import { WorkoutSession } from "../../types";
import { formatDateItalian } from "../../lib/utils";
import { usePRs } from "../../context/WorkoutContext";
import { motion } from "motion/react";

interface HistoryWorkoutCardProps {
  session: WorkoutSession;
  isSelected: boolean;
  onClick: () => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

export default function HistoryWorkoutCard({
  session,
  isSelected,
  onClick,
  confirmDeleteId,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: HistoryWorkoutCardProps) {
  const { sessionPRs } = usePRs();
  const sessionPRFlags = sessionPRs[session.id];

  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border ${
        isSelected
          ? "bg-card border-primary border-l-4 shadow-lg"
          : "bg-background/40 hover:bg-card/30 border-border hover:border-border"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary/80" />
          <span>{formatDateItalian(session.date)}</span>
        </div>

        {/* Delete past workout with confirmation overlay */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          {confirmDeleteId === session.id ? (
            <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/40 p-1 rounded-lg">
              <button
                onClick={() => onConfirmDelete(session.id)}
                className="text-xs font-black uppercase text-destructive hover:text-foreground px-1.5 py-0.5 rounded transition-all cursor-pointer"
              >
                Sì
              </button>
              <button
                onClick={onCancelDelete}
                className="text-xs font-black uppercase text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-all cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRequestDelete(session.id)}
              className="text-muted-foreground/60 hover:text-destructive p-1 rounded-lg transition-colors cursor-pointer"
              title="Elimina allenamento dallo storico"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="text-sm font-heading font-extrabold text-foreground tracking-tight mb-2 group-hover:text-foreground flex items-center justify-between">
        <span>{session.muscleGroups}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>

      {/* Snippet of exercises */}
      <div className="flex flex-wrap gap-1">
        {session.exercises.slice(0, 3).map((ex) => {
          const flags = sessionPRFlags?.[ex.name.trim().toLowerCase()];
          const isPR = flags?.maxWeightPR || flags?.bestSetPR;
          return (
            <span
              key={ex.id}
              className={`flex items-center gap-1 text-xs font-semibold border px-2 py-0.5 rounded-md ${
                isPR
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-background text-muted-foreground border-border"
              }`}
            >
              {isPR && <Trophy className="w-3 h-3" />}
              {ex.name} ({ex.sets.length}s)
            </span>
          );
        })}
        {session.exercises.length > 3 && (
          <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
            +{session.exercises.length - 3} altri
          </span>
        )}
      </div>
    </motion.div>
  );
}
