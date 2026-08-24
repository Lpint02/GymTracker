import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { WorkoutProvider } from "../../context/WorkoutContext";

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
  return <WorkoutProvider key={user?.id ?? "anonymous"}>{children}</WorkoutProvider>;
}
