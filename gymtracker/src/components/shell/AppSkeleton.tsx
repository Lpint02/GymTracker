/**
 * Placeholder shown while workout history hydrates from IndexedDB.
 *
 * Not cosmetic. Hydration is asynchronous, so without this gate the derivation
 * hooks briefly run against an empty array and the app states things that are
 * false: "Nessun allenamento trovato" in the history list, a streak of 0, and
 * "Nessuno" as the last workout date — each then snapping to the real value.
 *
 * Gated in one place (AppShell) rather than scattered through leaf components.
 */
export default function AppSkeleton() {
  return (
    <div
      className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full space-y-4"
      aria-busy="true"
      aria-label="Caricamento dei dati"
    >
      <div className="h-28 rounded-2xl bg-card border border-border/60 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-2xl bg-card border border-border/60 animate-pulse" />
        <div className="h-20 rounded-2xl bg-card border border-border/60 animate-pulse" />
        <div className="h-20 rounded-2xl bg-card border border-border/60 animate-pulse" />
      </div>
      <div className="h-40 rounded-2xl bg-card border border-border/60 animate-pulse" />
    </div>
  );
}
