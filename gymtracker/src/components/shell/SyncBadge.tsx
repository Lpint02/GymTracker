import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  TriangleAlert,
  X,
  LogIn,
  HardDriveDownload,
} from "lucide-react";
import { useSyncStatus } from "../../hooks/useSyncStatus";

/**
 * Whether the user's data is actually safe.
 *
 * With sync happening in the background there is no other way for them to know,
 * and that is the entire value of this change. Replaces the old hardcoded
 * "Sincronizzato nel Browser (LocalStorage)" badge, which was false on both
 * counts once data moved to IndexedDB behind an account.
 *
 * A parked operation is never dropped silently — it surfaces here with a way to
 * retry or, only on an explicit decision, discard.
 */
export default function SyncBadge() {
  const {
    state,
    pendingCount,
    failedCount,
    lastSyncedAt,
    failedOperations,
    storageError,
    retryFailed,
    discard,
    refreshFailedList,
  } = useSyncStatus();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) void refreshFailedList();
  }, [open, refreshFailedList]);

  const problem = state === "error" || state === "needs-reauth" || !!storageError;
  const clickable = problem;

  const label = (() => {
    if (storageError) return "Salvataggio locale fallito";
    if (state === "needs-reauth") return "Accedi di nuovo";
    if (state === "error") return `Sincronizzazione bloccata (${failedCount})`;
    if (state === "offline")
      return pendingCount > 0 ? `Offline · ${pendingCount} in attesa` : "Offline";
    if (state === "syncing") return "Sincronizzazione…";
    if (pendingCount > 0) return `${pendingCount} in attesa`;
    return lastSyncedAt ? "Sincronizzato" : "Tutto salvato";
  })();

  const Icon = (() => {
    if (problem) return TriangleAlert;
    if (state === "offline") return CloudOff;
    if (state === "syncing") return RefreshCw;
    return Cloud;
  })();

  return (
    <>
      <button
        type="button"
        onClick={clickable ? () => setOpen(true) : undefined}
        disabled={!clickable}
        title={label}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-xl border transition-colors ${
          problem
            ? "text-destructive bg-destructive/10 border-destructive/30 cursor-pointer hover:bg-destructive/20"
            : "text-muted-foreground bg-card border-border/80 cursor-default"
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${
            state === "syncing" ? "animate-spin" : ""
          } ${problem ? "" : "text-primary"}`}
        />
        <span className="hidden sm:inline">{label}</span>
        {/* On narrow screens the label is hidden, so keep the count visible —
            it is the part that tells the user something needs attention. */}
        <span className="sm:hidden">
          {problem ? failedCount || "!" : pendingCount > 0 ? pendingCount : ""}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                    <TriangleAlert className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-heading font-black text-foreground">
                    Sincronizzazione
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {storageError && (
                <div className="flex gap-2.5 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                  <HardDriveDownload className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    Un salvataggio su questo dispositivo è fallito. Quello che vedi
                    potrebbe non essere stato registrato. Dettaglio: {storageError}
                  </span>
                </div>
              )}

              {state === "needs-reauth" && (
                <div className="flex gap-2.5 text-xs font-semibold text-foreground bg-muted border border-border rounded-xl px-3 py-2.5">
                  <LogIn className="w-4 h-4 shrink-0 mt-px text-primary" />
                  <span>
                    La sessione è scaduta. Esci e rientra dal menu account: i dati in
                    attesa restano salvati e verranno inviati dopo l'accesso.
                  </span>
                </div>
              )}

              {failedOperations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                    Operazioni bloccate
                  </span>
                  {failedOperations.map((op) => (
                    <div
                      key={op.seq}
                      className="flex items-start justify-between gap-3 bg-background border border-border rounded-xl px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">
                          {op.entity === "session"
                            ? op.op === "delete"
                              ? "Eliminazione allenamento"
                              : "Salvataggio allenamento"
                            : "Preferito"}
                        </p>
                        <p className="text-xs text-muted-foreground/80 break-all">
                          {op.lastError?.code}: {op.lastError?.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void discard(op.seq!)}
                        className="text-xs font-bold text-destructive hover:underline shrink-0 cursor-pointer"
                      >
                        Elimina
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => void retryFailed()}
                className="w-full py-3.5 bg-primary hover:bg-secondary text-on-primary font-heading font-black rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Riprova
              </button>

              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Nulla viene scartato automaticamente: finché un'operazione resta qui,
                i dati sono comunque salvati su questo dispositivo.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
