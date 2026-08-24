import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { WorkoutProvider } from "../../context/WorkoutContext";
import { startSyncEngine } from "../../lib/sync/engine";
import { hydrateFromServer } from "../../lib/sync/hydrate";
import AppSkeleton from "../shell/AppSkeleton";

/**
 * Binds workout state to the signed-in account, and makes sure local storage is
 * in step with that account before anything reads it.
 *
 * The `key` is the whole point of the first job: changing it makes React
 * unmount and remount the entire subtree, so every hook re-initializes and
 * re-hydrates from the (wiped) local database. That is the cheapest correct
 * answer to account switching — no reset logic to write, and no way for one
 * account's history, search term, selected workout, or favorites to survive
 * into the next.
 */
export default function ScopedWorkoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const [ready, setReady] = useState(false);

  // Started here rather than in main.tsx so the engine only ever runs behind a
  // signed-in session — draining a queue with no token would just turn every
  // operation into an auth failure.
  useEffect(() => startSyncEngine(), []);

  // Gate the provider on hydration: useWorkoutHistory reads IndexedDB on mount,
  // so pulling concurrently would leave it showing pre-restore data until
  // something happened to re-render it.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    hydrateFromServer(userId)
      .catch((error) => {
        // Offline, or the server is unreachable. Not fatal: the local store is
        // the working copy, and blocking entry on a network call would break
        // the offline-first promise this whole design exists for.
        console.warn("[sync] idratazione iniziale non riuscita", error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        <AppSkeleton />
      </div>
    );
  }

  return <WorkoutProvider key={userId ?? "anonymous"}>{children}</WorkoutProvider>;
}
