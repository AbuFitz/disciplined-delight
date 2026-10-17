import { useRef, useState } from "react";
import type { CatalogueExercise } from "@/domain/catalogue";
import { describeMedia } from "@/domain/exercise-media";
import type { AuthoredWorkout } from "@/domain/workout-library";
import { cn } from "@/lib/utils";
import { Button, Sheet } from "./ui";
import { ExerciseVisual, MediaBadge } from "./exercise-visual";
import { FormGuidePanel } from "./form-guide";
import { VIcon } from "./icon";

/** Movement carousel: one large demonstration with a scroll-snap strip of the whole session. Keyboard and touch friendly. */
export function MovementCarousel({
  workout,
  byId,
  onGuide,
}: {
  workout: AuthoredWorkout;
  byId: Map<string, CatalogueExercise>;
  onGuide: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const total = workout.exercises.length;
  const exercise = workout.exercises[Math.min(index, total - 1)]!;
  const cat = exercise.catalogueId ? byId.get(exercise.catalogueId) : undefined;
  const go = (n: number) => {
    const next = (n + total) % total;
    setIndex(next);
    strip.current?.children[next]?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  };
  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${workout.title} movements`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_1fr]">
        <ExerciseVisual media={cat?.media} name={exercise.name} pattern={cat?.pattern} eager />
        <div className="grid content-start gap-3">
          <p className="eyebrow" aria-live="polite">
            Movement {index + 1} of {total}
          </p>
          <h3 className="font-display text-3xl font-semibold leading-tight [overflow-wrap:anywhere]">
            {exercise.name}
          </h3>
          <p className="num text-lg">
            {exercise.schemeText} · {exercise.restSeconds}s rest
          </p>
          <p className="text-sm text-muted-foreground">{exercise.intent}</p>
          {exercise.substitutions[0] && (
            <p className="text-sm">Substitute: {exercise.substitutions[0]}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => onGuide(index)}>
              <VIcon name="library" size={16} /> Form guide
            </Button>
            <Button size="sm" aria-label="Previous movement" onClick={() => go(index - 1)}>
              <VIcon name="previous" size={16} />
            </Button>
            <Button size="sm" aria-label="Next movement" onClick={() => go(index + 1)}>
              <VIcon name="next" size={16} />
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={strip}
        role="tablist"
        aria-label="Choose movement"
        className="flex snap-x snap-mandatory gap-px overflow-x-auto border border-line bg-line pb-0"
      >
        {workout.exercises.map((ex, i) => {
          const c = ex.catalogueId ? byId.get(ex.catalogueId) : undefined;
          const d = describeMedia(c?.media);
          const cover = d.frames.find((f) => f.role === "peak") ?? d.frames[0];
          return (
            <button
              key={ex.id}
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1}. ${ex.name}`}
              onClick={() => go(i)}
              className={cn(
                "relative w-28 shrink-0 snap-center bg-background text-left",
                i === index && "outline outline-2 -outline-offset-2 outline-primary",
              )}
            >
              <span className="block aspect-[4/3] bg-white">
                {cover ? (
                  <img
                    src={cover.item.thumb ?? cover.item.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain"
                  />
                ) : (
                  <span className="grid size-full place-items-center bg-surface-2 font-display text-2xl">
                    {ex.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="num absolute left-1 top-1 bg-background/85 px-1.5 text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="line-clamp-2 block min-h-[2.6rem] px-2 py-1 text-xs font-semibold leading-tight">
                {ex.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MediaBadge d={describeMedia(cat?.media)} />
        <span>
          Illustrated steps are still pictures of the start and peak. Real motion appears only where
          it exists.
        </span>
      </div>
    </section>
  );
}

export function FormGuideSheet({
  workout,
  index,
  byId,
  onClose,
}: {
  workout: AuthoredWorkout | null;
  index: number | null;
  byId: Map<string, CatalogueExercise>;
  onClose: () => void;
}) {
  const ex = workout && index != null ? workout.exercises[index] : undefined;
  const cat = ex?.catalogueId ? byId.get(ex.catalogueId) : undefined;
  return (
    <Sheet
      open={!!ex}
      onOpenChange={(o) => !o && onClose()}
      title={ex ? `Form guide: ${ex.name}` : "Form guide"}
      description="Technique reminders, not medical advice."
      wide
    >
      {ex && <FormGuidePanel exercise={cat} name={ex.name} intent={ex.intent} className="pb-4" />}
    </Sheet>
  );
}
