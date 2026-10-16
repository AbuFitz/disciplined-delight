import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, Field, TextInput } from "./ui";
import { dumpAll, getMeta, setMeta } from "@/data/db";
import { createSupabaseRemote } from "@/data/supabase-remote";
import { SYNC_LINK_KEY, type SyncLink } from "@/data/sync-runner";
import { getConflicts, resolveConflict, runSync, type Conflict } from "@/data/sync-engine";
import { SYNC_LABEL, setSyncStatus, useSyncStatus } from "@/data/sync-status";
import { useSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

const short = (v: unknown) => {
  const s = JSON.stringify(v) ?? "deleted";
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
};

export function SyncSection() {
  const auth = useSession();
  const status = useSyncStatus();
  const [link, setLink] = useState<SyncLink | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<{ local: number; remote: number } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const refresh = async () => {
    setLink((await getMeta<SyncLink>(SYNC_LINK_KEY)) ?? null);
    setConflicts(await getConflicts());
  };
  useEffect(() => {
    void refresh();
  }, [status.mode]);
  useEffect(() => {
    if (!auth.user || link) return;
    void (async () => {
      try {
        setCounts({
          local: (await dumpAll()).filter((r) => !r.deletedAt).length,
          remote: await createSupabaseRemote().count(),
        });
      } catch {
        setCounts(null);
      }
    })();
  }, [auth.user, link]);

  if (!isSupabaseConfigured) {
    return (
      <div className="grid gap-2">
        <Chip>This device only</Chip>
        <p className="text-sm text-muted-foreground">
          Cloud backup and multi-device sync aren't set up in this build. To enable them, set{" "}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then apply the
          migrations in <code>supabase/migrations</code>. Until then, everything is saved on this
          device and backups are manual.
        </p>
      </div>
    );
  }
  if (auth.loading || link === undefined)
    return <p className="text-sm text-muted-foreground">Checking account…</p>;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!auth.user) {
    return (
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            await auth.signIn(email, password);
            toast.success("Signed in");
          });
        }}
      >
        <p className="text-sm text-muted-foreground">
          Optional. Signing in lets you back up and use the app on more than one device. Your data
          stays on this device until you choose to link it.
        </p>
        <Field label="Email" htmlFor="au-e">
          <TextInput
            id="au-e"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="au-p">
          <TextInput
            id="au-p"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            busy={busy}
            disabled={!email || password.length < 6}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !email || password.length < 6}
            onClick={() =>
              act(async () => {
                const r = await auth.signUp(email, password);
                toast.success(
                  r.needsConfirmation
                    ? "Check your email to confirm, then sign in."
                    : "Account created",
                );
              })
            }
          >
            Create account
          </Button>
        </div>
      </form>
    );
  }

  if (!link) {
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          Signed in as <strong>{auth.user.email}</strong>. This device isn't syncing yet.
        </p>
        {counts && (
          <p className="text-sm text-muted-foreground tnum">
            {counts.local} records on this device · {counts.remote} in your account. Matching
            records are merged. Anything that differs is listed for you to choose. Nothing is
            deleted.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            busy={busy}
            onClick={() =>
              act(async () => {
                await setMeta(SYNC_LINK_KEY, {
                  userId: auth.user!.id,
                  since: Date.now(),
                } satisfies SyncLink);
                setSyncStatus({ mode: "syncing" });
                const r = await runSync(createSupabaseRemote());
                await refresh();
                toast.success(
                  r.error ? `Linked. ${r.error}` : `Synced: ${r.pushed} sent, ${r.pulled} received`,
                );
              })
            }
          >
            Turn on sync for this device
          </Button>
          <Button variant="ghost" onClick={auth.signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          tone={status.mode === "synced" ? "ok" : status.mode === "attention" ? "warn" : "neutral"}
        >
          {SYNC_LABEL[status.mode]}
        </Chip>
        <span className="text-sm text-muted-foreground">
          {status.detail ?? `Signed in as ${auth.user.email}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          busy={busy}
          onClick={() =>
            act(async () => {
              const r = await runSync(createSupabaseRemote());
              await refresh();
              toast(r.error ? r.error : `Synced: ${r.pushed} sent, ${r.pulled} received`);
            })
          }
        >
          Sync now
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await setMeta(SYNC_LINK_KEY, null);
            setLink(null);
            setSyncStatus({ mode: "local" });
            toast("Sync turned off here. Your data stays on this device and in your account.");
          }}
        >
          Turn off sync
        </Button>
        <Button variant="ghost" onClick={auth.signOut}>
          Sign out
        </Button>
      </div>
      {conflicts.length > 0 && (
        <section aria-label="Changes to review">
          <h3 className="eyebrow mb-1">Changes to review</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            The same item was changed on this device and elsewhere. Pick which version to keep. The
            other is discarded.
          </p>
          <ul className="grid gap-3">
            {conflicts.map((c) => (
              <li key={c.key} className="rounded-2xl border border-line p-3">
                <p className="text-sm font-medium">
                  {c.collection} · {c.id.slice(0, 18)}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  <strong>This device:</strong> {c.localDeleted ? "deleted" : short(c.local)}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  <strong>Other version:</strong> {c.serverDeleted ? "deleted" : short(c.server)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await resolveConflict(c.key, "mine");
                      await refresh();
                    }}
                  >
                    Keep this device's
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await resolveConflict(c.key, "theirs");
                      await refresh();
                    }}
                  >
                    Use the other
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
