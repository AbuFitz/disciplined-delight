import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout, GoogleMark } from "@/components/nl/auth-ui";
import { Button, Field, Segmented, TextInput } from "@/components/nl/ui";
import { setMeta } from "@/data/db";
import { authApi, authMessage, MIN_PASSWORD } from "@/lib/auth";
import { enabledProviders, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" } =>
    s.mode === "signup" ? { mode: "signup" } : {},
  component: WelcomePage,
});

function useResendCooldown(seconds = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: () => setLeft(seconds) };
}

function WelcomePage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(
    search.mode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | "confirm" | "exists">(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const cool = useResendCooldown();

  useEffect(() => {
    void setMeta("welcome:seen", true);
  }, []);

  const tooShort = mode === "signup" && password.length > 0 && password.length < MIN_PASSWORD;
  const valid =
    /.+@.+\..+/.test(email) && password.length >= (mode === "signup" ? MIN_PASSWORD : 1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnconfirmed(false);
    try {
      if (mode === "signin") {
        await authApi.signIn(email, password);
        nav({ to: "/" });
      } else {
        const r = await authApi.signUp(email, password);
        if (r.alreadyRegistered) setSent("exists");
        else if (r.needsConfirmation) {
          setSent("confirm");
          cool.start();
        } else nav({ to: "/" });
      }
    } catch (err) {
      setError(authMessage(err));
      if (
        (err as { code?: string }).code === "email_not_confirmed" ||
        /not confirmed/i.test((err as Error).message)
      )
        setUnconfirmed(true);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await authApi.resendConfirmation(email);
      cool.start();
      toast.success("Confirmation email sent again.");
    } catch (err) {
      toast.error(authMessage(err));
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout
        title="Accounts aren't set up here"
        intro="This copy of VAYVOR isn't connected to an account service, so everything is saved on this device. You can use all personal features as a guest."
      >
        <Link
          to="/"
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-primary px-7 font-medium text-primary-foreground"
        >
          Set up this device
        </Link>
      </AuthLayout>
    );
  }

  if (sent) {
    return (
      <AuthLayout
        title={sent === "confirm" ? "Check your email" : "You may already have an account"}
        intro={
          sent === "confirm" ? (
            <>
              We sent a confirmation link to <strong>{email}</strong>. Open it on this device to
              finish. Until you confirm, you can't sign in.
            </>
          ) : (
            <>
              An account already uses <strong>{email}</strong>. Sign in, or reset your password if
              you've forgotten it. No new email was sent.
            </>
          )
        }
      >
        {sent === "confirm" && (
          <>
            <Button variant="secondary" size="lg" disabled={cool.left > 0} onClick={resend}>
              {cool.left > 0 ? `Send again in ${cool.left}s` : "Send the email again"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Nothing arrived? Check spam, and make sure the address is right.
            </p>
          </>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setSent(null);
            setMode("signin");
          }}
        >
          {sent === "confirm" ? "Use a different email" : "Go to sign in"}
        </Button>
        {sent === "exists" && (
          <Link to="/auth/forgot" className="text-sm underline underline-offset-4">
            Reset my password
          </Link>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={mode === "signin" ? "Welcome back" : "Start your routine"}
      intro={
        mode === "signin"
          ? "Sign in to pick up where you left off."
          : "Free to use. Choose the training, food, focus, reflection or optional faith tools that suit you."
      }
      footer={
        <button
          className="min-h-11 underline underline-offset-4"
          onClick={() => nav({ to: "/onboarding" })}
        >
          Use without an account. Everything stays on this device.
        </button>
      }
    >
      <Segmented
        label="Account"
        value={mode}
        onChange={(v) => {
          setMode(v);
          setError(null);
        }}
        options={[
          { value: "signin", label: "Sign in" },
          { value: "signup", label: "Create account" },
        ]}
      />
      {enabledProviders.includes("google") && (
        <>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => authApi.signInWithGoogle().catch((e) => setError(authMessage(e)))}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">or use email</p>
        </>
      )}
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="w-email">
          <TextInput
            id="w-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="w-pw"
          hint={mode === "signup" ? `At least ${MIN_PASSWORD} characters.` : undefined}
          error={tooShort ? `Use at least ${MIN_PASSWORD} characters.` : undefined}
        >
          <TextInput
            id="w-pw"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {unconfirmed && (
          <Button type="button" variant="secondary" disabled={cool.left > 0} onClick={resend}>
            {cool.left > 0 ? `Send again in ${cool.left}s` : "Send the confirmation email again"}
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" busy={busy} disabled={!valid}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        {mode === "signin" && (
          <Link
            to="/auth/forgot"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Forgot your password?
          </Link>
        )}
      </form>
    </AuthLayout>
  );
}
