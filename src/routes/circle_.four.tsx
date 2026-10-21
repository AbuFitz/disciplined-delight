import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleDot, Gamepad2, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
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
  Select,
  Skeleton,
  TextArea,
} from "@/components/nl/ui";
import { useAccountProfile } from "@/data/account-profile";
import {
  fourApi,
  fourMessage,
  type FourDraft,
  type FourGame,
  type FourStatus,
  validateFourDare,
  validateFourDraft,
} from "@/data/circle-four";
import { circleApi, type CirclePerson } from "@/data/circle";
import { FOUR_COLUMNS, FOUR_ROWS, fourCell, fourColumnFull } from "@/domain/four";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/circle_/four")({ component: FourPage });

const statusLabel: Record<FourStatus, string> = {
  pending: "Invitation",
  active: "In play",
  won: "Four connected",
  draw: "Draw",
  declined: "Declined",
  closed: "Closed",
};

function FourPage() {
  const auth = useAuth();
  const profile = useAccountProfile();
  const ready = !!auth.user && profile.state.status === "ready" && isSupabaseConfigured;
  return (
    <>
      <PageHeader
        title="Four in a Row"
        sub="Invite a connection, each choose a dare, take turns. The server settles every move."
        actions={
          <Link
            to="/circle"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Circle
          </Link>
        }
      />
      {ready ? <FourLive /> : <FourGate />}
    </>
  );
}

