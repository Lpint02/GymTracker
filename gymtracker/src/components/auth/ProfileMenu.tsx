import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User as UserIcon, X, CloudOff, TriangleAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { countPendingOperations } from "../../lib/db";

/**
 * Account button in the header: who is signed in, and the way out.
 */
export default function ProfileMenu() {
  const { user, isOffline, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);

  const email = user?.email ?? "Account";
  const initial = email.charAt(0).toUpperCase();

  const openMenu = async () => {
    setOpen(true);
    setPending(await countPendingOperations());
  };

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isOffline && (
          <span
            title="Sei offline: stai usando i dati salvati su questo dispositivo."
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-card border border-border/80 px-2.5 py-2 rounded-xl"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}

        <button
          type="button"
          onClick={openMenu}
          title={email}
          className="w-10 h-10 rounded-xl bg-card border border-border hover:border-primary/60 text-foreground font-heading font-black flex items-center justify-center transition-colors cursor-pointer"
        >
          {initial}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-heading font-black text-foreground">
                    Account
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

              <div className="space-y-1">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                  Connesso come
                </span>
                <p className="text-sm font-bold text-foreground break-all">{email}</p>
              </div>

              {pending > 0 && (
                <div className="flex gap-2.5 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                  <TriangleAlert className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    Hai {pending} {pending === 1 ? "modifica" : "modifiche"} non ancora
                    sincronizzate. Uscendo verranno perse definitivamente.
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="w-full py-3.5 bg-destructive/90 hover:bg-destructive disabled:opacity-60 text-on-destructive font-heading font-black rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {busy ? "Uscita…" : "Esci"}
              </button>

              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Uscendo, i dati salvati su questo dispositivo vengono rimossi. Restano
                al sicuro sul tuo account.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
