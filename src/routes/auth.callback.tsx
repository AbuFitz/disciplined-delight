import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/nl/auth-ui";
import { Button, Field, TextInput } from "@/components/nl/ui";
import { authApi, authMessage, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({ component: CallbackPage });

/** Reads error details from either the query string or the hash fragment Supabase redirects with. */
function readLinkError(): { code?: string; description?: string } | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (k: string) => p.get(k) ?? h.get(k) ?? undefined;
  const code = get("error_code") ?? get("error");
  return code ? { code, description: get("error_description")?.replace(/\+/g, " ") } : null;
}

function CallbackPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const [err] = useState(readLinkError);
  const [timedOut, setTimedOut] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (auth.user && !err) nav({ to: "/", replace: true });
  }, [auth.user, err, nav]);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 7000);
    return () => clearTimeout(t);
  }, []);

  if (err || (timedOut && !auth.user)) {
    const expired =
      !err || err.code === "otp_expired" || /expired|invalid/i.test(err.description ?? "");
    return (
      <AuthLayout
        title={expired ? "That link has expired" : "We couldn't confirm that"}
        intro={
          err?.description
            ? `${err.description}.`
            : "The link was already used, has expired, or was opened on a different browser."
        }
      >
        {sent ? (
          <p role="status" className="text-sm">
            If that address needs confirming, a new email is on its way.
          </p>
        ) : (
          <>
            <Field label="Your email" htmlFor="cb-email">
              <TextInput
                id="cb-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button
              variant="primary"
              size="lg"
              disabled={!/.+@.+\..+/.test(email)}
              onClick={async () => {
                try {
                  await authApi.resendConfirmation(email);
                  setSent(true);
                } catch (e) {
                  toast.error(authMessage(e));
                }
              }}
            >
              Send a new confirmation email
            </Button>
          </>
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
  return (
    <AuthLayout title="Confirming…" intro="One moment while we finish signing you in.">
      <div aria-busy className="h-2 animate-pulse rounded-full bg-surface-2" />
    </AuthLayout>
  );
}
