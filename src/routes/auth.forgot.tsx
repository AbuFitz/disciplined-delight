import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/nl/auth-ui";
import { Button, Field, TextInput } from "@/components/nl/ui";
import { authApi, authMessage } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/auth/forgot")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isSupabaseConfigured)
    return (
      <AuthLayout
        title="Accounts aren't set up here"
        intro="There's nothing to reset on this copy of VAYVOR."
      >
        <Link
          to="/"
          className="inline-flex min-h-12 items-center rounded-full bg-surface-2 px-6 font-semibold"
        >
          Back
        </Link>
      </AuthLayout>
    );
  return (
    <AuthLayout
      title="Reset your password"
      intro={done ? undefined : "Enter your email and we'll send a link to choose a new password."}
    >
      {done ? (
        <p role="status">
          If an account uses that address, a reset link is on its way. Open it on this device. It
          works once and expires.
        </p>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await authApi.requestPasswordReset(email);
              setDone(true);
            } catch (err) {
              setError(authMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Email" htmlFor="f-email">
            <TextInput
              id="f-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            disabled={!/.+@.+\..+/.test(email)}
          >
            Send reset link
          </Button>
        </form>
      )}
      <Link
        to="/welcome"
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
