import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Heart,
  Gamepad2,
  Lock,
  MessageCircle,
  Search,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Eyebrow,
  Field,
  PageHeader,
  Panel,
  Segmented,
  Select,
  Skeleton,
  TextArea,
  TextInput,
} from "@/components/nl/ui";
import {
  circleApi,
  circleMessage,
  type CircleDraft,
  type CirclePerson,
  type CirclePost,
  type CirclePostKind,
  useCircle,
  validateCircleDraft,
} from "@/data/circle";
import { useAccountProfile } from "@/data/account-profile";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/circle")({ component: CirclePage });

function CirclePage() {
  const auth = useAuth();
  const acct = useAccountProfile();
  const ready = !!auth.user && acct.state.status === "ready" && isSupabaseConfigured;
  const handle = acct.state.status === "ready" ? acct.state.profile.username : null;
  return (
    <>
      <PageHeader
        eyebrow="Circle"
        title="Together"
        sub="Real people, deliberate sharing. Your private records stay private."
        actions={
          handle ? (
            <>
              <Chip tone="ok">@{handle}</Chip>
              <Link
                to="/circle/chat"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 text-sm font-semibold"
              >
                <MessageCircle className="size-4" /> Chat
              </Link>
              <Link
                to="/circle/crews"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 text-sm font-semibold"
              >
                <Users className="size-4" /> Crews
              </Link>
              <Link
                to="/circle/challenges"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 text-sm font-semibold"
              >
                <Trophy className="size-4" /> Pacts
              </Link>
              <Link
                to="/circle/four"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-4 text-sm font-semibold"
              >
                <Gamepad2 className="size-4" /> Four
              </Link>
            </>
          ) : undefined
        }
      />
      {!ready ? <CircleGate signedIn={!!auth.user} profileReady={!!handle} /> : <CircleLive />}
    </>
  );
}

function CircleGate({ signedIn, profileReady }: { signedIn: boolean; profileReady: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel tone="green" aria-label="Circle setup">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Users className="size-6" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold">
          {!isSupabaseConfigured
            ? "Connect account services"
            : !signedIn
              ? "Sign in to find your people"
              : !profileReady
                ? "Finish your public profile"
                : "Circle is unavailable"}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Circle never fills the screen with pretend activity. Once the VAYVOR account service is
          connected, this is where real connection requests, chosen milestones and kudos appear.
        </p>
        <Link
          to="/settings"
          className="mt-5 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
        >
          Open account settings
        </Link>
      </Panel>
      <PrivacyPanel />
    </div>
  );
}

type CircleTab = "feed" | "people";
function CircleLive() {
  const [tab, setTab] = useState<CircleTab>("feed");
  const circle = useCircle(true);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Circle section"
          value={tab}
          onChange={setTab}
          options={[
            { value: "feed", label: "Feed" },
            { value: "people", label: "People" },
          ]}
        />
        <p className="text-xs text-muted-foreground">Connections only · no public follower count</p>
      </div>
      {circle.error && (
        <Panel tone="warm" role="alert">
          <p className="font-semibold">Circle could not refresh</p>
          <p className="mt-1 text-sm text-muted-foreground">{circle.error}</p>
          <Button className="mt-3" size="sm" onClick={() => void circle.refresh()}>
            Try again
          </Button>
        </Panel>
      )}
      {circle.loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
        </div>
      ) : tab === "feed" ? (
        <Feed posts={circle.posts} refresh={circle.refresh} />
      ) : (
        <People connections={circle.connections} blocks={circle.blocks} refresh={circle.refresh} />
      )}
    </div>
  );
}

