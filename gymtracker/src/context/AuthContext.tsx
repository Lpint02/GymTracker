import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  supabase,
  getLastKnownUserId,
  setLastKnownUserId,
  clearLastKnownUserId,
} from "../lib/supabase";
import { wipeLocalData } from "../lib/db";

/**
 * Owns the Supabase auth session. Deliberately knows nothing about workouts:
 * it sits OUTSIDE WorkoutProvider, because hydration needs a user id before it
 * reads anything and the sync engine needs the token.
 */

export type AuthPhase =
  /** No session has ever existed on this device — hard block on login. */
  | "signed-out"
  /** Resolving a stored session. Renders children if one was known before. */
  | "loading"
  | "signed-in";

interface AuthContextValue {
  phase: AuthPhase;
  session: Session | null;
  user: User | null;
  /** True when we entered the app on a cached session we could not refresh. */
  isOffline: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Seeded synchronously at first paint: if this device has signed in before,
  // we start in "loading" and render the app immediately rather than flashing
  // a login screen we may not even be able to complete offline.
  const [phase, setPhase] = useState<AuthPhase>(() =>
    getLastKnownUserId() ? "loading" : "signed-out"
  );
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (data.session) {
          setSession(data.session);
          setLastKnownUserId(data.session.user.id);
          setPhase("signed-in");
          return;
        }

        // No session came back. Distinguishing WHY matters: a refresh that
        // failed because there is no network must not log the user out of an
        // offline-first app. Only a definitive answer from a reachable server
        // does that.
        if (getLastKnownUserId() && (error || !navigator.onLine)) {
          setIsOffline(true);
          setPhase("signed-in");
          return;
        }

        clearLastKnownUserId();
        setPhase("signed-out");
      })
      .catch(() => {
        if (cancelled) return;
        if (getLastKnownUserId()) {
          setIsOffline(true);
          setPhase("signed-in");
        } else {
          setPhase("signed-out");
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (cancelled) return;

      if (next) {
        setSession(next);
        setLastKnownUserId(next.user.id);
        setIsOffline(false);
        setPhase("signed-in");
        return;
      }

      // Only an explicit sign-out clears the device. A token refresh failing
      // while offline also delivers a null session, and treating that as a
      // logout would lock the user out of their own local data.
      if (event === "SIGNED_OUT") {
        setSession(null);
        clearLastKnownUserId();
        setPhase("signed-out");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Local data is per-account. Wiping it here is what stops one user's
    // history from appearing under the next account on a shared device.
    await wipeLocalData().catch(() => {
      /* best effort: never block sign-out on storage */
    });
    // Easy to forget, and device-local: the in-progress workout lives in
    // localStorage, not IndexedDB, so wipeLocalData does not touch it.
    try {
      localStorage.removeItem("gym_tracker_active_session");
    } catch {
      /* ignore */
    }
    clearLastKnownUserId();
    setSession(null);
    setPhase("signed-out");
  }, []);

  return (
    <AuthContext.Provider
      value={{ phase, session, user: session?.user ?? null, isOffline, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve essere usato dentro un AuthProvider");
  }
  return ctx;
}
