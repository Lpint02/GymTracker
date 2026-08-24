import { RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DiscardConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function DiscardConfirmModal({
  isOpen,
  onConfirm,
  onDismiss,
}: DiscardConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-heading font-extrabold text-foreground">
                Annullare l'allenamento?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tutti i dati inseriti per questa sessione andranno persi
                definitivamente. Sei sicuro di voler uscire?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-3 bg-destructive hover:bg-destructive/90 text-foreground font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Sì, annulla
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 py-3 bg-muted hover:bg-muted/70 text-muted-foreground font-bold rounded-xl text-xs border border-border transition-colors cursor-pointer"
              >
                No, continua
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
