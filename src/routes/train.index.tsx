import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Dumbbell, Play } from "lucide-react";
import { useState } from "react";
import { Button, Chip, EmptyState, PageHeader, Panel, Row, Skeleton } from "@/components/nl/ui";
import { startSession } from "@/data/actions";
import { useCollection, useToday } from "@/data/hooks";
import { activeTemplates, weekTraining } from "@/data/selectors";
import { sessionSummary } from "@/data/session-logic";
import { COL, type LegacyDayLog, type Session, type WorkoutTemplate } from "@/data/types";
import { WEEKDAY_SHORT, formatDateLong, to12h } from "@/domain/dates";
import { exerciseImage, workoutImage } from "@/lib/exercise-media";
import { useActiveSession } from "@/components/nl/Shell";
import { TemplateEditor, blankTemplate } from "@/components/nl/programme";
import { cn } from "@/lib/utils";

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
  const templates = activeTemplates(t.items);
  const week = weekTraining(t.items, s.items, today);
  const history = s.items
    .filter((x) => x.status === "completed" || x.status === "ended-early")
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 12);
  const todayIdx = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7;

  if (!t.ready) return <Skeleton className="h-72" />;
  return (
    <>
      <PageHeader
        eyebrow="Train"
        title="Your programme"
        sub={`${week.completed} of ${week.planned} planned sessions done this week${week.partial ? `, ${week.partial} partial` : ""}.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(blankTemplate(t.items.length))}>
              New workout
            </Button>
            {active ? (
              <Button variant="primary" onClick={() => nav({ to: "/train/session" })}>
                <Play className="size-4 fill-current" />
                Continue session
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-7 gap-1.5 md:gap-2" role="list" aria-label="Weekly split">
        {WEEKDAY_SHORT.map((d, i) => {
          const tpl = templates.find((x) => x.weekday === i);
          return (
            <div
              key={d}
              role="listitem"
              className={cn(
                "rounded-2xl border p-2 text-center md:p-3",
                i === todayIdx ? "border-primary" : "border-line",
                tpl ? "bg-surface" : "opacity-70",
              )}
            >
              <p className="eyebrow !text-[0.62rem]">{d}</p>
              <p className="font-display text-xl font-bold md:text-2xl">{tpl ? tpl.letter : "–"}</p>
              <p className="sr-only">{tpl ? `Workout ${tpl.letter}` : "Rest day"}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {templates.map((tpl) => {
          const isOpen = open === tpl.id;
          const img = workoutImage(tpl.legacyId);
          return (
            <Panel key={tpl.id} className="overflow-hidden !p-0">
              <div className="flex gap-4 p-4 md:p-5">
                {img && (
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className="hidden size-20 shrink-0 rounded-2xl object-cover sm:block"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">
                    Workout {tpl.letter} ·{" "}
                    {tpl.weekday != null ? WEEKDAY_SHORT[tpl.weekday] : "Unscheduled"}
                    {tpl.time ? ` · ${to12h(tpl.time)}` : ""}
                  </p>
                  <h2 className="font-display text-2xl font-semibold leading-tight">{tpl.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tpl.focus}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 md:px-5">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!!active}
                  onClick={async () => {
                    await startSession(tpl, today);
                    nav({ to: "/train/session" });
                  }}
                >
                  <Dumbbell className="size-4" />
                  Start now
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(tpl)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : tpl.id)}
                >
                  {tpl.exercises.length} exercises
                  <ChevronDown className={cn("size-4 transition", isOpen && "rotate-180")} />
                </Button>
                {active && (
                  <span className="text-xs text-muted-foreground">
                    Finish the current session first.
                  </span>
                )}
              </div>
              {isOpen && (
                <ul className="border-t border-line px-4 pb-3 md:px-5">
                  {tpl.exercises.map((e) => {
                    const m = exerciseImage(e.legacyId);
                    return (
                      <Row as="li" key={e.id} className="items-start py-3">
                        {m ? (
                          <img
                            src={m.image}
                            alt={`${e.name} reference`}
                            loading="lazy"
                            className="size-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="size-14 shrink-0 rounded-xl bg-surface-2" aria-hidden />
                        )}
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
                      </Row>
                    );
                  })}
                  {tpl.cardio && (
                    <p className="py-3 text-sm text-muted-foreground">
                      Optional cardio: {tpl.cardio.machine}, {tpl.cardio.text}. Cardio is separate
                      and doesn't count as a lifting session.
                    </p>
                  )}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>

      <section className="mt-10" aria-label="Session history">
        <h2 className="eyebrow mb-2">Recent sessions</h2>
        {history.length === 0 ? (
          <EmptyState
            title="No sessions recorded yet"
            body={
              legacy.items.length
                ? `Your ${legacy.items.length} days from the original app are kept in Progress. Sessions recorded here will list sets and reps.`
                : "Start a workout and it will appear here."
            }
          />
        ) : (
          <ul>
            {history.map((h) => {
              const sum = sessionSummary(h);
              return (
                <Row as="li" key={h.id} className="justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Workout {h.templateLetter}: {h.templateName}
                    </p>
                    <p className="text-sm text-muted-foreground tnum">
                      {formatDateLong(h.date)} · {sum.completed}/{sum.planned} sets ·{" "}
                      {sum.volume.toLocaleString("en-GB")} kg
                    </p>
                  </div>
                  {h.status === "completed" ? (
                    <Chip tone="ok" icon={<Check className="size-3.5" />}>
                      Completed
                    </Chip>
                  ) : (
                    <Chip tone="warn">Partial</Chip>
                  )}
                </Row>
              );
            })}
          </ul>
        )}
      </section>
      <TemplateEditor
        template={editing}
        count={t.items.length}
        isNew={!!editing && !t.items.some((x) => x.id === editing.id)}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
