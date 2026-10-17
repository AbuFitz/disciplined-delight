import { useEffect, useRef, type RefObject } from "react";
import { KEY_POSES, clipFor, idleVariation, type Clip, type Part } from "@/domain/buddy/clips";
import type { BuddyState } from "@/domain/buddy/state";
import type { MotionProfile } from "@/domain/buddy/variants";

const PARTS: Part[] = ["root", "body", "face", "eyes", "mouth", "acc", "shadow"];
const BLEND_MS = 150;

/** Gentle keeps every clip but with softer squash, anticipation and overshoot. */
export const softened = (p: MotionProfile): MotionProfile => ({
  ...p,
  squash: p.squash * 0.6,
  anticipation: p.anticipation * 0.7,
  overshoot: p.overshoot * 0.6,
});

/**
 * Plays authored clips on the rig parts with the Web Animations API. State changes interrupt the
 * running clip and blend from the current pose. Animation pauses when `live` is false (off-screen
 * or background tab) and reduced-motion / still mode applies a static key pose instead.
 * Only transform and opacity change, so layout never shifts.
 */
export function useBuddyAnimator(
  ref: RefObject<SVGSVGElement | null>,
  state: BuddyState,
  profile: MotionProfile,
  motion: "off" | "gentle" | "full",
  live: boolean,
  rng: () => number = Math.random,
) {
  const running = useRef<Animation[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const part = (name: Part) => svg.querySelector<SVGElement>(`[data-part="${name}"]`);
    const stopAll = () => {
      for (const a of running.current) a.cancel();
      running.current = [];
    };
    const clearInline = () => {
      for (const n of PARTS) {
        part(n)?.style.removeProperty("transform");
        part(n)?.style.removeProperty("opacity");
      }
    };
    // Current pose of every part, read before the running clip is cancelled, to blend from.
    const poses = new Map<Part, string>();
    for (const n of PARTS) {
      const el = part(n);
      if (el) poses.set(n, getComputedStyle(el).transform);
    }

    if (motion === "off" || typeof svg.animate !== "function") {
      stopAll();
      clearInline();
      const pose = KEY_POSES[state];
      const root = part("root");
      const body = part("body");
      if (root) root.style.transform = pose.root;
      if (body) body.style.transform = pose.body;
      return () => {
        clearInline();
      };
    }

    const p = motion === "gentle" ? softened(profile) : profile;
    const play = (clip: Clip, blend: boolean) => {
      for (const t of clip.tracks) {
        const el = part(t.part);
        if (!el) continue;
        const iterations = t.iterations ?? 1;
        const main = el.animate(t.keyframes, {
          duration: Math.max(1, t.duration),
          easing: t.easing ?? "linear",
          iterations,
          delay: (t.delay ?? 0) + (blend ? BLEND_MS : 0),
          fill: "both",
        });
        running.current.push(main);
        if (!liveRef.current) main.pause();
        if (blend) {
          const from = poses.get(t.part);
          const to = (t.keyframes[0]?.transform as string | undefined) ?? "none";
          if (from && from !== "none" && from !== to) {
            const b = el.animate([{ transform: from }, { transform: to }], {
              duration: BLEND_MS,
              easing: "ease-out",
            });
            running.current.push(b);
            if (!liveRef.current) b.pause();
          }
        }
      }
    };

    stopAll();
    clearInline();
    play(clipFor(state, p), true);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (state === "idle" || state === "breathe") {
      const schedule = () => {
        const [lo, hi] = p.idleEvery;
        timer = setTimeout(
          () => {
            if (liveRef.current && state === "idle") play(idleVariation(p, rng()), false);
            schedule();
          },
          lo + rng() * (hi - lo),
        );
      };
      if (state === "idle") schedule();
    }
    return () => {
      if (timer) clearTimeout(timer);
      stopAll();
    };
    // profile object identity is stable per variant; motion and state are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, motion, profile, ref]);

  useEffect(() => {
    for (const a of running.current) {
      try {
        if (live) a.play();
        else a.pause();
      } catch {
        /* finished or cancelled */
      }
    }
  }, [live]);
}
