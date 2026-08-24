import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Offers a new version instead of installing it silently.
 *
 * A background reload is fine on a website; here it would tear the page out
 * from under someone who is mid-set with unsaved input in a text field. The
 * update waits until they say so — and since the worker is registered with
 * `prompt`, the old version keeps serving until then.
 */
export default function UpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn("[pwa] registrazione service worker fallita", error);
    },
  });

  const show = needRefresh && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          role="status"
          // Sits above the bottom nav, and clears the home indicator on
          // notched phones.
          className="fixed left-4 right-4 z-50 bg-card border border-primary/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              Nuova versione disponibile
            </p>
            <p className="text-xs text-muted-foreground">
              Aggiorna quando hai finito la serie.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="px-3.5 py-2.5 bg-primary hover:bg-secondary text-on-primary font-heading font-black rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer shrink-0"
          >
            Aggiorna
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            title="Non ora"
            className="p-1 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
