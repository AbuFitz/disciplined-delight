import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, ConfirmDialog, Field, Sheet, Switch, TextInput } from "./ui";
import { useScope } from "@/data/account";
import { ProfileApiError, profileApi, useAccountProfile } from "@/data/account-profile";
import { deleteScopeData, getScopeDB, listLocalScopes, outboxCount } from "@/data/db";
import { getScope, sameScope, type Scope } from "@/data/scope";
import {
  guestClaim,
  guestHasData,
  importGuest,
  previewGuestImport,
  type GuestClaim,
} from "@/data/guest-import";
import { getConflicts, resolveConflict, type Conflict } from "@/data/sync-engine";
import { syncNow } from "@/data/sync-runner";
import { SYNC_LABEL, useSyncStatus } from "@/data/sync-status";
import { authApi, authMessage, useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { ImportPreview } from "@/domain/backup";
import { checkUsername } from "@/domain/username";

const short = (v: unknown) => {
  const s = JSON.stringify(v) ?? "deleted";
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AccountSection() {
  const scope = useScope();
  if (!isSupabaseConfigured) {
    return (
      <div className="grid gap-2">
        <Chip>Guest · this device only</Chip>
        <p className="text-sm text-muted-foreground">
          Accounts, friends and cloud backup aren't set up in this build. Everything is saved on
          this device and backups are manual. To enable accounts, set <code>VITE_SUPABASE_URL</code>{" "}
          and <code>VITE_SUPABASE_ANON_KEY</code> and apply the migrations in{" "}
          <code>supabase/migrations</code>.
        </p>
      </div>
    );
  }
  return scope.kind === "guest" ? <GuestView /> : <UserView scope={scope} />;
}

/* ------------------------------ Guest ------------------------------ */
function GuestView() {
  const [remembered, setRemembered] = useState<
    { scope: Scope & { kind: "user" }; label: string }[]
  >([]);
  const [remove, setRemove] = useState<(Scope & { kind: "user" }) | null>(null);
  const load = useCallback(async () => {
    const out: typeof remembered = [];
    for (const s of await listLocalScopes()) {
      if (s.kind !== "user") continue;
      const label = (await (await getScopeDB(s)).get("meta", "scope:label")) as
        { email?: string; username?: string } | undefined;
      out.push({
        scope: s,
        label: label?.username
          ? `@${label.username}`
          : (label?.email ?? `Account ${s.userId.slice(0, 8)}`),
      });
    }
    setRemembered(out);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>Guest · this device only</Chip>
      </div>
      <p className="text-sm text-muted-foreground">
        You're using VAYVOR as a guest. Nothing leaves this device. An account adds backup, other
        devices, friends and challenges, and you choose whether to bring your guest data across.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/welcome"
          search={{ mode: "signup" }}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground"
        >
          Create an account
        </Link>
        <Link
          to="/welcome"
          className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-medium"
        >
          Sign in
        </Link>
      </div>
      {remembered.length > 0 && (
        <section
          aria-label="Accounts remembered on this device"
          className="border-t border-line pt-4"
        >
          <h3 className="font-medium">Remembered on this device</h3>
          <p className="text-sm text-muted-foreground">
            Signed-out accounts keep their data privately here until you sign in again. Remove it on
            a shared device.
          </p>
          <ul className="mt-2">
            {remembered.map((r) => (
              <li
                key={r.scope.userId}
                className="flex min-h-12 items-center justify-between gap-3 border-t border-line py-2 first:border-t-0"
              >
                <span className="truncate">{r.label}</span>
                <Button size="sm" variant="danger" onClick={() => setRemove(r.scope)}>
                  Remove from this device
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ConfirmDialog
        open={!!remove}
        onOpenChange={(o) => !o && setRemove(null)}
        title="Remove this account's data from this device?"
        body="Anything not yet synced to the account is lost. Synced data stays in the account and returns when you sign in."
        confirmLabel="Remove"
        onConfirm={async () => {
          await deleteScopeData(remove!);
          setRemove(null);
          toast("Removed from this device");
          void load();
        }}
      />
    </div>
  );
}

/* ------------------------------ Signed in ------------------------------ */
function UserView({ scope }: { scope: Scope & { kind: "user" } }) {
  const auth = useAuth();
  const { state } = useAccountProfile();
  const status = useSyncStatus();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [out, setOut] = useState(false);
  const refresh = async () => setConflicts(await getConflicts());
  useEffect(() => {
    void refresh();
  }, [status.mode]);
  const profile = state.status === "ready" ? state.profile : null;

  return (
    <div className="grid gap-4">
      <div>
        <p className="font-display text-xl font-semibold">
          {profile ? profile.display_name : "Your account"}
          {profile && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              @{profile.username}
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{auth.user?.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          tone={status.mode === "synced" ? "ok" : status.mode === "attention" ? "warn" : "neutral"}
        >
          {SYNC_LABEL[status.mode]}
        </Chip>
        <span className="text-sm text-muted-foreground">
          {status.detail ?? "Your data is backed up to your account."}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await syncNow(scope, auth.user?.id);
              await refresh();
              toast(
                "skipped" in r
                  ? r.skipped
                  : r.error
                    ? r.error
                    : `Synced: ${r.pushed} sent, ${r.pulled} received`,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Sync now
        </Button>
        <Button variant="secondary" onClick={() => setEdit(true)} disabled={!profile}>
          Edit profile
        </Button>
        <Button variant="ghost" onClick={() => setOut(true)}>
          Sign out
        </Button>
      </div>

      <GuestImport scope={scope} />

      {conflicts.length > 0 && (
        <section aria-label="Changes to review">
          <h3 className="eyebrow mb-1">Changes to review</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            The same item was changed here and elsewhere. Pick which version to keep. The other is
            discarded.
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
      <EditProfileSheet open={edit} onOpenChange={setEdit} />
      <SignOutSheet open={out} onOpenChange={setOut} scope={scope} />
    </div>
  );
}

/* ------------------------------ Guest data import ------------------------------ */
function GuestImport({ scope }: { scope: Scope & { kind: "user" } }) {
  const [count, setCount] = useState<number | null>(null);
  const [claim, setClaim] = useState<GuestClaim | undefined>();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setCount(await guestHasData());
    setClaim(await guestClaim());
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (open) void previewGuestImport().then(setPreview);
  }, [open]);
  if (count === null || (count === 0 && !claim)) return null;
  return (
    <section aria-label="Guest data" className="rounded-2xl border border-line p-4">
      <h3 className="font-medium">Data from before you had an account</h3>
      {claim ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Imported on {new Date(claim.at).toLocaleDateString("en-GB")}. The original guest copy is
          still on this device, untouched.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            This device holds {count} guest records (your earlier programme, logs and settings).
            Bring them into this account once. Nothing is deleted from the guest copy.
          </p>
          <Button className="mt-3" variant="secondary" onClick={() => setOpen(true)}>
            Review and import
          </Button>
        </>
      )}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Import guest data"
        description="A one-time merge into this account."
        footer={
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            busy={busy}
            disabled={!preview}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await importGuest(scope.userId);
                toast.success(`Imported ${r.written} records`);
                setOpen(false);
                await load();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Import into my account
          </Button>
        }
      >
        <div className="grid gap-3 pb-3">
          {preview ? (
            <>
              <p className="tnum">
                <strong>{preview.totals.added}</strong> new, {preview.totals.identical} already
                here, <strong>{preview.totals.conflicting}</strong> differ.
              </p>
              <p className="text-sm text-muted-foreground">
                Where an item differs, your account's version is kept and the guest version stays
                safe in the guest copy. Your account name, handle and timezone are never
                overwritten.
              </p>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-sm">By area</summary>
                <ul className="text-sm tnum">
                  {preview.perCollection.map((p) => (
                    <li
                      key={p.collection}
                      className="flex justify-between border-t border-line py-1.5"
                    >
                      <span>{p.collection}</span>
                      <span>
                        {p.added} new · {p.conflicting} differ
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Checking…</p>
          )}
        </div>
      </Sheet>
    </section>
  );
}

/* ------------------------------ Profile editing ------------------------------ */
function EditProfileSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, refresh } = useAccountProfile();
  const p = state.status === "ready" ? state.profile : null;
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [tz, setTz] = useState("Europe/London");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open && p) {
      setName(p.display_name);
      setHandle(p.username);
      setTz(p.timezone);
      setErr(null);
    }
  }, [open, p]);
  const syntax = checkUsername(handle);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit profile"
      description="Friendships and messages follow your account, so changing your handle won't break them."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          busy={busy}
          disabled={!name.trim() || !syntax.ok}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await profileApi.update({
                displayName: name.trim(),
                timezone: tz,
                username: handle !== p?.username ? handle : undefined,
              });
              refresh();
              toast.success("Profile saved");
              onOpenChange(false);
            } catch (e) {
              setErr(
                e instanceof ProfileApiError && e.code === "username_taken"
                  ? "That handle is taken."
                  : authMessage(e),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </Button>
      }
    >
      <div className="grid gap-4 pb-3">
        <Field label="Display name" htmlFor="ep-name">
          <TextInput
            id="ep-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="Handle"
          htmlFor="ep-handle"
          error={handle && !syntax.ok ? syntax.reason : (err ?? undefined)}
        >
          <TextInput
            id="ep-handle"
            autoCapitalize="none"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </Field>
        <Field label="Timezone" htmlFor="ep-tz">
          <TextInput id="ep-tz" value={tz} onChange={(e) => setTz(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

/* ------------------------------ Sign out ------------------------------ */
function SignOutSheet({
  open,
  onOpenChange,
  scope,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scope: Scope & { kind: "user" };
}) {
  const auth = useAuth();
  const [pending, setPending] = useState<number | null>(null);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPending(null);
    void (async () => {
      if (navigator.onLine) await syncNow(scope, auth.user?.id).catch(() => undefined); // try to get everything safely to the account first
      setPending(await outboxCount());
    })();
  }, [open, scope, auth.user?.id]);

  const confirm = async () => {
    setBusy(true);
    const leaving = scope;
    try {
      await authApi.signOut();
      if (remove) {
        // The app switches to the guest scope as soon as auth reports signed out; wait for that before deleting.
        for (let i = 0; i < 30 && sameScope(getScope(), leaving); i++) await sleep(100);
        await deleteScopeData(leaving);
      }
    } catch (e) {
      toast.error(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sign out"
      description="Your account's data is never turned into guest data."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          busy={busy}
          disabled={pending === null}
          onClick={confirm}
        >
          {remove ? "Sign out and remove my data here" : "Sign out"}
        </Button>
      }
    >
      <div className="grid gap-4 pb-3">
        {pending === null ? (
          <p className="text-sm text-muted-foreground">Syncing your latest changes first…</p>
        ) : pending > 0 ? (
          <p role="alert" className="rounded-2xl border border-warn/50 p-3 text-sm">
            {pending} change{pending > 1 ? "s haven't" : " hasn't"} reached your account yet
            {remove
              ? ", and removing your data here will lose them."
              : ". They stay on this device, privately, and sync when you sign back in."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Everything is safely in your account.</p>
        )}
        <Switch
          label="Remove my data from this device"
          hint="Choose this on a shared or borrowed device. You can sign in again to get it back."
          checked={remove}
          onChange={setRemove}
        />
        <p className="text-xs text-muted-foreground">
          If you keep it, your data stays in storage that only your account opens. A guest or
          another account on this browser can't see it.
        </p>
      </div>
    </Sheet>
  );
}
