import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Flag, Plus, ShieldCheck, Sparkles, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  TextArea,
  TextInput,
} from "@/components/nl/ui";
import { useAccountProfile } from "@/data/account-profile";
import {
  challengeApi,
  challengeMessage,
  type Challenge,
  type ChallengeDraft,
  type ChallengeEntry,
  validateChallenge,
} from "@/data/circle-challenges";
import { circleApi, type CirclePerson } from "@/data/circle";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/circle_/challenges")({ component: ChallengesPage });

const isoAfter = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function ChallengesPage() {
  const auth = useAuth();
  const profile = useAccountProfile();
  const ready = !!auth.user && profile.state.status === "ready" && isSupabaseConfigured;
  return (
    <>
      <PageHeader
        title="Pacts"
        sub="Invite one connection, agree a target, check in honestly. No leaderboard, no private-data mining."
        actions={
          <Link
            to="/circle"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Circle
          </Link>
        }
      />
      {ready ? <ChallengesLive /> : <ChallengeGate />}
    </>
  );
}

function ChallengeGate() {
  return (
    <Panel tone="green">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Trophy className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold">Pacts start with a real connection</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Connect account services, sign in, finish your handle and accept a Circle connection. VAYVOR
        never invents opponents or progress.
      </p>
      <Link
        to="/settings"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground sm:w-fit"
      >
        Open account settings
      </Link>
    </Panel>
  );
}

function ChallengesLive() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [connections, setConnections] = useState<CirclePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [nextChallenges, nextConnections] = await Promise.all([
        challengeApi.list(),
        circleApi.connections(),
      ]);
      setChallenges(nextChallenges);
      setConnections(nextConnections.filter((person) => person.relationship === "connected"));
      setError(null);
    } catch (cause) {
      setError(challengeMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void refresh(), [refresh]);

  if (loading)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  return (
    <div className="grid gap-4">
      {error && (
        <Panel tone="warm" role="alert">
          <p className="font-semibold">Pacts could not refresh</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-3" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </Panel>
      )}
      {creating ? (
        <CreatePact
          connections={connections}
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      ) : (
        <Panel tone="green" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="mt-1 font-display text-2xl font-bold">Make a pact</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Progress is self-reported and visible only to the two of you.
            </p>
          </div>
          <Button
            variant="primary"
            disabled={!connections.length}
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" /> New pact
          </Button>
        </Panel>
      )}
      {!connections.length && (
        <Panel tone="dusk">
          <p className="font-semibold">Connect before you compete</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Accepted Circle connections appear here. Strangers cannot be invited.
          </p>
        </Panel>
      )}
      <ChallengeList challenges={challenges} refresh={refresh} />
      <Panel tone="warm">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="size-5" /> Fair by design
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <li>Invitation and acceptance are explicit.</li>
          <li>Check-ins are honest self-reports, not proof of performance.</li>
          <li>Blocking closes visibility immediately.</li>
        </ul>
      </Panel>
    </div>
  );
}

function CreatePact({
  connections,
  onCancel,
  onCreated,
}: {
  connections: CirclePerson[];
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ChallengeDraft>({
    userId: connections[0]?.user_id ?? "",
    title: "Eight-session pact",
    unit: "sessions",
    target: 8,
    endsOn: isoAfter(14),
  });
  const [busy, setBusy] = useState(false);
  const invalid = validateChallenge(draft);
  const presets = [
    { label: "8 sessions", title: "Eight-session pact", unit: "sessions", target: 8, days: 14 },
    {
      label: "14 active days",
      title: "Two-week movement pact",
      unit: "active days",
      target: 14,
      days: 21,
    },
    { label: "20 walks", title: "Twenty-walk pact", unit: "walks", target: 20, days: 28 },
  ];
  const submit = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await challengeApi.create(draft);
      toast.success("Pact invitation sent");
      await onCreated();
    } catch (cause) {
      toast.error(challengeMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel tone="green" aria-label="Create a pact">
      <h2 className="mt-1 font-display text-2xl font-bold">Keep it concrete</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            size="sm"
            variant="secondary"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                title: preset.title,
                unit: preset.unit,
                target: preset.target,
                endsOn: isoAfter(preset.days),
              }))
            }
          >
            <Sparkles className="size-3.5" /> {preset.label}
          </Button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Connection">
          <Select
            value={draft.userId}
            onChange={(e) => setDraft((d) => ({ ...d, userId: e.target.value }))}
          >
            {connections.map((person) => (
              <option key={person.user_id} value={person.user_id}>
                {person.display_name} (@{person.username})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pact title">
          <TextInput
            maxLength={60}
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
        </Field>
        <Field label="Target">
          <TextInput
            type="number"
            min={1}
            max={100}
            value={draft.target}
            onChange={(e) => setDraft((d) => ({ ...d, target: Number(e.target.value) }))}
          />
        </Field>
        <Field label="What you count">
          <TextInput
            maxLength={24}
            value={draft.unit}
            onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
          />
        </Field>
        <Field label="End date">
          <TextInput
            type="date"
            min={isoAfter(1)}
            max={isoAfter(42)}
            value={draft.endsOn}
            onChange={(e) => setDraft((d) => ({ ...d, endsOn: e.target.value }))}
          />
        </Field>
      </div>
      {invalid && <p className="mt-3 text-sm text-warn">{invalid}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" busy={busy} disabled={!!invalid} onClick={() => void submit()}>
          Send invitation
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Panel>
  );
}

function ChallengeList({
  challenges,
  refresh,
}: {
  challenges: Challenge[];
  refresh: () => Promise<void>;
}) {
  if (!challenges.length)
    return (
      <EmptyState
        title="No pacts yet"
        body="Create one with a trusted connection. Nothing appears here until someone really participates."
      />
    );
  return (
    <div className="grid gap-4">
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} refresh={refresh} />
      ))}
    </div>
  );
}

