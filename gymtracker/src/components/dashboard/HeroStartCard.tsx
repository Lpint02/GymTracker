import { Play, Plus } from "lucide-react";

interface HeroStartCardProps {
  onStartClick: () => void;
}

export default function HeroStartCard({ onStartClick }: HeroStartCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      {/* Background design accents */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

      <div className="relative z-10 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
          <Play className="w-6 h-6 fill-current text-primary" />
        </div>

        <div>
          <h2 className="text-xl font-heading font-black text-foreground tracking-tight">
            Pronto ad allenarti?
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Avvia una nuova sessione per inserire esercizi, serie e carichi in
            tempo reale.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartClick}
          className="w-full py-4 px-5 bg-primary hover:bg-secondary active:scale-[0.98] text-on-primary font-heading font-bold rounded-xl text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          Inizia Nuovo Allenamento
        </button>
      </div>
    </div>
  );
}
