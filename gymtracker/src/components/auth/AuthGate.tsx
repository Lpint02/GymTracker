import { useEffect, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import AuthView from "./AuthView";
import AppSkeleton from "../shell/AppSkeleton";

/**
 * Decides between the login screen and the app. A conditional render, not a
 * route — the same idiom App.tsx already uses. Adding a router for two states
 * would be more machinery than this app has anywhere else.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { phase } = useAuth();

  // Google OAuth and the email-confirmation link both return to the app origin
  // carrying ?code=... (PKCE). supabase-js consumes it on load via
  // detectSessionInUrl; this just tidies the address bar afterwards so a
  // refresh or a bookmark does not re-submit a spent code.
  useEffect(() => {
    const url = new URL(window.location.href);
    const hadAuthParams =
      url.searchParams.has("code") ||
      url.searchParams.has("error") ||
      url.searchParams.has("error_description") ||
      url.hash.includes("access_token");

    if (hadAuthParams) {
      window.history.replaceState({}, "", url.origin + url.pathname);
    }
  }, []);

  if (phase === "signed-out") {
    return <AuthView />;
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        <AppSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}
