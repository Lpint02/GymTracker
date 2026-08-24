import { createClient } from "@supabase/supabase-js";

/**
 * The single Supabase client for the app.
 *
 * Both values are public by design and ship inside the client bundle. The anon
 * key authenticates a request as the `anon` Postgres role and nothing more:
 * with RLS enabled on every table and `anon` explicitly revoked, it can read
 * exactly zero rows on its own. What must NEVER appear here is the service_role
 * key — it bypasses RLS project-wide, and Vite statically inlines every VITE_*
 * variable into the built JavaScript.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Configurazione Supabase mancante. Copia .env.example in .env e inserisci " +
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}

// A URL ending in /rest/v1 is the REST endpoint, not the project URL —
// supabase-js appends the per-service suffixes itself, so leaving it on
// produces requests to /rest/v1/rest/v1/... that fail confusingly.
if (/\/rest\/v1\/?$/.test(url)) {
  throw new Error(
    "VITE_SUPABASE_URL deve essere l'URL base del progetto " +
      "(https://<ref>.supabase.co), senza /rest/v1/."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Keeps the session in localStorage and refreshes it in the background.
    // This is what lets the app open offline with the last known user instead
    // of bouncing to a login screen it cannot complete without a network.
    persistSession: true,
    autoRefreshToken: true,
    // The app has no router: this consumes the ?code=... that Google OAuth and
    // the email-confirmation link come back with, and AuthGate then cleans the
    // URL with history.replaceState().
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

/**
 * Whether a session has ever been established on this device.
 *
 * Deliberately our own flag rather than sniffing supabase-js's internal
 * `sb-<ref>-auth-token` key: this check has to run synchronously at first paint
 * to decide between "show the app with cached data" and "show the login
 * screen", and basing boot logic on another library's private storage format
 * is the kind of thing that breaks on a minor version bump.
 */
const LAST_USER_KEY = "gym_tracker_last_user";

export function getLastKnownUserId(): string | null {
  try {
    return localStorage.getItem(LAST_USER_KEY);
  } catch {
    return null;
  }
}

export function setLastKnownUserId(userId: string): void {
  try {
    localStorage.setItem(LAST_USER_KEY, userId);
  } catch {
    /* private mode / storage disabled — degrade to "never logged in here" */
  }
}

export function clearLastKnownUserId(): void {
  try {
    localStorage.removeItem(LAST_USER_KEY);
  } catch {
    /* nothing to do */
  }
}
