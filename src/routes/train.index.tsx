import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Group,
  PageHeader,
  Panel,
  Section,
  Skeleton,
  Tile,
} from "@/components/nl/ui";
import { startSession } from "@/data/actions";
import { restoreTemplate } from "@/data/plan-actions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useCollection, useToday } from "@/data/hooks";
import { activeTemplates, weekTraining } from "@/data/selectors";
import { sessionSummary } from "@/data/session-logic";
import {
  COL,
  type LegacyDayLog,
  type PlanRecord,
  type Session,
  type WorkoutTemplate,
} from "@/data/types";
import { WEEKDAY_SHORT, formatDateLong, to12h } from "@/domain/dates";
import { ExerciseVisual } from "@/components/nl/exercise-visual";
import { useCatalogue } from "@/data/catalogue-runtime";
import { resolveCatalogueExercise } from "@/lib/legacy-catalogue";
import { useActiveSession } from "@/data/session-hooks";
import { TemplateEditor } from "@/components/nl/programme";
import { blankTemplate } from "@/data/editor-defaults";
import { cn } from "@/lib/utils";
import { WorkoutLibrary, type WorkoutLibraryTab } from "@/components/nl/workout-library";
import { VIcon } from "@/components/nl/icon";

export const Route = createFileRoute("/train/")({ component: TrainPage });

