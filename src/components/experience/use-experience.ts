import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useHaptics } from "@/components/buddy/useHaptics";
import {
  DURATION,
  INITIAL,
  SCHEDULE,
  reduce,
  stateAt,
  type Action,
  type HapticEvent,
  type State,
} from "./model";

export type Mode = "playing" | "paused" | "interactive";

/**
 * Drives one experience. Autoplay runs the shared schedule; seeking folds it; any real tap switches to
 * interactive, where only a few transitions are automatic (arrive, enter, rest) and everything else waits for
 * the person. Haptics fire only for real taps, never for autoplay, and only if the person has opted in.
 */
export function useExperience({
  autoplay = true,
  seek,
  loop = false,
}: { autoplay?: boolean; seek?: number; loop?: boolean } = {}) {
  const [state, rawDispatch] = useReducer(reduce, seek !== undefined ? stateAt(seek) : INITIAL);
  const [mode, setMode] = useState<Mode>(
    seek !== undefined ? "paused" : autoplay ? "playing" : "paused",
  );
  const [elapsed, setElapsed] = useState(seek ?? 0);
  const [speed, setSpeed] = useState(1);
  const [log, setLog] = useState<{ n: number; kind: HapticEvent; label: string; real: boolean }[]>(
    [],
  );
  const haptic = useHaptics();
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const stateRef = useRef(state);
  stateRef.current = state;

  const note = useCallback(
    (prev: State, next: State, real: boolean) => {
      if (next.event && next.event.n !== prev.event?.n) {
        const e = next.event;
        setLog((l) => [...l.slice(-5), { ...e, real }]);
        if (real) haptic(e.kind);
      }
    },
    [haptic],
  );

  /** A person's tap: switches to interactive and applies the action. */
  const act = useCallback(
    (a: Action) => {
      if (modeRef.current !== "interactive") setMode("interactive");
      const prev = stateRef.current;
      const next = reduce(prev, a);
      rawDispatch(a);
      note(prev, next, true);
    },
    [note],
  );

  // Autoplay clock.
  useEffect(() => {
    if (mode !== "playing") return;
    let raf = 0;
    let last = performance.now();
    let t = elapsed;
    let applied = SCHEDULE.filter((s) => s.at <= t).length;
    const tick = (now: number) => {
      t += (now - last) * speed;
      last = now;
      while (applied < SCHEDULE.length && SCHEDULE[applied]!.at <= t) {
        const prev = stateRef.current;
        const a = SCHEDULE[applied]!.action;
        rawDispatch(a);
        note(prev, reduce(prev, a), false);
        applied += 1;
      }
      setElapsed(Math.min(t, DURATION));
      if (t >= DURATION + 2500) {
        if (loop) {
          t = 0;
          applied = 0;
          setElapsed(0);
        } else {
          setMode("paused");
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // elapsed is read once when play starts; the loop owns the clock afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, speed, loop, note]);

  // Interactive: the few automatic hand-offs.
  useEffect(() => {
    if (mode !== "interactive") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, a: Action) => timers.push(setTimeout(() => rawDispatch(a), ms));
    if (state.scene === "arrive") after(1800, { type: "scene", scene: "readiness" });
    if (state.scene === "enter") after(1800, { type: "set" });
    if (state.scene === "rest" && !state.restDone) after(2600, { type: "restDone" });
    if (state.undoOpen) after(6000, { type: "dismissUndo" });
    return () => timers.forEach(clearTimeout);
  }, [mode, state.scene, state.restDone, state.undoOpen]);

  const api = useMemo(
    () => ({
      play: () => {
        setMode("playing");
      },
      pause: () => setMode("paused"),
      restart: () => {
        rawDispatch({ type: "reset" });
        setElapsed(0);
        setLog([]);
        setMode("playing");
      },
      seekTo: (ms: number) => {
        const t = Math.max(0, Math.min(DURATION, ms));
        // replace state wholesale by folding the schedule
        rawDispatch({ type: "reset" });
        for (const step of SCHEDULE) if (step.at <= t) rawDispatch(step.action);
        setElapsed(t);
        setMode("paused");
      },
      setSpeed,
    }),
    [],
  );

  return { state, mode, elapsed, speed, log, act, ...api };
}
