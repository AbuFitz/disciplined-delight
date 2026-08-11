import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Gates the whole app behind Supabase Auth once credentials are configured.
 * With no VITE_SUPABASE_* env vars set, this is a no-op passthrough — the
 * app keeps working on localStorage only, same as before Supabase existed.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!isSupabaseConfigured) return <>{children}</>;

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth.session) return <LoginScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />;

  return <>{children}</>;
}

function LoginScreen({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setSignedUp(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-elevated">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-primary">
            NL
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            New Life
          </span>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to sync your training across devices."
            : "One account, synced everywhere you train."}
        </p>

        {signedUp ? (
          <div className="mt-6 rounded-2xl border border-vital/40 bg-vital/10 p-4 text-sm text-vital-foreground">
            Check your inbox to confirm your email, then sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-secondary px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-secondary px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setSignedUp(false);
          }}
          className="mt-4 w-full text-center text-xs font-medium text-primary"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