function ChallengeCard({
  challenge,
  refresh,
}: {
  challenge: Challenge;
  refresh: () => Promise<void>;
}) {
  const [entries, setEntries] = useState<ChallengeEntry[] | null>(null);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const minePct = Math.min(100, (challenge.mine_progress / challenge.target) * 100);
  const theirPct = Math.min(100, (challenge.their_progress / challenge.target) * 100);
  const ended = new Date(`${challenge.ends_on}T23:59:59`) < new Date();
  const remaining = challenge.target - challenge.mine_progress;
  const loadEntries = async () => {
    try {
      setEntries(await challengeApi.entries(challenge.id));
    } catch (cause) {
      toast.error(challengeMessage(cause));
    }
  };
  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await refresh();
    } catch (cause) {
      toast.error(challengeMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel tone={challenge.status === "active" ? "dusk" : "plain"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              tone={
                challenge.status === "active"
                  ? "ok"
                  : challenge.status === "pending"
                    ? "warn"
                    : "neutral"
              }
            >
              {challenge.status}
            </Chip>
            <span className="text-xs text-muted-foreground">with @{challenge.other_username}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">{challenge.title}</h2>
          <p className="text-sm text-muted-foreground">
            Target {challenge.target} {challenge.unit} · ends {formatDate(challenge.ends_on)}
          </p>
        </div>
        {challenge.status === "pending" && challenge.invited_me && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              busy={busy}
              onClick={() =>
                void act(() => challengeApi.respond(challenge.id, true), "Pact accepted")
              }
            >
              <Check className="size-4" /> Accept
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void act(() => challengeApi.respond(challenge.id, false), "Invitation declined")
              }
            >
              <X className="size-4" /> Decline
            </Button>
          </div>
        )}
      </div>
      {challenge.status === "active" && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ProgressRow
              label="You"
              value={challenge.mine_progress}
              target={challenge.target}
              pct={minePct}
            />
            <ProgressRow
              label={challenge.other_display_name}
              value={challenge.their_progress}
              target={challenge.target}
              pct={theirPct}
            />
          </div>
          {!ended && remaining > 0 && (
            <div className="mt-6 grid gap-3 pt-2 md:grid-cols-[8rem_1fr_auto]">
              <Field label="Add">
                <TextInput
                  type="number"
                  min={1}
                  max={Math.min(10, remaining)}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </Field>
              <Field label="Optional note">
                <TextArea
                  className="min-h-12"
                  maxLength={120}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What counted today?"
                />
              </Field>
              <Button
                className="self-end"
                variant="primary"
                busy={busy}
                disabled={
                  !Number.isInteger(amount) || amount < 1 || amount > Math.min(10, remaining)
                }
                onClick={() =>
                  void act(
                    () => challengeApi.add(challenge.id, amount, note),
                    "Progress added",
                  ).then(() => {
                    setAmount(1);
                    setNote("");
                  })
                }
              >
                <Plus className="size-4" /> Check in
              </Button>
            </div>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (entries ? setEntries(null) : void loadEntries())}
        >
          {entries ? "Hide check-ins" : "View check-ins"}
        </Button>
        {(challenge.status === "active" ||
          (challenge.status === "pending" && !challenge.invited_me)) && (
          <Button size="sm" variant="ghost" onClick={() => setClosing(true)}>
            <Flag className="size-4" /> Close pact
          </Button>
        )}
      </div>
      {entries && (
        <div className="mt-4 pt-4">
          {entries.length ? (
            <ol className="grid gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm"
                >
                  <div>
                    <strong>{entry.mine ? "You" : entry.display_name}</strong> added {entry.amount}
                    {entry.note && <p className="mt-1 text-muted-foreground">{entry.note}</p>}
                  </div>
                  <div className="text-right">
                    <time className="text-xs text-muted-foreground" dateTime={entry.created_at}>
                      {formatDate(entry.created_at)}
                    </time>
                    {entry.mine && (
                      <button
                        className="mt-1 block text-xs underline"
                        onClick={() =>
                          void act(
                            () => challengeApi.deleteEntry(entry.id),
                            "Check-in removed",
                          ).then(loadEntries)
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No check-ins yet" body="The first honest step is still waiting." />
          )}
        </div>
      )}
      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title={challenge.status === "pending" ? "Withdraw this invitation?" : "Close this pact?"}
        body="Both people will keep the final check-in history, but no more progress can be added."
        confirmLabel={challenge.status === "pending" ? "Withdraw invitation" : "Close pact"}
        tone="danger"
        onConfirm={() => {
          setClosing(false);
          void act(() => challengeApi.close(challenge.id), "Pact closed");
        }}
      />
    </Panel>
  );
}

function ProgressRow({
  label,
  value,
  target,
  pct,
}: {
  label: string;
  value: number;
  target: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-sm">
          {value}/{target}
        </span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={target}
      >
        <div
          className={cn("h-full rounded-full bg-primary transition-[width]")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(iso.length === 10 ? `${iso}T12:00:00` : iso),
  );