function TrainPage() {
  const nav = useNavigate();
  const today = useToday();
  const t = useCollection<WorkoutTemplate>(COL.templates);
  const s = useCollection<Session>(COL.sessions);
  const legacy = useCollection<LegacyDayLog>(COL.legacyDays);
  const active = useActiveSession();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  const plans = useCollection<PlanRecord>(COL.plans);
  const cat = useCatalogue();
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [discoverTab, setDiscoverTab] = useState<WorkoutLibraryTab>("workouts");
  const templates = activeTemplates(t.items);
  const archived = t.items.filter((x) => x.archivedAt);
  const livePlans = plans.items.filter(
    (p) => p.status === "active" && p.templateIds.some((id) => templates.some((x) => x.id === id)),
  );
  const week = weekTraining(t.items, s.items, today);
  const history = s.items
    .filter((x) => x.status === "completed" || x.status === "ended-early")
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 12);
  const todayIdx = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7;

  if (!t.ready) return <Skeleton className="h-72 rounded-3xl" />;
  const goDiscover = (tab: WorkoutLibraryTab) => {
    setDiscoverTab(tab);
    requestAnimationFrame(() => {
      const el = document.getElementById("discover-workouts");
      el?.scrollIntoView({ block: "start" });
      el?.focus({ preventScroll: true });
    });
  };
  const todayTpl = templates.find((x) => x.weekday === todayIdx);
  const quick = [
    {
      key: "build",
      icon: "adaptation" as const,
      label: "Build a plan",
      hint: "From your kit",
      onClick: () => nav({ to: "/train/build" }),
    },
    {
      key: "new",
      icon: "add" as const,
      label: "New workout",
      hint: "Start blank",
      onClick: () => setEditing(blankTemplate(t.items.length)),
    },
    {
      key: "discover",
      icon: "training" as const,
      label: "Discover",
      hint: "Workouts",
      onClick: () => goDiscover("workouts"),
    },
    {
      key: "programmes",
      icon: "calendar" as const,
      label: "Programmes",
      hint: "Multi-week",
      onClick: () => goDiscover("programmes"),
    },
  ];
  return (
    <>
      <PageHeader
        title="Train"
        sub={`${week.completed} of ${week.planned} sessions done this week${week.partial ? `, ${week.partial} partial` : ""}.`}
        actions={
          <Link
            to="/library"
            aria-label="Exercise library"
            title="Exercise library"
            className="inline-flex size-11 items-center justify-center rounded-full bg-surface/80 transition active:scale-95"
          >
            <VIcon name="library" size={20} />
          </Link>
        }
      />

      {active ? (
        <button
          type="button"
          onClick={() => nav({ to: "/train/session" })}
          className="mb-4 flex min-h-20 w-full items-center gap-4 rounded-3xl bg-primary px-5 py-4 text-left text-primary-foreground transition active:scale-[0.98]"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <VIcon name="play" size={24} active />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold leading-tight">Continue session</span>
            <span className="block truncate text-sm opacity-80">
              Workout {active.templateLetter}, {active.templateName}
            </span>
          </span>
          <span aria-hidden>→</span>
        </button>
      ) : todayTpl ? (
        <Panel className="mb-4 !p-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-2xl font-bold text-primary">
              {todayTpl.letter}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Today</p>
              <p className="truncate text-lg font-semibold leading-tight">{todayTpl.title}</p>
              <p className="truncate text-sm text-muted-foreground">
                {todayTpl.exercises.length} exercises
                {todayTpl.time ? ` · ${to12h(todayTpl.time)}` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="mt-4 w-full md:w-auto md:min-w-64"
            onClick={async () => {
              await startSession(todayTpl, today);
              nav({ to: "/train/session" });
            }}
          >
            <VIcon name="training" size={18} />
            Start workout
          </Button>
        </Panel>
      ) : null}

      <div
        className="mb-4 grid grid-cols-7 gap-1.5 rounded-3xl bg-surface/80 p-2.5 md:gap-2 md:p-3"
        role="list"
        aria-label="Weekly split"
      >
        {WEEKDAY_SHORT.map((d, i) => {
          const tpl = templates.find((x) => x.weekday === i);
          return (
            <div
              key={d}
              role="listitem"
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-2 text-center",
                i === todayIdx && "bg-primary/12",
              )}
            >
              <p className="text-[0.68rem] font-medium text-muted-foreground">{d}</p>
              <p
                className={cn(
                  "flex size-8 items-center justify-center rounded-full font-display text-base font-bold md:size-9",
                  tpl
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/8 text-muted-foreground",
                )}
              >
                {tpl ? tpl.letter : "–"}
              </p>
              <p className="sr-only">{tpl ? `Workout ${tpl.letter}` : "Rest day"}</p>
            </div>
          );
        })}
      </div>

      <nav aria-label="Training areas" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map((q) => (
          <button key={q.key} type="button" onClick={q.onClick} className="min-w-0 text-left">
            <Tile icon={<VIcon name={q.icon} size={20} />} label={q.label} hint={q.hint} />
          </button>
        ))}
      </nav>

      <Section title="Your workouts" className="scroll-mt-24">
        <div id="personal-training" className="grid gap-3 lg:grid-cols-2">
          {templates.length === 0 && (
            <div className="lg:col-span-2">
              <EmptyState
                title="No workouts yet"
                body="Build a plan, or start with a blank workout."
                action={
                  <Button variant="primary" onClick={() => nav({ to: "/train/build" })}>
                    Build me a plan
                  </Button>
                }
              />
            </div>
          )}
          {templates.map((tpl) => {
            const isOpen = open === tpl.id;
            return (
              <Panel key={tpl.id} className="overflow-hidden !p-0">
                <div className="flex gap-3 p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xl font-bold text-primary">
                    {tpl.letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold leading-tight [overflow-wrap:anywhere]">
                      {tpl.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tpl.weekday != null ? WEEKDAY_SHORT[tpl.weekday] : "Unscheduled"}
                      {tpl.time ? ` · ${to12h(tpl.time)}` : ""} · {tpl.exercises.length} exercises
                    </p>
                    {tpl.focus && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tpl.focus}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-h-11"
                    disabled={!!active}
                    onClick={async () => {
                      await startSession(tpl, today);
                      nav({ to: "/train/session" });
                    }}
                  >
                    <VIcon name="training" size={16} />
                    Start now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 bg-foreground/6"
                    onClick={() => setEditing(tpl)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto min-h-11"
                    aria-expanded={isOpen}
                    aria-label={`${tpl.exercises.length} exercises`}
                    onClick={() => setOpen(isOpen ? null : tpl.id)}
                  >
                    {tpl.exercises.length} exercises
                    <VIcon
                      name="collapse"
                      size={16}
                      className={cn("transition", isOpen && "rotate-180")}
                    />
                  </Button>
                  {active && (
                    <p className="w-full text-xs text-muted-foreground">
                      Finish the current session first.
                    </p>
                  )}
                </div>
                {isOpen && (
                  <ul className="mx-2 mb-2 rounded-2xl bg-foreground/5 px-3 [&>li+li]:border-t [&>li+li]:border-line/70">
                    {tpl.exercises.map((e) => {
                      const ce = resolveCatalogueExercise(e, cat.exercises, cat.byId);
                      return (
                        <li key={e.id} className="flex items-start gap-3 py-3">
                          <div className="w-20 shrink-0 overflow-hidden rounded-xl">
                            <ExerciseVisual
                              media={ce?.media}
                              name={e.name}
                              pattern={ce?.pattern}
                              compact
                              showCredit={false}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{e.name}</p>
                            <p className="text-sm text-muted-foreground tnum">
                              {e.schemeText}
                              {e.rest ? ` · ${e.rest}` : ""}
                            </p>
                            {e.equipment && (
                              <p className="text-xs text-muted-foreground">{e.equipment}</p>
                            )}
                            {e.alternative && (
                              <p className="text-xs text-muted-foreground">
                                Alternative: {e.alternative}
                              </p>
                            )}
                            {e.cue && <p className="mt-1 text-sm">{e.cue}</p>}
                          </div>
                        </li>
                      );
                    })}
                    {tpl.cardio && (
                      <li className="py-3 text-sm text-muted-foreground">
                        Optional cardio: {tpl.cardio.machine}, {tpl.cardio.text}. Cardio is separate
                        and doesn't count as a lifting session.
                      </li>
                    )}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      </Section>

      {livePlans.length > 0 && (
        <Section title="Generated plans">
          <Group as="ul">
            {livePlans.map((p) => (
              <li key={p.id} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold capitalize [overflow-wrap:anywhere]">
                    {p.programmeId.replace(/-/g, " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Made {p.createdAt.slice(0, 10)} · rules {p.rulesVersion}
                    {p.generation ? ` · version ${p.generation + 1}` : ""}
                  </p>
                </div>
                <Link
                  to="/train/build"
                  search={{ from: p.id }}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-foreground/8 px-5 text-sm font-semibold active:scale-95"
                >
                  Regenerate
                </Link>
              </li>
            ))}
          </Group>
        </Section>
      )}

      {archived.length > 0 && (
        <Section
          title="Archived"
          action={
            <button
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-medium text-muted-foreground"
              aria-expanded={showArchived}
              aria-label={`Archived workouts (${archived.length})`}
              onClick={() => setShowArchived((v) => !v)}
            >
              {archived.length}
              <VIcon
                name="collapse"
                size={16}
                className={cn("transition", showArchived && "rotate-180")}
              />
            </button>
          }
        >
          {showArchived && (
            <Group as="ul">
              {archived.map((a) => (
                <li
                  key={a.id}
                  className="flex min-h-16 items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold [overflow-wrap:anywhere]">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.exercises.length} exercises · archived {a.archivedAt!.slice(0, 10)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="min-h-11 shrink-0"
                    busy={restoring === a.id}
                    onClick={async () => {
                      setRestoring(a.id);
                      try {
                        const r = await restoreTemplate(a.id);
                        toast.success(
                          r.scheduled
                            ? "Restored on its day."
                            : "Restored, unscheduled (its day is taken). Place it from Edit.",
                        );
                      } catch {
                        toast.error("Couldn't restore it. Nothing was changed; try again.");
                      } finally {
                        setRestoring(null);
                      }
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </Group>
          )}
        </Section>
      )}

      <WorkoutLibrary activeTab={discoverTab} onTabChange={setDiscoverTab} />

      <Section title="Recent sessions" className="mt-6">
        {history.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            body={
              legacy.items.length
                ? `Your ${legacy.items.length} days from the original app are kept in Progress.`
                : "Start a workout and it will appear here."
            }
          />
        ) : (
          <Group as="ul">
            {history.map((h) => {
              const sum = sessionSummary(h);
              return (
                <li key={h.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full font-display font-bold",
                      h.status === "completed"
                        ? "bg-primary/15 text-primary"
                        : "bg-foreground/8 text-muted-foreground",
                    )}
                  >
                    {h.templateLetter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{h.templateName}</p>
                    <p className="text-sm text-muted-foreground tnum">
                      {formatDateLong(h.date)} · {sum.completed}/{sum.planned} sets ·{" "}
                      {sum.volume.toLocaleString("en-GB")} kg
                    </p>
                  </div>
                  {h.status === "completed" ? (
                    <Chip tone="ok" icon={<VIcon name="check" size={16} />}>
                      Completed
                    </Chip>
                  ) : (
                    <Chip tone="warn">Partial</Chip>
                  )}
                </li>
              );
            })}
          </Group>
        )}
      </Section>
      <TemplateEditor
        template={editing}
        count={t.items.length}
        isNew={!!editing && !t.items.some((x) => x.id === editing.id)}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
