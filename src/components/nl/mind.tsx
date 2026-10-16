import { Pause, Play, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Field,
  Panel,
  Skeleton,
  TextArea,
} from "@/components/nl/ui";
import { getMeta, setMeta } from "@/data/db";
import { useCollection, useNow } from "@/data/hooks";
import { deleteMindEntry, saveMindEntry } from "@/data/routine-actions";
import { COL, type MindEntry, type MindKind } from "@/data/types";
import type { ISODate } from "@/domain/dates";
import { cn } from "@/lib/utils";

export const PrivacyNote = ({ what }: { what: string }) => (
  <p className="text-xs text-muted-foreground" role="note">
    {what} is private to you. It is stored with your account only, and nothing in Circle or anywhere
    else can read it.
  </p>
);

const LEVELS = ["Very low", "Low", "Okay", "Good", "Great"];
const TAGS = [
  "calm",
  "anxious",
  "tired",
  "focused",
  "grateful",
  "stressed",
  "motivated",
  "low",
  "social",
  "lonely",
];

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (n: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-[repeat(auto-fit,minmax(4.25rem,1fr))] gap-1.5"
    >
      {LEVELS.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
        return (
          <button
            key={l}
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${l}`}
            onClick={() => onChange(n)}
            className={cn(
              "grid min-h-14 place-items-center rounded-2xl border px-1 text-center transition",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-line hover:border-foreground/40",
            )}
          >
            <span className="font-display text-xl font-bold">{n}</span>
            <span className="text-[0.68rem] leading-tight">{l}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CheckInPanel({ date }: { date: ISODate }) {
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>();
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>();
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Panel aria-label="Check-in">
      <h2 className="font-display text-2xl font-bold">How are you?</h2>
      <div className="mt-4 grid gap-4">
        <div>
          <p className="eyebrow mb-2">Mood</p>
          <Scale label="Mood" value={mood} onChange={setMood} />
        </div>
        <div>
          <p className="eyebrow mb-2">Energy</p>
          <Scale label="Energy" value={energy} onChange={setEnergy} />
        </div>
        <div>
          <p className="eyebrow mb-2">What fits? (optional)</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                role="checkbox"
                aria-checked={tags.includes(t)}
                onClick={() =>
                  setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))
                }
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-medium",
                  tags.includes(t) ? "border-primary bg-primary/10 text-primary" : "border-line",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Field label="A note (optional)">
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            disabled={!mood && !energy}
            busy={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveMindEntry({
                  date,
                  kind: "checkin",
                  space: "mind",
                  mood,
                  energy,
                  tags,
                  text: text.trim() || undefined,
                });
                toast.success("Check-in saved");
                setMood(undefined);
                setEnergy(undefined);
                setTags([]);
                setText("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save check-in
          </Button>
          <PrivacyNote what="Your check-in" />
        </div>
      </div>
    </Panel>
  );
}

const MIND_PROMPTS = [
  "What is taking most of my attention, and does it deserve it?",
  "What went better than I expected today?",
  "What am I avoiding, and what is the smallest first step?",
  "Who or what helped me today?",
  "What do I want tomorrow to feel like?",
  "What did I learn about myself this week?",
];
const SOUL_PROMPTS = [
  "What am I grateful for tonight?",
  "What intention do I want to carry into tomorrow?",
  "Where did I feel most at peace today?",
  "What do I want to ask for, or ask forgiveness for?",
  "Who should I check in on or pray for?",
  "What small act of kindness can I do tomorrow?",
];

/** One prompt a day, chosen by the date so it doesn't change on reload. */
const promptFor = (space: "mind" | "soul", date: ISODate) => {
  const list = space === "mind" ? MIND_PROMPTS : SOUL_PROMPTS;
  const n = date.split("-").reduce((a, p) => a + Number(p), 0);
  return list[n % list.length]!;
};

export function ReflectPanel({ date, space }: { date: ISODate; space: "mind" | "soul" }) {
  const prompt = promptFor(space, date);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Panel aria-label="Reflection">
      <p className="eyebrow">Today's prompt</p>
      <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{prompt}</h2>
      <div className="mt-4 grid gap-3">
        <Field label="Your reflection">
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={8000}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            disabled={text.trim().length < 2}
            busy={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveMindEntry({ date, kind: "reflection", space, prompt, text: text.trim() });
                toast.success("Saved");
                setText("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save reflection
          </Button>
          <PrivacyNote what="Your reflection" />
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ Focus ------------------------------ */
type Active = {
  endsAt: number | null;
  remainingMs?: number;
  minutes: number;
  startedAt: number;
  label: string;
};
const KEY = "focus:active";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Counts down against the wall clock (so a throttled background tab or a reload can't drift) and survives a reload. */
export function FocusPanel({ date }: { date: ISODate }) {
  const now = useNow(1000);
  const [active, setActive] = useState<Active | null | undefined>(undefined);
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState("");
  useEffect(() => {
    void getMeta<Active | null>(KEY).then((a) => setActive(a ?? null));
  }, []);
  const save = (a: Active | null) => {
    setActive(a);
    void setMeta(KEY, a);
  };
  const remaining = active
    ? active.endsAt != null
      ? active.endsAt - now
      : (active.remainingMs ?? 0)
    : 0;
  const finish = async (a: Active, endedEarly: boolean) => {
    const spent =
      a.endsAt != null
        ? Math.min(a.minutes * 60_000, Math.max(0, Date.now() - a.startedAt))
        : a.minutes * 60_000 - (a.remainingMs ?? 0);
    const mins = Math.max(1, Math.round(spent / 60_000));
    await saveMindEntry({
      date,
      kind: "focus",
      space: "mind",
      minutes: mins,
      text: a.label || undefined,
    });
    save(null);
    toast.success(
      endedEarly ? `Stopped after ${mins} min. Logged.` : `Done. ${mins} focused minutes logged.`,
    );
  };
  useEffect(() => {
    if (active && active.endsAt != null && remaining <= 0) void finish(active, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, active]);

  if (active === undefined) return <Skeleton className="h-48" />;
  return (
    <Panel aria-label="Focus timer">
      {active ? (
        <div>
          <p className="eyebrow">{active.label || "Focus"}</p>
          <p
            className="stat mt-2 tnum"
            role="timer"
            aria-live="off"
            aria-label={`${mmss(remaining)} remaining`}
          >
            {mmss(remaining)}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {active.endsAt != null ? (
              <Button
                size="lg"
                onClick={() =>
                  save({
                    ...active,
                    endsAt: null,
                    remainingMs: Math.max(0, active.endsAt! - Date.now()),
                  })
                }
              >
                <Pause className="size-4" />
                Pause
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  save({
                    ...active,
                    endsAt: Date.now() + (active.remainingMs ?? 0),
                    remainingMs: undefined,
                  })
                }
              >
                <Play className="size-4" />
                Resume
              </Button>
            )}
            <Button size="lg" onClick={() => void finish(active, true)}>
              <Square className="size-4" />
              Stop and log
            </Button>
            <Button variant="ghost" size="lg" onClick={() => save(null)}>
              Discard
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <h2 className="font-display text-2xl font-bold">Focus</h2>
          <div role="radiogroup" aria-label="Minutes" className="flex flex-wrap gap-2">
            {[15, 25, 45, 60].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={minutes === n}
                onClick={() => setMinutes(n)}
                className={cn(
                  "min-h-12 rounded-full border px-5 font-semibold",
                  minutes === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line",
                )}
              >
                {n} min
              </button>
            ))}
          </div>
          <Field label="On what? (optional)">
            <input
              className="min-h-11 w-full rounded-2xl border border-input bg-surface-2/50 px-4"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
            />
          </Field>
          <div>
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                save({
                  endsAt: Date.now() + minutes * 60_000,
                  minutes,
                  startedAt: Date.now(),
                  label: label.trim(),
                })
              }
            >
              <Play className="size-4 fill-current" />
              Start {minutes} minutes
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------ History ------------------------------ */
const KIND_LABEL: Record<MindKind, string> = {
  checkin: "Check-in",
  reflection: "Reflection",
  focus: "Focus",
};

export function MindHistory({ space, kinds }: { space: "mind" | "soul"; kinds?: MindKind[] }) {
  const all = useCollection<MindEntry>(COL.mind);
  const [kind, setKind] = useState<MindKind | "all">("all");
  const [del, setDel] = useState<MindEntry | null>(null);
  const rows = useMemo(
    () =>
      all.items
        .filter(
          (e) =>
            e.space === space &&
            (!kinds || kinds.includes(e.kind)) &&
            (kind === "all" || e.kind === kind),
        )
        .sort((a, b) => b.at - a.at)
        .slice(0, 60),
    [all.items, space, kinds, kind],
  );
  const avail = (kinds ?? (["checkin", "reflection", "focus"] as MindKind[])).filter((k) =>
    all.items.some((e) => e.space === space && e.kind === k),
  );
  return (
    <section aria-label="History" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">History</h2>
        {avail.length > 1 && (
          <div role="radiogroup" aria-label="Filter" className="flex flex-wrap gap-1.5">
            {(["all", ...avail] as const).map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "min-h-10 rounded-full border px-3 text-sm",
                  kind === k ? "border-primary bg-primary/10 text-primary" : "border-line",
                )}
              >
                {k === "all" ? "All" : KIND_LABEL[k]}
              </button>
            ))}
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing yet" body="What you save here appears only for you." />
      ) : (
        <ul className="grid gap-2">
          {rows.map((e) => (
            <li key={e.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="eyebrow">
                  {e.date} · {KIND_LABEL[e.kind]}
                </p>
                <button
                  aria-label={`Delete ${KIND_LABEL[e.kind]} from ${e.date}`}
                  className="-mr-2 -mt-2 grid size-11 place-items-center rounded-full hover:bg-surface-2"
                  onClick={() => setDel(e)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {e.kind === "checkin" && (
                <p className="mt-1 tnum">
                  Mood {e.mood ?? "–"} · Energy {e.energy ?? "–"}
                  {e.tags?.length ? (
                    <span className="text-muted-foreground"> · {e.tags.join(", ")}</span>
                  ) : null}
                </p>
              )}
              {e.kind === "focus" && (
                <p className="mt-1 tnum">
                  {e.minutes} min{e.text ? `: ${e.text}` : ""}
                </p>
              )}
              {e.kind === "reflection" && e.prompt && (
                <p className="mt-1 text-sm text-muted-foreground">{e.prompt}</p>
              )}
              {e.text && e.kind !== "focus" && (
                <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{e.text}</p>
              )}
              <div className="mt-2">
                <Chip>Private</Chip>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this entry?"
        body="It is removed from this device and your account."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (del) await deleteMindEntry(del.id);
          setDel(null);
        }}
      />
    </section>
  );
}
