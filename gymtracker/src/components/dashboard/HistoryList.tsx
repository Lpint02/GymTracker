import { History, X } from "lucide-react";
import { useHistory } from "../../context/WorkoutContext";
import HistoryWorkoutCard from "./HistoryWorkoutCard";
import { AnimatePresence } from "motion/react";

export default function HistoryList() {
  const {
    filteredHistory,
    searchTerm,
    setSearchTerm,
    selectedPastWorkout,
    setSelectedPastWorkout,
    confirmDeleteId,
    setConfirmDeleteId,
    deleteWorkout,
  } = useHistory();

  return (
    <section className="bg-background border border-border rounded-2xl flex flex-col h-[calc(100vh-180px)] shadow-md overflow-hidden">
      {/* Header section with search */}
      <div className="p-4 border-b border-border bg-card/20">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-base font-heading font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-primary" />
            Storico Allenamenti
          </h2>
          <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
            {filteredHistory.length} sessioni
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Cerca gruppo o esercizio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((session) => (
              <HistoryWorkoutCard
                key={session.id}
                session={session}
                isSelected={selectedPastWorkout?.id === session.id}
                onClick={() => setSelectedPastWorkout(session)}
                confirmDeleteId={confirmDeleteId}
                onRequestDelete={setConfirmDeleteId}
                onConfirmDelete={deleteWorkout}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground/60 mb-3">
                <History className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-xs font-bold text-muted-foreground">
                Nessun allenamento trovato
              </h3>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                >
                  Azzera filtro
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
