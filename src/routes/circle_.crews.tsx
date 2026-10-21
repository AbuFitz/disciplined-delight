import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  DoorOpen,
  Flag,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  Segmented,
  Select,
  Skeleton,
  TextArea,
  TextInput,
} from "@/components/nl/ui";
import { useAccountProfile } from "@/data/account-profile";
import {
  crewApi,
  crewMessage,
  type Crew,
  type CrewCheckin,
  type CrewCheckinDraft,
  type CrewCheckinState,
  type CrewDraft,
  type CrewMember,
  validateCrewCheckin,
  validateCrewDraft,
} from "@/data/circle-crews";
import { circleApi, type CirclePerson } from "@/data/circle";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/circle_/crews")({ component: CrewsPage });

const checkinCopy: Record<CrewCheckinState, { label: string; short: string }> = {
  showed_up: { label: "Showed up", short: "Done" },
  adjusted: { label: "Adjusted the plan", short: "Adjusted" },
  rested: { label: "Rested on purpose", short: "Rested" },
};

function CrewsPage() {
  const auth = useAuth();
  const profile = useAccountProfile();
  const ready = !!auth.user && profile.state.status === "ready" && isSupabaseConfigured;
  return (
    <>
      <PageHeader
        title="Crews"
        sub="Invitation-only, one purpose, one honest roll call a week."
        actions={
          <Link
            to="/circle"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Circle
          </Link>
        }
      />
      {ready ? <CrewsLive /> : <CrewsGate />}
    </>
  );
}

