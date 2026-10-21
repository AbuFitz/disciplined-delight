/**
 * Development-only design lab. Shows tokens, both modes, accent worlds, type, glyphs, controls and every
 * primitive state, then two realistic specimens. Not part of the production build (see routes/dev.design-lab.tsx).
 */
import { useMemo, useState } from "react";
import { Button, Segmented, Switch, TextInput } from "@/components/nl/ui";
import {
  ACCENT_WORLDS,
  getAccentWorld,
  getFoundation,
  getThemePref,
  setAccentWorld,
  setFoundation,
  setThemePref,
  type AccentWorld,
  type Foundation,
} from "@/lib/theme";
import { WORLDS } from "@/lib/colour-worlds";
import {
  ActionDock,
  Canvas,
  DataRow,
  Dayline,
  EmptyCanvas,
  FilterSheet,
  GLYPH_LABEL,
  GLYPH_NAMES,
  Glyph,
  MediaTile,
  MetricStrip,
  Section,
  Stage,
  type DaylineNode,
  type FilterGroup,
} from "./index";
import "./living.css";

const FOUNDATIONS: { id: Foundation; mode: "dark" | "light"; name: string }[] = [
  { id: "obsidian", mode: "dark", name: "Obsidian" },
  { id: "graphite", mode: "dark", name: "Graphite" },
  { id: "parchment", mode: "light", name: "Parchment" },
  { id: "fog", mode: "light", name: "Fog" },
];

const SAMPLE_IMG = "/catalogue/media/00b0a0bf-c14a-4f13-bb14-62c09030a1aa.jpg";

function Block({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid gap-3 border-t border-line pt-6" aria-labelledby={`${id}-h`}>
      <div>
        <h2 id={`${id}-h`} className="lv-title text-xl">
          {title}
        </h2>
        {note && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatches({
  foundation,
  mode,
  accent,
}: {
  foundation: Foundation;
  mode: "dark" | "light";
  accent: AccentWorld;
}) {
  const items = [
    ["Canvas", "var(--background)"],
    ["Surface", "var(--surface)"],
    ["Surface 2", "var(--surface-2)"],
    ["Accent", "var(--primary)"],
    ["OK", "var(--ok)"],
    ["Warn", "var(--warn)"],
    ["Danger", "var(--destructive)"],
  ];
  return (
    <div
      data-theme={mode}
      data-foundation={foundation}
      data-accent={accent}
      className="grid gap-2 rounded-[12px] bg-background p-3 text-foreground"
    >
      <p className="lv-kicker">
        {foundation} · {accent}
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {items.map(([n, v]) => (
          <div key={n} className="grid gap-1">
            <span
              className="h-9 rounded-[6px] ring-1 ring-[var(--line)]"
              style={{ background: v }}
            />
            <span className="text-[0.68rem] text-muted-foreground">{n}</span>
          </div>
        ))}
      </div>
      <p className="text-sm">
        Body text on canvas. <span className="text-muted-foreground">Muted text on canvas.</span>{" "}
        <span className="text-primary">Accent text.</span>
      </p>
    </div>
  );
}

const DAY: DaylineNode[] = [
  { id: "readiness", label: "Readiness", value: "Self-report", state: "done" },
  { id: "plan", label: "Plan", value: "Back & biceps", state: "done" },
  { id: "now", label: "Now", value: "Start session", state: "current" },
  { id: "recovery", label: "Recovery", value: "Evening", state: "next" },
];

const FILTERS: FilterGroup[] = [
  {
    id: "equipment",
    label: "Equipment",
    options: ["Bodyweight", "Dumbbell", "Barbell", "Cable", "Machine", "Band"].map((x) => ({
      value: x,
      label: x,
    })),
    selected: ["Dumbbell"],
  },
  {
    id: "muscle",
    label: "Muscle",
    options: ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"].map((x) => ({
      value: x,
      label: x,
    })),
    selected: [],
  },
];