function ShareComposer({ refresh }: { refresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<CircleDraft>({ kind: "training", title: "" });
  const invalid = validateCircleDraft(draft);
  const share = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await circleApi.share(draft);
      setDraft({ kind: "training", title: "" });
      setOpen(false);
      await refresh();
      toast.success("Shared with your connections");
    } catch (error) {
      toast.error(circleMessage(error));
    } finally {
      setBusy(false);
    }
  };
  if (!open)
    return (
      <Panel tone="green" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>Share deliberately</Eyebrow>
          <p className="mt-1 font-display text-xl font-bold">Something worth remembering?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is posted automatically—not workouts, moods, prayers or meals.
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Share an update
        </Button>
      </Panel>
    );
  return (
    <Panel tone="green" aria-label="Share an update">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Eyebrow>New Circle update</Eyebrow>
          <h2 className="mt-1 font-display text-2xl font-bold">Share the part you choose</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Type">
          <Select
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as CirclePostKind }))}
          >
            <option value="training">Training</option>
            <option value="milestone">Milestone</option>
            <option value="routine">Routine</option>
            <option value="food">Food</option>
            <option value="reflection">Reflection</option>
          </Select>
        </Field>
        <Field
          label="Title"
          hint={`${draft.title.length}/80`}
          error={!draft.title.trim() ? undefined : (invalid ?? undefined)}
        >
          <TextInput
            maxLength={80}
            value={draft.title}
            placeholder="e.g. First full week back"
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
        </Field>
        <Field label="Highlight label" hint="Optional, such as Distance or Sessions">
          <TextInput
            maxLength={40}
            value={draft.metricLabel ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, metricLabel: e.target.value }))}
          />
        </Field>
        <Field label="Highlight value" hint="Optional, such as 5 km or 3/3">
          <TextInput
            maxLength={40}
            value={draft.metricValue ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, metricValue: e.target.value }))}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="A note" hint={`${(draft.body ?? "").length}/500`}>
            <TextArea
              maxLength={500}
              value={draft.body ?? ""}
              placeholder="What made it matter?"
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            />
          </Field>
        </div>
      </div>
      {invalid && draft.title.length > 0 && (
        <p className="mt-3 text-sm text-destructive">{invalid}</p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-4" aria-hidden /> Accepted connections only
        </p>
        <Button variant="primary" busy={busy} disabled={!!invalid} onClick={() => void share()}>
          Share now
        </Button>
      </div>
    </Panel>
  );
}