function CrewsGate() {
  return (
    <Panel tone="green">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Users className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold">Crews begin with people you chose</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Connect account services, sign in, finish your handle and accept at least one Circle
        connection. VAYVOR does not invent a team or expose your private records to fill this page.
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

function CrewsLive() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [connections, setConnections] = useState<CirclePerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(
    () => crews.find((crew) => crew.id === selectedId) ?? null,
    [crews, selectedId],
  );
  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextCrews, nextConnections] = await Promise.all([
        crewApi.list(),
        circleApi.connections(),
      ]);
      setCrews(nextCrews);
      setConnections(nextConnections.filter((person) => person.relationship === "connected"));
      setSelectedId((current) =>
        current && nextCrews.some((crew) => crew.id === current)
          ? current
          : (nextCrews[0]?.id ?? null),
      );
      setError(null);
    } catch (cause) {
      setError(crewMessage(cause));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 12_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (loading)
    return (
      <div className="grid gap-4 md:grid-cols-[19rem_minmax(0,1fr)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-[38rem]" />
      </div>
    );

  return (
    <div className="grid gap-4">
      {error && (
        <Panel tone="warm" role="alert">
          <p className="font-semibold">Crews could not refresh</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-3" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </Panel>
      )}

      {creating && (
        <CreateCrew
          connections={connections}
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-[19rem_minmax(0,1fr)]">
        <Panel className="h-fit" aria-label="Your crews">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="mt-1 font-display text-xl font-bold">Small by design</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11"
              aria-label="Refresh crews"
              onClick={() => void refresh()}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <Button
            className="mt-4 w-full"
            variant="primary"
            disabled={!connections.length || creating}
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" /> New crew
          </Button>
          {!connections.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              Accept a Circle connection before creating a crew.
            </p>
          )}
          {crews.length ? (
            <ul className="mt-2 divide-y divide-line/70">
              {crews.map((crew) => (
                <li key={crew.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(crew.id)}
                    className={cn(
                      "min-h-16 w-full py-3 text-left",
                      selectedId === crew.id && "text-primary",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate">{crew.name}</strong>
                      {crew.my_status === "pending" && <Chip tone="warn">Invite</Chip>}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {crew.active_count} active · led by @{crew.owner_username}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No crews yet"
                body="Make one around a promise people can actually understand."
              />
            </div>
          )}
        </Panel>

        {selected ? (
          <CrewDetail crew={selected} connections={connections} parentRefresh={refresh} />
        ) : (
          <Panel tone="green" className="min-h-72">
            <EmptyState
              title="Choose the promise first"
              body="A crew needs a specific purpose before it needs a name or a feed."
            />
          </Panel>
        )}
      </div>

      <Panel tone="warm" aria-label="Crew privacy and conduct">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="size-5" aria-hidden /> Accountability without surveillance
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <li>Roll calls are written by people, never inferred from private records.</li>
          <li>Rest and adjustment are first-class answers, not failed streaks.</li>
          <li>Crews stop at twelve; blocking and connection removal close shared visibility.</li>
        </ul>
      </Panel>
    </div>
  );
}

export function CreateCrew({
  connections,
  onCancel,
  onCreated,
}: {
  connections: CirclePerson[];
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<CrewDraft>({ name: "", purpose: "", inviteeIds: [] });
  const [busy, setBusy] = useState(false);
  const invalid = validateCrewDraft(draft);
  const toggle = (userId: string) =>
    setDraft((current) => ({
      ...current,
      inviteeIds: current.inviteeIds.includes(userId)
        ? current.inviteeIds.filter((id) => id !== userId)
        : [...current.inviteeIds, userId],
    }));
  const submit = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await crewApi.create(draft);
      toast.success("Crew invitations sent");
      await onCreated();
    } catch (cause) {
      toast.error(crewMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel tone="green" aria-label="Create a crew">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 font-display text-2xl font-bold">Name the promise, not the vibe</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11"
          aria-label="Cancel new crew"
          onClick={onCancel}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Crew name" hint={`${draft.name.trim().length}/40`}>
          <TextInput
            maxLength={40}
            value={draft.name}
            placeholder="Saturday Standard"
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label="Purpose" hint={`${draft.purpose.trim().length}/160`}>
          <TextArea
            className="min-h-24"
            maxLength={160}
            value={draft.purpose}
            placeholder="One clear sentence: what are you helping each other keep?"
            onChange={(event) =>
              setDraft((current) => ({ ...current, purpose: event.target.value }))
            }
          />
        </Field>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Invite connections</legend>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional now. Up to eleven invitees; everyone accepts for themselves.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((person) => {
            const checked = draft.inviteeIds.includes(person.user_id);
            const disabled = !checked && draft.inviteeIds.length >= 11;
            return (
              <label
                key={person.user_id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-2",
                  checked && "border-primary bg-primary/10",
                  disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(person.user_id)}
                  className="size-5 accent-[var(--primary)]"
                />
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{person.display_name}</strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{person.username}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {invalid && (draft.name.length > 0 || draft.purpose.length > 0) && (
        <p className="mt-3 text-sm text-warn">{invalid}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" busy={busy} disabled={!!invalid} onClick={() => void submit()}>
          Create and invite
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Panel>
  );
}

export function CrewDetail({
  crew,
  connections,
  parentRefresh,
}: {
  crew: Crew;
  connections: CirclePerson[];
  parentRefresh: (quiet?: boolean) => Promise<void>;
}) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckin[]>([]);
  const [loading, setLoading] = useState(crew.my_status === "active");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState<CrewMember | null>(null);
  const [inviteId, setInviteId] = useState("");
  const [draft, setDraft] = useState<CrewCheckinDraft>({ state: "showed_up", note: "" });
  const mine = checkins.find((checkin) => checkin.mine) ?? null;
  const available = connections.filter(
    (connection) => !members.some((member) => member.user_id === connection.user_id),
  );
  const loadDetail = useCallback(async () => {
    if (crew.my_status !== "active") {
      setMembers([]);
      setCheckins([]);
      setLoading(false);
      return;
    }
    try {
      const [nextMembers, nextCheckins] = await Promise.all([
        crewApi.members(crew.id),
        crewApi.checkins(crew.id),
      ]);
      setMembers(nextMembers);
      setCheckins(nextCheckins);
      const own = nextCheckins.find((checkin) => checkin.mine);
      if (own) setDraft({ state: own.state, note: own.note ?? "" });
    } catch (cause) {
      toast.error(crewMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [crew.id, crew.my_status]);

  useEffect(() => {
    setLoading(crew.my_status === "active");
    void loadDetail();
  }, [loadDetail, crew.my_status]);

  const act = async (action: () => Promise<unknown>, success: string, reload = true) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await parentRefresh(true);
      if (reload) await loadDetail();
    } catch (cause) {
      toast.error(crewMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (crew.my_status === "pending")
    return (
      <Panel tone="green" aria-label="Crew invitation">
        <Chip tone="warn">Invitation</Chip>
        <h2 className="mt-3 font-display text-3xl font-bold">{crew.name}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{crew.purpose}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          @{crew.owner_username} invited you. Joining shares only the roll calls you write here—not
          your workouts, food, weight, Mind entries or Salah.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="primary"
            busy={busy}
            onClick={() => void act(() => crewApi.respond(crew.id, true), "Crew joined", false)}
          >
            <Check className="size-4" /> Accept
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void act(() => crewApi.respond(crew.id, false), "Invitation declined", false)
            }
          >
            <X className="size-4" /> Decline
          </Button>
        </div>
      </Panel>
    );

  if (loading) return <Skeleton className="h-[38rem]" />;

  return (
    <Panel tone="dusk" aria-label="Selected crew">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="ok">{crew.active_count} active</Chip>
            {crew.my_role === "owner" && crew.pending_count > 0 && (
              <Chip tone="warn">{crew.pending_count} waiting</Chip>
            )}
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold">{crew.name}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{crew.purpose}</p>
        </div>
        <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setClosing(true)}>
          {crew.my_role === "owner" ? <Flag className="size-4" /> : <DoorOpen className="size-4" />}
          {crew.my_role === "owner" ? "Archive" : "Leave"}
        </Button>
      </div>

      <section className="mt-6" aria-labelledby={`roll-call-${crew.id}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id={`roll-call-${crew.id}`} className="mt-1 font-display text-2xl font-bold">
              Say what actually happened
            </h3>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {checkins.length} / {crew.active_count} answered
          </p>
        </div>
        <div className="mt-4 rounded-2xl bg-background/30 p-4">
          <Segmented
            label="Roll-call state"
            value={draft.state}
            onChange={(state) => setDraft((current) => ({ ...current, state }))}
            options={[
              { value: "showed_up", label: "Showed up" },
              { value: "adjusted", label: "Adjusted" },
              { value: "rested", label: "Rested" },
            ]}
          />
          <div className="mt-4">
            <Field label="A short note" hint={`${draft.note.trim().length}/180 · optional`}>
              <TextArea
                className="min-h-20"
                maxLength={180}
                value={draft.note}
                placeholder="One useful sentence for the room"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, note: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              busy={busy}
              disabled={!!validateCrewCheckin(draft)}
              onClick={() =>
                void act(
                  () => crewApi.checkin(crew.id, draft),
                  mine ? "Roll call updated" : "Roll call added",
                )
              }
            >
              {mine ? "Update my answer" : "Answer roll call"}
            </Button>
            {mine && (
              <Button
                disabled={busy}
                onClick={() => void act(() => crewApi.deleteCheckin(crew.id), "Roll call removed")}
              >
                Undo
              </Button>
            )}
          </div>
        </div>

        {checkins.length ? (
          <ol className="mt-4 divide-y divide-line/70">
            {checkins.map((checkin) => (
              <li
                key={checkin.id}
                className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr_auto] sm:items-start"
              >
                <div>
                  <strong>{checkin.mine ? "You" : checkin.display_name}</strong>
                  <p className="text-xs text-muted-foreground">@{checkin.username}</p>
                </div>
                <p className="text-sm text-muted-foreground">{checkin.note ?? "No note added."}</p>
                <Chip
                  tone={
                    checkin.state === "showed_up"
                      ? "ok"
                      : checkin.state === "adjusted"
                        ? "info"
                        : "neutral"
                  }
                >
                  {checkinCopy[checkin.state].short}
                </Chip>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="The room is quiet this week"
              body="No automatic activity appears here. The first answer has to come from a person."
            />
          </div>
        )}
      </section>

      <section className="mt-8 pt-2" aria-labelledby={`roster-${crew.id}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id={`roster-${crew.id}`} className="mt-1 font-display text-xl font-bold">
              Who is in the room
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">Maximum twelve</span>
        </div>
        {crew.my_role === "owner" && available.length > 0 && members.length < 12 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              aria-label="Connection to invite"
              value={inviteId}
              onChange={(event) => setInviteId(event.target.value)}
            >
              <option value="">Choose a connection</option>
              {available.map((person) => (
                <option key={person.user_id} value={person.user_id}>
                  {person.display_name} (@{person.username})
                </option>
              ))}
            </Select>
            <Button
              disabled={!inviteId || busy}
              onClick={() =>
                void act(() => crewApi.invite(crew.id, inviteId), "Invitation sent").then(() =>
                  setInviteId(""),
                )
              }
            >
              <Plus className="size-4" /> Invite
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-line/70">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="flex min-h-16 items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {member.mine ? "You" : member.display_name}
                  {member.role === "owner" ? " · owner" : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{member.username} · {member.status}
                </p>
              </div>
              {crew.my_role === "owner" && member.role !== "owner" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-11"
                  aria-label={`Remove ${member.display_name} from crew`}
                  onClick={() => setRemoving(member)}
                >
                  <UserMinus className="size-4" /> Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title={crew.my_role === "owner" ? "Archive this crew?" : "Leave this crew?"}
        body={
          crew.my_role === "owner"
            ? "The crew disappears from every member's active list and no more roll calls can be added."
            : "Your earlier roll calls stay in the crew record, but you lose access to the room."
        }
        confirmLabel={crew.my_role === "owner" ? "Archive crew" : "Leave crew"}
        tone="danger"
        onConfirm={() => {
          setClosing(false);
          void act(
            () => (crew.my_role === "owner" ? crewApi.archive(crew.id) : crewApi.leave(crew.id)),
            crew.my_role === "owner" ? "Crew archived" : "Crew left",
            false,
          );
        }}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={removing ? `Remove ${removing.display_name}?` : "Remove member?"}
        body="They will lose crew access immediately. Their earlier roll-call record stays honest."
        confirmLabel="Remove member"
        tone="danger"
        onConfirm={() => {
          const member = removing;
          setRemoving(null);
          if (member)
            void act(() => crewApi.removeMember(crew.id, member.user_id), "Member removed");
        }}
      />
    </Panel>
  );
}
