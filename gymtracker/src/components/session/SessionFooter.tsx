import { Check } from "lucide-react";

interface SessionFooterProps {
  isSessionEmpty: boolean;
  onSave: () => void;
}

export default function SessionFooter({
  isSessionEmpty,
  onSave,
}: SessionFooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-border p-4 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        <button
          type="button"
          id="btn-save-workout"
          onClick={onSave}
          disabled={isSessionEmpty}
          className={`w-full py-4 px-6 text-base font-heading font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
            isSessionEmpty
              ? "bg-muted text-muted-foreground/60 border border-border/50 cursor-not-allowed"
              : "bg-accent hover:bg-accent/90 text-on-accent active:scale-[0.99] shadow-accent/20"
          }`}
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          Concludi e Salva Allenamento
        </button>
        {isSessionEmpty && (
          <p className="text-center text-sm text-muted-foreground">
            Aggiungi almeno un esercizio con almeno una serie compilata per
            salvare.
          </p>
        )}
      </div>
    </footer>
  );
}
