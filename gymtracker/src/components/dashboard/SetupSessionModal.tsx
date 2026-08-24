import { useState, useEffect } from "react";
import { Dumbbell, Calendar, X, Play, Star } from "lucide-react";
import { getTodayISO, normalizeKey } from "../../lib/utils";
import { useFavorites } from "../../context/WorkoutContext";
import { motion, AnimatePresence } from "motion/react";

interface SetupSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (date: string, muscleGroups: string) => void;
}

export default function SetupSessionModal({
  isOpen,
  onClose,
  onStart,
}: SetupSessionModalProps) {
  const { favorites, isFavorite, toggleFavorite, removeFavorite } =
    useFavorites();
  const [muscleGroups, setMuscleGroups] = useState("");
  const [date, setDate] = useState("");

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayISO());
      setMuscleGroups("");
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 overflow-hidden"
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
                className="p-1 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form fields */}
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
                    onClick={() => toggleFavorite(muscleGroups)}
                    disabled={!muscleGroups.trim()}
                    title={
                      isFavorite(muscleGroups)
                        ? "Rimuovi dai preferiti"
                        : "Salva nei preferiti"
                    }
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all ${
                      !muscleGroups.trim()
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : isFavorite(muscleGroups)
                        ? "text-primary cursor-pointer"
                        : "text-muted-foreground hover:text-primary cursor-pointer"
                    }`}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={isFavorite(muscleGroups) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              </div>

              {/* Favorites Pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wide">
                  Preferiti:
                </span>
                {favorites.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 font-medium">
                    Tocca la stella per salvare un preferito.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {favorites.map((fav) => (
                      <span
                        key={fav.id}
                        className={`group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border transition-all ${
                          normalizeKey(muscleGroups) === normalizeKey(fav.label)
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-background text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setMuscleGroups(fav.label)}
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
              </div>

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
                onClick={() => onStart(date, muscleGroups)}
                className="flex-1 py-3.5 bg-primary hover:bg-secondary text-on-primary font-heading font-black rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Avvia Sessione
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
