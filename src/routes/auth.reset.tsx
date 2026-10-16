import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/nl/auth-ui";
import { Button, Field, TextInput } from "@/components/nl/ui";
import { authApi, authMessage, MIN_PASSWORD, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/reset")({ component: ResetPage });

function ResetPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // A recovery link signs the person in temporarily; without one there is nothing to reset.
  if (!auth.user && timedOut) {
    return (
      <AuthLayout
        title="This reset link isn't valid"
        intro="It may have expired, been used already, or been opened in a different browser."
      >
        <Link
          to="/auth/forgot"
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-primary px-7 font-medium text-primary-foreground"
        >
          Send a new link
        </Link>
      </AuthLayout>
    );
  }
  if (!auth.user)
    return (
      <AuthLayout title="One moment…">
        <div aria-busy className="h-2 animate-pulse rounded-full bg-surface-2" />
      </AuthLayout>
    );

  const mismatch = pw2.length > 0 && pw !== pw2;
  return (
    <AuthLayout title="Choose a new password">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await authApi.updatePassword(pw);
            toast.success("Password updated");
            nav({ to: "/", replace: true });
          } catch (err) {
            setError(authMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="New password" htmlFor="r-pw" hint={`At least ${MIN_PASSWORD} characters.`}>
          <TextInput
            id="r-pw"
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </Field>
        <Field
          label="Repeat it"
          htmlFor="r-pw2"
          error={mismatch ? "The passwords don't match." : undefined}
        >
          <TextInput
            id="r-pw2"
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          busy={busy}
          disabled={pw.length < MIN_PASSWORD || pw !== pw2}
        >
          Save password
        </Button>
      </form>
    </AuthLayout>
  );
}