function Feed({ posts, refresh }: { posts: CirclePost[]; refresh: () => Promise<void> }) {
  const [removing, setRemoving] = useState<CirclePost | null>(null);
  const kudos = async (post: CirclePost) => {
    try {
      await circleApi.toggleKudos(post.id);
      await refresh();
    } catch (error) {
      toast.error(circleMessage(error));
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.65fr)]">
      <div className="grid content-start gap-4">
        <ShareComposer refresh={refresh} />
        {posts.length === 0 ? (
          <Panel>
            <EmptyState
              title="The feed starts with a real connection"
              body="Find someone by their VAYVOR handle, or share an update for the people you connect with later."
            />
          </Panel>
        ) : (
          posts.map((post) => (
            <Panel as="article" key={post.id} aria-label={`${post.display_name}: ${post.title}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar person={post} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{post.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{post.username} · {formatWhen(post.created_at)}
                    </p>
                  </div>
                </div>
                <Chip>{post.kind}</Chip>
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold">{post.title}</h2>
              {post.body && <p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>}
              {post.metric_value && (
                <div className="mt-5 rounded-2xl bg-surface-2 p-4">
                  <Eyebrow>{post.metric_label || "Highlight"}</Eyebrow>
                  <p className="stat-sm mt-1">{post.metric_value}</p>
                </div>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                {post.mine ? (
                  <span className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="size-4" /> {post.kudos_count} kudos
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={post.kudos_mine ? "primary" : "ghost"}
                    aria-pressed={post.kudos_mine}
                    onClick={() => void kudos(post)}
                  >
                    <Heart className={post.kudos_mine ? "size-4 fill-current" : "size-4"} />
                    {post.kudos_count || "Kudos"}
                  </Button>
                )}
                {post.mine && (
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(post)}>
                    Remove
                  </Button>
                )}
              </div>
            </Panel>
          ))
        )}
      </div>
      <PrivacyPanel />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this update?"
        body="It disappears from your connections' feeds. Your private source records are not changed."
        confirmLabel="Remove update"
        tone="danger"
        onConfirm={() => {
          if (!removing) return;
          void circleApi
            .deletePost(removing.id)
            .then(refresh)
            .then(() => toast.success("Update removed"))
            .catch((error) => toast.error(circleMessage(error)));
          setRemoving(null);
        }}
      />
    </div>
  );
}

function People({
  connections,
  blocks,
  refresh,
}: {
  connections: CirclePerson[];
  blocks: CirclePerson[];
  refresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CirclePerson[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [blocking, setBlocking] = useState<CirclePerson | null>(null);
  const act = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setResults([]);
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(circleMessage(error));
    }
  };
  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearched(true);
    try {
      setResults(await circleApi.find(query));
    } catch (error) {
      toast.error(circleMessage(error));
    } finally {
      setSearching(false);
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel tone="green" aria-label="Find people">
        <Eyebrow>Find people</Eyebrow>
        <h2 className="mt-1 font-display text-2xl font-bold">Handle, not phone book</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Search a VAYVOR handle or display name. Email addresses are never searchable.
        </p>
        <div className="mt-4 flex gap-2">
          <TextInput
            aria-label="Search people"
            value={query}
            placeholder="e.g. sam_lifts"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void search()}
          />
          <Button
            aria-label="Search"
            variant="primary"
            busy={searching}
            disabled={query.trim().length < 2}
            onClick={() => void search()}
          >
            <Search className="size-4" aria-hidden />
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="mt-4 border-t border-line">
            {results.map((person) => (
              <li
                key={person.user_id}
                className="flex min-h-16 items-center gap-3 border-b border-line py-2"
              >
                <Avatar person={person} />
                <Identity person={person} />
                <div className="ml-auto">
                  {person.relationship === "none" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void act(() => circleApi.sendRequest(person.user_id), "Request sent")
                      }
                    >
                      <UserPlus className="size-4" /> Connect
                    </Button>
                  ) : (
                    <Chip tone={person.relationship === "connected" ? "ok" : "neutral"}>
                      {relationshipLabel(person.relationship)}
                    </Chip>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {searched && !searching && results.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No matching people shown.</p>
        )}
      </Panel>
      <Panel aria-label="Connections">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Eyebrow>Your people</Eyebrow>
            <h2 className="mt-1 font-display text-2xl font-bold">Connections</h2>
          </div>
          <Chip>{connections.filter((x) => x.relationship === "connected").length}</Chip>
        </div>
        {connections.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No connections yet"
              body="Search for someone you know. Requests stay pending until the other person accepts."
            />
          </div>
        ) : (
          <ul className="mt-4 border-t border-line">
            {connections.map((person) => (
              <li key={person.user_id} className="border-b border-line py-3">
                <div className="flex items-center gap-3">
                  <Avatar person={person} />
                  <Identity person={person} />
                  <Chip tone={person.relationship === "connected" ? "ok" : "neutral"}>
                    {relationshipLabel(person.relationship)}
                  </Chip>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {person.relationship === "incoming" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          void act(() => circleApi.respond(person.user_id, true), "Connected")
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          void act(
                            () => circleApi.respond(person.user_id, false),
                            "Request declined",
                          )
                        }
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {person.relationship !== "incoming" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void act(
                          () => circleApi.remove(person.user_id),
                          person.relationship === "connected"
                            ? "Connection removed"
                            : "Request cancelled",
                        )
                      }
                    >
                      {person.relationship === "connected" ? "Remove" : "Cancel request"}
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => setBlocking(person)}>
                    Block
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {blocks.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <Eyebrow>Blocked</Eyebrow>
            <ul className="mt-2">
              {blocks.map((person) => (
                <li
                  key={person.user_id}
                  className="flex min-h-14 items-center gap-3 border-b border-line py-2"
                >
                  <Avatar person={person} />
                  <Identity person={person} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void act(() => circleApi.unblock(person.user_id), "Person unblocked")
                    }
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <ConfirmDialog
        open={!!blocking}
        onOpenChange={(open) => {
          if (!open) setBlocking(null);
        }}
        title={`Block ${blocking?.display_name ?? "this person"}?`}
        body="They will be removed from your connections. Neither of you will appear in the other's search or feed."
        confirmLabel="Block"
        tone="danger"
        onConfirm={() => {
          if (!blocking) return;
          void act(() => circleApi.block(blocking.user_id), "Person blocked");
          setBlocking(null);
        }}
      />
    </div>
  );
}

function PrivacyPanel() {
  return (
    <Panel tone="dusk" aria-label="Circle privacy">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <ShieldCheck className="size-5" aria-hidden />
        Private stays private
      </h2>
      <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
        <li>• Journal, mood, focus and prayer records never enter Circle.</li>
        <li>• Workouts and meals are not posted automatically.</li>
        <li>• Only accepted connections can see an update.</li>
        <li>• Block removes the connection in both directions.</li>
      </ul>
      <Link
        to="/privacy"
        className="mt-5 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
      >
        Read the full privacy map
      </Link>
    </Panel>
  );
}

function Avatar({ person }: { person: { display_name: string; username: string } }) {
  const initials = person.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground font-display text-sm font-bold text-background"
    >
      {initials || person.username.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Identity({ person }: { person: CirclePerson }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold">{person.display_name}</p>
      <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
    </div>
  );
}

const relationshipLabel = (relationship: CirclePerson["relationship"]) =>
  relationship === "connected"
    ? "Connected"
    : relationship === "incoming"
      ? "Wants to connect"
      : relationship === "outgoing"
        ? "Requested"
        : "Not connected";

const formatWhen = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
