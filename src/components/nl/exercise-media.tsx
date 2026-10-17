import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/domain/catalogue";
import { cn } from "@/lib/utils";
import { Button } from "./ui";
import { VIcon } from "./icon";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function ExerciseMedia({
  item,
  alt,
  className,
  eager = false,
  controls = true,
}: {
  item: MediaItem;
  alt: string;
  className?: string;
  eager?: boolean;
  controls?: boolean;
}) {
  const reduced = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const motion = item.kind !== "image";
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPlaying(motion && !reduced);
  }, [item.id, motion, reduced]);

  useEffect(() => {
    if (!root.current || !motion) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      {
        rootMargin: "80px",
        threshold: 0.15,
      },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [motion]);

  const active = playing && visible && !reduced;
  useEffect(() => {
    if (item.kind !== "video" || !video.current) return;
    if (active) void video.current.play().catch(() => setPlaying(false));
    else video.current.pause();
  }, [active, item.kind]);

  const fallback = item.poster ?? item.thumb;
  const retry = () => {
    setFailed(false);
    setPlaying(motion && !reduced);
  };

  return (
    <figure ref={root} className={cn("relative overflow-hidden rounded-2xl bg-white", className)}>
      {failed ? (
        <div className="grid min-h-44 place-items-center gap-2 bg-surface-2 p-6 text-center text-sm text-muted-foreground">
          <span>The demonstration could not load.</span>
          <Button size="sm" variant="secondary" onClick={retry}>
            <VIcon name="replace" size={16} /> Retry
          </Button>
          <a
            href="/settings#feedback"
            className="min-h-11 py-2 font-semibold underline underline-offset-4"
          >
            Report this media
          </a>
        </div>
      ) : item.kind === "video" ? (
        <video
          ref={video}
          src={item.url}
          poster={fallback}
          muted
          loop
          playsInline
          preload={eager ? "auto" : "metadata"}
          aria-label={alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <img
          key={active ? item.url : (fallback ?? item.url)}
          src={active ? item.url : (fallback ?? item.url)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      )}
      {motion && controls && !failed && (
        <button
          type="button"
          className="spatial-glass absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-semibold text-foreground"
          aria-pressed={active}
          onClick={() => setPlaying((value) => !value)}
        >
          <VIcon name={active ? "pause" : "play"} size={16} />
          {active ? "Pause demo" : reduced ? "Play demo" : "Play demo"}
        </button>
      )}
    </figure>
  );
}

/** Cards deliberately use a still so a results page never starts dozens of loops. */
export function ExerciseMediaThumb({
  item,
  alt = "",
  className,
}: {
  item: MediaItem;
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src={item.thumb ?? item.poster ?? item.url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("bg-white object-contain", className)}
    />
  );
}