function FourGate() {
  return (
    <Panel tone="dusk">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Gamepad2 className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold">No bots. No pretend opponents.</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Connect account services, sign in, finish your handle and accept a Circle connection. Games
        appear only when a real person joins you.
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

function FourLive() {
  const [games, setGames] = useState<FourGame[]>([]);
  const [connections, setConnections] = useState<CirclePerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(
    () => games.find((game) => game.id === selectedId) ?? null,
    [games, selectedId],
  );
  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextGames, nextConnections] = await Promise.all([
        fourApi.list(),
        circleApi.connections(),
      ]);
      setGames(nextGames);
      setConnections(nextConnections.filter((person) => person.relationship === "connected"));
      setSelectedId((current) =>
        current && nextGames.some((game) => game.id === current)
          ? current
          : (nextGames[0]?.id ?? null),
      );
      setError(null);
    } catch (cause) {
      setError(fourMessage(cause));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (loading)
    return (
      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-[34rem]" />
      </div>
    );

  return (
    <div className="grid gap-4">
      {error && (
        <Panel tone="warm" role="alert">
          <p className="font-semibold">Games could not refresh</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-3" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </Panel>
      )}

      {creating && (
        <CreateGame
          connections={connections}
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-[19rem_minmax(0,1fr)]">
        <Panel className="h-fit" aria-label="Four in a Row games">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="mt-1 font-display text-xl font-bold">Your games</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Refresh games"
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
            <Plus className="size-4" /> New game
          </Button>
          {!connections.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              Accept a Circle connection before sending an invitation.
            </p>
          )}
          {games.length ? (
            <ul className="mt-2 divide-y divide-line/70">
              {games.map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(game.id)}
                    className={cn(
                      "min-h-16 w-full py-3 text-left",
                      selectedId === game.id && "text-primary",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate">{game.other_display_name}</strong>
                      {game.my_turn && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {statusLabel[game.status]} · @{game.other_username}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No games yet"
                body="Invite one trusted connection. Empty really means empty."
              />
            </div>
          )}
        </Panel>

        {selected ? (
          <GameDetail game={selected} refresh={refresh} />
        ) : (
          <Panel tone="dusk" className="min-h-72">
            <EmptyState
              title="The board is waiting"
              body="Start a game when you have a real connection and a stake you chose for yourself."
            />
          </Panel>
        )}
      </div>

      <Panel tone="warm" aria-label="Fair-play rules">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="size-5" aria-hidden /> Stakes without coercion
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <li>You write only your own dare. Your opponent writes theirs.</li>
          <li>Keep it safe: no money, danger, body shame or punishment.</li>
          <li>Blocking ends access immediately; private fitness records are never consulted.</li>
        </ul>
      </Panel>
    </div>
  );
}

function CreateGame({
  connections,
  onCancel,
  onCreated,
}: {
  connections: CirclePerson[];
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<FourDraft>({
    userId: connections[0]?.user_id ?? "",
    dare: "",
  });
  const [busy, setBusy] = useState(false);
  const invalid = validateFourDraft(draft);
  const submit = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await fourApi.create(draft);
      toast.success("Game invitation sent");
      await onCreated();
    } catch (cause) {
      toast.error(fourMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel tone="green" aria-label="Create Four in a Row game">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 font-display text-2xl font-bold">Put your own stake on the board</h2>
        </div>
        <Button variant="ghost" size="sm" aria-label="Cancel new game" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        You decide what you will do if you lose. The invitee must write their own stake before the
        game begins.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <Field label="Connection">
          <Select
            value={draft.userId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, userId: event.target.value }))
            }
          >
            {connections.map((person) => (
              <option key={person.user_id} value={person.user_id}>
                {person.display_name} (@{person.username})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Your dare if you lose" hint={`${draft.dare.trim().length}/120`}>
          <TextArea
            className="min-h-24"
            maxLength={120}
            value={draft.dare}
            placeholder="Something safe and useful that you choose for yourself"
            onChange={(event) => setDraft((current) => ({ ...current, dare: event.target.value }))}
          />
        </Field>
      </div>
      {invalid && draft.dare.length > 0 && <p className="mt-3 text-sm text-warn">{invalid}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" busy={busy} disabled={!!invalid} onClick={() => void submit()}>
          Send invitation
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Panel>
  );
}

function GameDetail({
  game,
  refresh,
}: {
  game: FourGame;
  refresh: (quiet?: boolean) => Promise<void>;
}) {
  const [dare, setDare] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const canMove = game.status === "active" && game.my_turn && !busy;
  const mineWon = game.status === "won" && game.winner_id !== game.other_user_id;
  const theirsWon = game.status === "won" && game.winner_id === game.other_user_id;
  const myDare = game.mine_token === 1 ? game.creator_dare : game.invited_dare;
  const theirDare = game.mine_token === 1 ? game.invited_dare : game.creator_dare;
  const act = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      await refresh(true);
    } catch (cause) {
      toast.error(fourMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const turnLine =
    game.status === "pending"
      ? game.invited_me
        ? "Your invitation to answer"
        : `Waiting for ${game.other_display_name}`
      : game.status === "active"
        ? game.my_turn
          ? "Your turn"
          : `${game.other_display_name}'s turn`
        : mineWon
          ? "You connected four"
          : theirsWon
            ? `${game.other_display_name} connected four`
            : game.status === "draw"
              ? "No gaps. No winner."
              : statusLabel[game.status];

  return (
    <Panel tone={game.status === "active" ? "dusk" : "plain"} aria-label="Selected game">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              tone={
                game.status === "active" ? "ok" : game.status === "pending" ? "warn" : "neutral"
              }
            >
              {statusLabel[game.status]}
            </Chip>
            <span className="text-xs text-muted-foreground">with @{game.other_username}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">{turnLine}</h2>
        </div>
        {(game.status === "pending" || game.status === "active") && (
          <Button size="sm" variant="ghost" onClick={() => setClosing(true)}>
            Close game
          </Button>
        )}
      </div>

      {game.status === "pending" && game.invited_me ? (
        <div className="mt-6 pt-5">
          <p className="text-sm text-muted-foreground">
            {game.other_display_name} chose: <strong>{game.creator_dare}</strong>
          </p>
          <div className="mt-4 max-w-xl">
            <Field label="Your dare if you lose" hint={`${dare.trim().length}/120`}>
              <TextArea
                className="min-h-24"
                maxLength={120}
                value={dare}
                placeholder="Choose your own safe, useful stake"
                onChange={(event) => setDare(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              busy={busy}
              disabled={!!validateFourDare(dare)}
              onClick={() => void act(() => fourApi.respond(game.id, true, dare), "Game on")}
            >
              Accept and play
            </Button>
            <Button
              disabled={busy}
              onClick={() => void act(() => fourApi.respond(game.id, false), "Invitation declined")}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : game.status === "pending" ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Your stake: <strong>{game.creator_dare}</strong>. The board unlocks only if your
          connection accepts and writes their own.
        </p>
      ) : (
        <>
          <div className="mt-6 flex justify-center">
            <FourBoard
              game={game}
              canMove={canMove}
              onMove={(column) => void act(() => fourApi.move(game.id, column))}
            />
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground" aria-live="polite">
            {canMove ? "Choose a column. Your token falls to the lowest open space." : turnLine}
          </p>
          <div className="mt-6 grid gap-3 pt-2 sm:grid-cols-2">
            <Stake label="Your stake" value={myDare} mine />
            <Stake label={`${game.other_display_name}'s stake`} value={theirDare} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title={game.status === "pending" ? "Withdraw this invitation?" : "Close this game?"}
        body="The final board stays in both players' match books, but no more moves can be made."
        confirmLabel={game.status === "pending" ? "Withdraw invitation" : "Close game"}
        tone="danger"
        onConfirm={() => {
          setClosing(false);
          void act(() => fourApi.close(game.id), "Game closed");
        }}
      />
    </Panel>
  );
}

export function FourBoard({
  game,
  canMove,
  onMove,
}: {
  game: FourGame;
  canMove: boolean;
  onMove: (column: number) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-[1.4rem] border border-line bg-background/35 p-2">
      <div
        className="grid min-w-[19.25rem] max-w-md grid-cols-7 overflow-hidden rounded-2xl border border-line bg-surface-2"
        role="group"
        aria-label={`Four in a Row board. Your tokens are green; ${game.other_display_name}'s tokens are warm.`}
      >
        {Array.from({ length: FOUR_COLUMNS }, (_, column) => (
          <button
            key={column}
            type="button"
            disabled={!canMove || fourColumnFull(game.board, column)}
            aria-label={`Drop a token in column ${column + 1}`}
            onClick={() => onMove(column)}
            className="group grid min-w-11 grid-rows-6 border-l border-line first:border-l-0 enabled:cursor-pointer enabled:hover:bg-primary/10 disabled:cursor-default"
          >
            {Array.from({ length: FOUR_ROWS }, (_, row) => {
              const token = fourCell(game.board, row, column);
              const mine = token === game.mine_token;
              return (
                <span
                  key={row}
                  className="flex aspect-square items-center justify-center border-b border-line last:border-b-0"
                  aria-hidden
                >
                  <span
                    className={cn(
                      "size-[68%] rounded-full border transition-transform group-hover:scale-90 group-disabled:scale-100",
                      token === 0 && "border-line bg-background/70",
                      mine && "border-primary bg-primary",
                      token !== 0 && !mine && "border-warn bg-warn",
                    )}
                  />
                </span>
              );
            })}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stake({
  label,
  value,
  mine = false,
}: {
  label: string;
  value: string | null;
  mine?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <CircleDot className={cn("size-4", mine ? "text-primary" : "text-warn")} aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-sm">{value ?? "Not set"}</p>
    </div>
  );
}
