import { useEffect, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { WorkoutProvider } from "../../context/WorkoutContext";
import { startSyncEngine } from "../../lib/sync/engine";

/**
 * Binds workout state to the signed-in account.
 *
 * The `key` is the whole point: changing it makes React unmount and remount the
 * entire subtree, so every hook re-initializes and re-hydrates from the (wiped)
 * local database. That is the cheapest correct answer to account switching —
 * there is no reset logic to write, and no way for one account's history,
 * search term, selected workout, or favorites to survive into the next.
 */
export default function ScopedWorkoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  // Started here rather than in main.tsx so the engine only ever runs behind a
  // signed-in session — there is no point draining a queue with no token, and
  // every operation would come back as an auth failure.
  useEffect(() => startSyncEngine(), []);

  return <WorkoutProvider key={user?.id ?? "anonymous"}>{children}</WorkoutProvider>;
}
