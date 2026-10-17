import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MediaItem } from "@/domain/catalogue";
import {
  coverFrame,
  describeMedia,
  montageAlt,
  workoutMontage,
  type MediaDescription,
} from "@/domain/exercise-media";
import { useMediaPrefs, setMediaPrefs, useReducedMotionPref } from "@/lib/media-prefs";
import { cn } from "@/lib/utils";
import { ExerciseMedia } from "./exercise-media";
import { VIcon } from "./icon";

/** Honest label for what a demonstration is. Motion is only ever shown for genuine motion assets. */
export function MediaBadge({ d, className }: { d: MediaDescription; className?: string }) {
  return (
    <span
      title={d.note}
      className={cn(
        "inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 border border-line bg-background/80 px-2 py-1 text-[0.68rem] leading-tight font-semibold uppercase tracking-[0.08em] backdrop-blur",
        d.mode === "motion" && "border-primary/60 text-primary",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          d.mode === "motion"
            ? "bg-primary"
            : d.mode === "none"
              ? "bg-muted-foreground/50"
              : "border border-foreground/60",
        )}
      />
      {d.badge}
    </span>
  );
}

/** Pattern-led placeholder so a missing demo never looks like a broken image. */
export function ExerciseArt({
  name,
  pattern,
  className,
}: {
  name: string;
  pattern?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${name}: no demonstration yet`}
      className={cn(
        "relative grid place-items-center overflow-hidden bg-surface-2 text-muted-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 80 80"
        className="absolute inset-0 size-full opacity-40"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="ledger" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 8H8" stroke="currentColor" strokeWidth=".4" opacity=".5" />
          </pattern>
        </defs>
        <rect width="80" height="80" fill="url(#ledger)" />
      </svg>
      <span className="relative text-center">
        <span className="block font-display text-4xl font-semibold leading-none">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="eyebrow mt-1 block !text-[0.6rem]">
          {pattern ? pattern.replace(/_/g, " ") : "No demo yet"}
        </span>
      </span>
    </div>
  );
}

function StillImage({
  item,
  alt,
  eager,
  className,
  onFail,
}: {
  item: MediaItem;
  alt: string;
  eager?: boolean;
  className?: string;
  onFail: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [item.url]);
  return (
    <>
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-surface-2 motion-reduce:animate-none"
        />
      )}
      <img
        key={item.url}
        src={item.url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onFail}
        className={cn(
          "relative h-full w-full object-contain transition-opacity duration-200 motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}

/**
 * The shared demonstration player. Genuine motion plays through ExerciseMedia; two illustrated frames become a stepper
 * with an optional user-controlled auto-flip (labelled as steps, never as animation); no media falls back to art.
 */
export function ExerciseVisual({
  media,
  name,
  pattern,
  eager = false,
  className,
  showCredit = true,
  compact = false,
  thumb = false,
}: {
  media: readonly MediaItem[] | undefined;
  name: string;
  pattern?: string;
  eager?: boolean;
  className?: string;
  showCredit?: boolean;
  compact?: boolean;
  /** A small still for list rows: the cover frame only, no controls. */
  thumb?: boolean;
}) {
  const d = useMemo(() => describeMedia(media), [media]);
  const prefs = useMediaPrefs();
  const reduced = useReducedMotionPref();
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const frames = d.frames.filter((f) => f.role !== "motion");
  const flipping = prefs.autoFlip && !reduced && !prefs.dataSaver && frames.length > 1;
  const firstUrl = d.frames[0]?.item.url;
  useEffect(() => {
    setStep(0);
    setFailed(false);
  }, [firstUrl]);
  useEffect(() => {
    if (!flipping) return;
    const id = setInterval(() => setStep((s) => (s + 1) % frames.length), 1600);
    return () => clearInterval(id);
  }, [flipping, frames.length]);

  if (thumb) {
    const cover = coverFrame(d);
    return cover && !failed ? (
      <img
        src={cover.thumb ?? cover.url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn("aspect-[4/3] w-full border border-line bg-white object-contain", className)}
      />
    ) : (
      <ExerciseArt
        name={name}
        pattern={pattern}
        className={cn("aspect-[4/3] w-full border border-line", className)}
      />
    );
  }
  if (d.mode === "none" || failed) {
    return (
      <div className={cn("grid gap-2", className)}>
        <ExerciseArt name={name} pattern={pattern} className="aspect-[4/3] w-full" />
        {failed && (
          <p className="text-sm text-muted-foreground">
            The picture could not load. It stays on this device once it does.
          </p>
        )}
      </div>
    );
  }
  if (d.mode === "motion" && d.motion) {
    return (
      <div className={cn("grid gap-2", className)}>
        <div className="relative">
          <ExerciseMedia
            item={d.motion}
            alt={`${name} demonstration`}
            eager={eager}
            className="aspect-[4/3] w-full"
          />
          <MediaBadge d={d} className="absolute left-2 top-2" />
        </div>
        {showCredit && <Credit d={d} />}
      </div>
    );
  }
  const current = frames[Math.min(step, frames.length - 1)]!;
  return (
    <div className={cn("grid gap-2", className)}>
      <figure className="relative aspect-[4/3] w-full overflow-hidden border border-line bg-white">
        <StillImage
          item={current.item}
          alt={`${name}, ${current.label.toLowerCase()}`}
          eager={eager}
          onFail={() => setFailed(true)}
        />
        <MediaBadge d={d} className="absolute left-2 top-2" />
        {frames.length > 1 && (
          <figcaption className="absolute bottom-2 left-2 border border-line bg-background/85 px-2 py-1 text-xs font-semibold backdrop-blur">
            {current.label}
          </figcaption>
        )}
      </figure>
      {frames.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Illustrated steps"
            className="inline-flex border border-line"
          >
            {frames.map((f, i) => (
              <button
                key={f.item.id}
                type="button"
                aria-pressed={i === step}
                onClick={() => setStep(i)}
                className={cn(
                  "min-h-11 px-4 text-sm font-semibold",
                  i === step ? "bg-foreground text-background" : "hover:bg-surface-2",
                )}
              >
                {f.role === "start" ? "Start" : f.role === "peak" ? "Peak" : f.label}
              </button>
            ))}
          </div>
          {!compact && (
            <button
              type="button"
              disabled={reduced || prefs.dataSaver}
              aria-pressed={prefs.autoFlip}
              onClick={() => setMediaPrefs({ autoFlip: !prefs.autoFlip })}
              className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-sm font-semibold disabled:opacity-50"
              title={
                reduced
                  ? "Reduced motion is on, so steps change only when you tap them."
                  : prefs.dataSaver
                    ? "Data saver is on."
                    : undefined
              }
            >
              <VIcon name={prefs.autoFlip ? "pause" : "play"} size={16} />
              {prefs.autoFlip ? "Stop flipping" : "Flip steps"}
            </button>
          )}
        </div>
      )}
      {showCredit && <Credit d={d} />}
    </div>
  );
}

function Credit({ d }: { d: MediaDescription }) {
  if (!d.credit) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {d.note} Illustration by {d.credit.author} · {d.credit.licence} ·{" "}
      <Link to="/credits" className="underline underline-offset-4">
        Credits
      </Link>
    </p>
  );
}

/** Workout card media: up to four distinct movements as a ledger montage. Stills only, so a grid never starts loops. */
export function WorkoutMedia({
  exercises,
  title,
  className,
}: {
  exercises: readonly { name: string; media: readonly MediaItem[] | undefined }[];
  title: string;
  className?: string;
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  // Failed files are removed before the badge is derived, so it always describes what is on screen.
  const m = useMemo(() => workoutMontage(exercises, 4, broken), [exercises, broken]);
  const tiles = m.tiles;
  const cols =
    tiles.length >= 3 ? "grid-cols-2" : tiles.length === 2 ? "grid-cols-2" : "grid-cols-1";
  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden border-b border-line bg-white",
        className,
      )}
    >
      {tiles.length === 0 ? (
        <ExerciseArt name={title} className="size-full" />
      ) : (
        <div
          role="img"
          aria-label={montageAlt(m)}
          className={cn("grid size-full gap-px bg-line", cols, tiles.length >= 3 && "grid-rows-2")}
        >
          {tiles.map((t, i) => (
            <TileImage
              key={t.item.url}
              url={t.item.thumb ?? t.item.poster ?? t.item.url}
              className={cn(tiles.length === 3 && i === 0 && "row-span-2")}
              onFail={() => setBroken((s) => new Set(s).add(t.item.url))}
            />
          ))}
        </div>
      )}
      <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-1.5 border border-line bg-background/85 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] backdrop-blur">
        {m.badge}
        {m.steps > 0 && <span className="text-muted-foreground">· {m.steps} with steps</span>}
      </span>
    </div>
  );
}

function TileImage({
  url,
  className,
  onFail,
}: {
  url: string;
  className?: string;
  onFail: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative min-h-0 overflow-hidden bg-white", className)}>
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-surface-2 motion-reduce:animate-none"
        />
      )}
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onFail}
        className={cn(
          "size-full object-contain transition-opacity duration-200 motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
