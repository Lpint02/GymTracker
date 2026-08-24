import { useState, type FormEvent } from "react";
import { Dumbbell, Mail, Lock, LoaderCircle, MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Mode = "login" | "signup";

/**
 * Login / signup screen. Rendered by AuthGate when this device has never had a
 * session — the app itself is never reachable without an account.
 *
 * After signup this shows a "check your inbox" notice rather than entering the
 * app: with Confirm email enabled Supabase issues no session until the address
 * is verified, so there is nothing to enter with.
 */
export default function AuthView() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const translateError = (message: string): string => {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) return "Email o password non corretti.";
    if (m.includes("email not confirmed")) return "Devi prima confermare l'email. Controlla la posta.";
    if (m.includes("user already registered")) return "Esiste già un account con questa email.";
    if (m.includes("password should be at least")) return "La password deve avere almeno 6 caratteri.";
    if (m.includes("failed to fetch")) return "Nessuna connessione. Riprova quando sei online.";
    return message;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setAwaitingConfirm(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // No navigation needed: onAuthStateChange flips AuthGate.
      }
    } catch (err) {
      setError(translateError((err as Error).message ?? "Errore imprevisto."));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(translateError(error.message));
      setBusy(false);
    }
    // On success the browser navigates away; no state to reset.
  };

  const resendConfirmation = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(translateError(error.message));
    setBusy(false);
  };

  if (awaitingConfirm) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <MailCheck className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-lg font-heading font-black text-foreground">
            Conferma la tua email
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Abbiamo inviato un link a <strong className="text-foreground">{email.trim()}</strong>.
            Aprilo per attivare l'account, poi torna qui e accedi.
          </p>

          {error && <ErrorNote>{error}</ErrorNote>}

          <button
            type="button"
            onClick={resendConfirmation}
            disabled={busy}
            className="text-xs font-bold text-primary hover:text-secondary disabled:opacity-50 cursor-pointer"
          >
            Non è arrivata? Invia di nuovo
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaitingConfirm(false);
              setMode("login");
              setPassword("");
            }}
            className="w-full py-3.5 bg-muted hover:bg-muted/70 text-muted-foreground font-bold rounded-xl text-xs border border-border transition-colors cursor-pointer"
          >
            Torna all'accesso
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center gap-2 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px]">
          <div className="w-full h-full bg-card rounded-[11px] flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary transform -rotate-45" />
          </div>
        </div>
        <h1 className="text-xl font-heading font-black text-foreground">GymTracker</h1>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          {mode === "login" ? "Accedi al tuo registro" : "Crea il tuo account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field icon={<Mail className="w-4 h-4" />}>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="La tua email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-foreground placeholder-muted-foreground/50"
          />
        </Field>

        <Field icon={<Lock className="w-4 h-4" />}>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-foreground placeholder-muted-foreground/50"
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 bg-primary hover:bg-secondary disabled:opacity-60 text-on-primary font-heading font-black rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {mode === "login" ? "Accedi" : "Registrati"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs font-bold text-muted-foreground/60 uppercase">oppure</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full py-3.5 bg-background hover:bg-muted disabled:opacity-60 text-foreground font-bold rounded-xl text-xs border border-border transition-colors cursor-pointer flex items-center justify-center gap-2.5"
      >
        <GoogleMark />
        Continua con Google
      </button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "login" ? "Non hai un account? " : "Hai già un account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="font-bold text-primary hover:text-secondary cursor-pointer"
        >
          {mode === "login" ? "Registrati" : "Accedi"}
        </button>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 w-full px-3.5 py-3 bg-background border border-border rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {children}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5"
    >
      {children}
    </p>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.05 6.05 29.27 4 24 4 13.5 4 5 12.5 5 23s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.5-.4-3.5z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.05 6.05 29.27 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 42c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 33.1 26.7 34 24 34c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 37.6 16.2 42 24 42z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C36.9 40.2 43 36 43 23c0-1.3-.1-2.5-.4-3.5z"/>
    </svg>
  );
}