/** Specimen A: the recommended direction. */
function LivingToday() {
  const [sel, setSel] = useState("now");
  const node = DAY.find((n) => n.id === sel)!;
  return (
    <Canvas kicker="Wednesday 21 October" title="Good morning, Sam">
      <Dayline nodes={DAY} selectedId={sel} onSelect={setSel} />
      <div role="tabpanel" aria-labelledby={`dl-${sel}`}>
        {sel === "now" ? (
          <Stage
            kicker="Now · about 45 min"
            title="Back & biceps"
            meta="5 exercises · last done 6 days ago"
            actions={
              <>
                <Button variant="primary">Start session</Button>
                <Button variant="ghost">Move it</Button>
              </>
            }
          >
            <MetricStrip
              metrics={[
                { label: "Readiness", value: "Good", delta: "self-report" },
                { label: "Last bench", value: "62.5", unit: "kg", delta: "+2.5 vs last" },
                { label: "Sleep", value: "", state: "unknown" },
              ]}
            />
          </Stage>
        ) : (
          <Stage
            tone="quiet"
            kicker={node.label}
            title={String(node.value)}
            meta="Tap Now to return to your next action."
          />
        )}
      </div>
      <Section title="Later today" action={<a className="underline underline-offset-4">All</a>}>
        <DataRow
          label="Log lunch"
          hint="Nothing logged yet today"
          to="/food"
          lead={<Glyph name="fuel" />}
        />
        <DataRow
          label="Evening check-in"
          value="20:30"
          onClick={() => undefined}
          lead={<Glyph name="mind" />}
        />
        <DataRow label="Wind down" hint="Optional" value="22:00" lead={<Glyph name="recover" />} />
      </Section>
    </Canvas>
  );
}

/** Specimen B: a quieter typographic comparator. */
function EditorialToday() {
  return (
    <div className="mx-auto grid max-w-[40rem] gap-6">
      <header className="grid gap-1">
        <p className="lv-kicker">Wed 21 Oct</p>
        <h1
          style={{ fontFamily: "'Fraunces Variable', serif", fontWeight: 500 }}
          className="text-[2rem] leading-tight"
        >
          Good morning, Sam.
        </h1>
      </header>
      <p style={{ fontFamily: "'Fraunces Variable', serif" }} className="text-lg leading-snug">
        Back &amp; biceps is next, about 45 minutes. You slept well enough; the plan stays as
        written.
      </p>
      <Button variant="primary" className="justify-self-start">
        Begin
      </Button>
      <dl className="grid gap-0 text-sm">
        {[
          ["Later", "Log lunch"],
          ["20:30", "Evening check-in"],
          ["22:00", "Wind down"],
        ].map(([a, b]) => (
          <div key={a} className="grid grid-cols-[5rem_1fr] gap-3 border-t border-line py-3">
            <dt className="lv-mono text-muted-foreground">{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DesignLab() {
  const [mode, setMode] = useState<"dark" | "light">(() =>
    getThemePref() === "light" ? "light" : "dark",
  );
  const [foundation, setF] = useState<Foundation | null>(getFoundation());
  const [accent, setA] = useState<AccentWorld>(getAccentWorld());
  const [zoom, setZoom] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState(FILTERS);
  const [sw, setSw] = useState(true);
  const [sel, setSel] = useState("now");
  const [seg, setSeg] = useState("a");
  const count = useMemo(
    () => 2598 - filters.reduce((n, g) => n + g.selected.length * 400, 0),
    [filters],
  );

  const applyMode = (m: "dark" | "light") => {
    setThemePref(m);
    setMode(m);
    setFoundation(foundation);
  };
  return (
    <div
      className="mx-auto grid max-w-5xl gap-8 px-4 py-6"
      style={zoom ? { fontSize: "200%" } : undefined}
    >
      <header className="grid gap-3">
        <p className="lv-kicker">Development only · /dev/design-lab</p>
        <h1 className="lv-title text-3xl">Living Instrument design lab</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Tokens, glyphs, controls and every primitive state, then two specimens. This route does
          not exist in a production build.
        </p>
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Lab controls">
          <Segmented
            label="Mode"
            value={mode}
            onChange={(v) => applyMode(v as "dark" | "light")}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
          <Segmented
            label="Foundation"
            value={foundation ?? (mode === "dark" ? "obsidian" : "parchment")}
            onChange={(v) => {
              setF(v as Foundation);
              setFoundation(v as Foundation);
            }}
            options={FOUNDATIONS.filter((f) => f.mode === mode).map((f) => ({
              value: f.id,
              label: f.name,
            }))}
          />
          <Switch checked={zoom} onChange={setZoom} label="200% text" />
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent world">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              role="radio"
              aria-checked={accent === w.id}
              onClick={() => {
                setA(w.id);
                setAccentWorld(w.id);
              }}
              className="lv-fopt inline-flex items-center gap-2"
              aria-pressed={undefined}
              style={
                accent === w.id ? { boxShadow: "inset 0 0 0 1.5px var(--primary)" } : undefined
              }
            >
              <span
                className="size-3 rounded-full"
                style={{ background: w.swatch[mode === "dark" ? 0 : 1] }}
              />
              {w.name}
            </button>
          ))}
        </div>
      </header>

      <Block
        id="tokens"
        title="Foundations and accent worlds"
        note="Neutral foundations first; the accent is a signal. Semantic OK/warn/danger never change with the world. Contrast for every world and foundation is asserted in src/lib/colour-contrast.test.ts."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FOUNDATIONS.map((f) => (
            <Swatches key={f.id} foundation={f.id} mode={f.mode} accent={accent} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["dark", "light"] as const).map((m) => (
            <div
              key={m}
              data-theme={m}
              className="grid grid-cols-7 gap-2 rounded-[12px] bg-background p-3"
            >
              {ACCENT_WORLDS.map((w) => (
                <span key={w} data-accent={w} className="grid gap-1 text-center">
                  <span className="h-8 rounded-[6px] bg-primary" />
                  <span className="text-[0.62rem] text-muted-foreground">{w}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </Block>

      <Block
        id="type"
        title="Type"
        note="Hanken Grotesk for UI, Funnel Display selectively (sentence case), Fraunces only for rare reflective moments, DM Mono for telemetry."
      >
        <div className="grid gap-3">
          <p className="lv-title text-3xl">Back &amp; biceps, then rest.</p>
          <p className="text-base">
            Hanken Grotesk body: the plan adapts to how you slept, not to a streak. Long names such
            as Dumbbell Romanian Deadlift (single leg) wrap rather than clip.
          </p>
          <p style={{ fontFamily: "'Fraunces Variable', serif" }} className="text-xl">
            Seven days in a row is a pattern, not a debt.
          </p>
          <p className="lv-mono text-sm">62.5 kg × 8 · 00:90 rest · HR 142 bpm</p>
          <p className="lv-kicker">Kicker in DM Mono, sparingly</p>
        </div>
      </Block>

      <Block
        id="glyphs"
        title="Glyph family"
        note="Authored 24px glyphs. Always paired with a visible label when unfamiliar."
      >
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {GLYPH_NAMES.map((g) => (
            <li key={g} className="grid justify-items-center gap-1 text-center">
              <Glyph name={g} size={28} />
              <span className="text-xs text-muted-foreground">{GLYPH_LABEL[g]}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block
        id="controls"
        title="Controls"
        note="44px targets, 6px radius, visible focus (Tab through these)."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" busy>
            Saving
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="grid max-w-md gap-3">
          <TextInput aria-label="Text input" placeholder="Text input" />
          <Switch checked={sw} onChange={setSw} label="Switch" hint="With a hint line" />
          <Segmented
            label="Segmented"
            value={seg}
            onChange={setSeg}
            options={[
              { value: "a", label: "Week" },
              { value: "b", label: "Month" },
              { value: "c", label: "All" },
            ]}
          />
        </div>
      </Block>

      <Block
        id="dayline"
        title="Dayline"
        note="Horizontal when there is room, vertical when narrow or zoomed. Arrow keys move; it is a tab list."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Dayline nodes={DAY} selectedId={sel} onSelect={setSel} />
          <div style={{ maxWidth: "16rem" }}>
            <Dayline
              nodes={[
                { id: "readiness", label: "Readiness", value: "Not recorded", state: "unknown" },
                { id: "plan", label: "Plan", value: "Skipped: travelling", state: "skipped" },
                { id: "now", label: "Now", value: "Hotel version", state: "current" },
                { id: "recovery", label: "Recovery", value: "Tonight", state: "next" },
              ]}
              selectedId="now"
              onSelect={() => undefined}
              label="Narrow Dayline"
            />
          </div>
        </div>
      </Block>

      <Block id="stage" title="Stage and MetricStrip">
        <div className="grid gap-4 md:grid-cols-2">
          <Stage
            kicker="Now"
            title="Back & biceps"
            meta="5 exercises"
            actions={<Button variant="primary">Start</Button>}
          >
            <MetricStrip
              metrics={[
                { label: "Sets", value: "0/15" },
                { label: "Rest", value: "90", unit: "s" },
                { label: "Load", value: "", state: "unknown" },
              ]}
            />
          </Stage>
          <Stage
            tone="quiet"
            kicker="Rest"
            title="A really very long stage title that has to wrap without clipping at any width"
            meta="Quiet tone: present, not the call to action"
          />
        </div>
      </Block>

      <Block
        id="rows"
        title="DataRow and Section"
        note="Hairlines and rhythm, no boxes. Long copy wraps."
      >
        <Section title="Today">
          <DataRow label="Plain read-only row" hint="With a hint" value="12" />
          <DataRow label="Link row" to="/library" lead={<Glyph name="train" />} />
          <DataRow
            label="Button row with a deliberately long label that must wrap at 320 pixels and at 200 percent text"
            hint="Hint text also wraps correctly when it is long, because nothing here truncates silently."
            value="08:30"
            onClick={() => undefined}
          />
        </Section>
      </Block>

      <Block
        id="media"
        title="MediaTile states"
        note="Media first. Missing or broken media falls back to a glyph and a text cue, never a broken image."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MediaTile
            name="With image"
            meta="Chest · dumbbell"
            src={SAMPLE_IMG}
            badge="Illustration"
          />
          <MediaTile name="Loading" meta="…" loading />
          <MediaTile
            name="No demonstration yet"
            meta="Back · cable"
            glyph="train"
            cue="Back · cable"
          />
          <MediaTile
            name="Broken source falls back"
            meta="Legs · barbell"
            src="/does-not-exist.jpg"
            glyph="train"
            cue="Legs · barbell"
          />
        </div>
      </Block>

      <Block id="empty" title="EmptyCanvas and ActionDock">
        <div className="grid gap-2 sm:grid-cols-2">
          <EmptyCanvas
            title="Nothing planned yet"
            body="Build a week in a minute, or add a single workout."
            action={<Button variant="primary">Build a plan</Button>}
          />
          <EmptyCanvas
            kind="error"
            glyph="adaptation"
            title="Couldn't save"
            body="Your change is kept on this device. Try again."
            action={<Button>Retry</Button>}
          />
          <EmptyCanvas
            kind="offline"
            title="You're offline"
            body="Everything you log is saved here and syncs later."
          />
          <EmptyCanvas
            kind="denied"
            glyph="meaning"
            title="Location is off"
            body="Gym Mode suggestions stay on your schedule instead."
          />
          <EmptyCanvas kind="loading" title="Loading the library" />
        </div>
        <div className="overflow-hidden rounded-[12px] bg-surface">
          <div className="p-4 text-sm text-muted-foreground">Scrolling content above the dock…</div>
          <ActionDock
            primary={
              <Button variant="primary" className="w-full">
                Finish workout
              </Button>
            }
            secondary={<Button variant="ghost">Pause</Button>}
            label="Session actions"
          />
        </div>
      </Block>

      <Block id="filters" title="FilterSheet">
        <div>
          <Button onClick={() => setSheet(true)}>
            Open filters ({filters.reduce((n, g) => n + g.selected.length, 0)})
          </Button>
        </div>
        <FilterSheet
          open={sheet}
          onOpenChange={setSheet}
          groups={filters}
          resultCount={count}
          onClear={() => setFilters(filters.map((g) => ({ ...g, selected: [] })))}
          onToggle={(gid, v) =>
            setFilters(
              filters.map((g) =>
                g.id === gid
                  ? {
                      ...g,
                      selected: g.selected.includes(v)
                        ? g.selected.filter((x) => x !== v)
                        : [...g.selected, v],
                    }
                  : g,
              ),
            )
          }
        />
      </Block>

      <Block
        id="specimens"
        title="Two specimens, one decision"
        note="A is the recommended Living Instrument. B is a quieter editorial utility comparator. Decision: A. It gives one obvious next action (Stage), makes the day legible at a glance (Dayline) and keeps structure in rules and rhythm rather than boxes, while B reads well but offers no persistent orientation and no object to act on, so it fails 'one obvious next action' for a returning user. B's typographic warmth is kept for rare reflective moments."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[12px] bg-background p-4 ring-1 ring-[var(--line)]">
            <p className="lv-kicker mb-3">A · Living Instrument (chosen)</p>
            <LivingToday />
          </div>
          <div className="rounded-[12px] bg-background p-4 ring-1 ring-[var(--line)]">
            <p className="lv-kicker mb-3">B · Editorial Utility (comparator)</p>
            <EditorialToday />
          </div>
        </div>
      </Block>
    </div>
  );
}
