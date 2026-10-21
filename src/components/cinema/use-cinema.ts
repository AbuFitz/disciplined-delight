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
 * Drives the prototype. Autoplay runs the schedule; seeking folds it; any real tap switches to interactive, where a few
 * hand-offs are automatic (arrive, charge, enter, rest) and everything else waits for the person. Haptics fire only for
 * real taps and only when the person has enabled them.
 */
export function useCinema({
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
  const stateRef = useRef<State>(state);
  stateRef.current = state;

  const note = useCallback(
    (prev: State, next: State, real: boolean) => {
      if (next.event && next.event.n !== prev.event?.n) {
        const e = next.event;
        setLog((l) => [...l.slice(-7), { ...e, real }]);
        if (real) haptic(e.kind);
      }
    },
    [haptic],
  );

  const act = useCallback(
    (a: Action) => {
      if (modeRef.current !== "interactive") setMode("interactive");
      const prev = stateRef.current;
      rawDispatch(a);
      note(prev, reduce(prev, a), true);
    },
    [note],
  );

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
      if (t >= DURATION) {
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
    // the loop owns the clock once started
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, speed, loop, note]);

  // Interactive hand-offs.
  useEffect(() => {
    if (mode !== "interactive") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, a: Action) => timers.push(setTimeout(() => rawDispatch(a), ms));
    if (state.scene === "arrive") after(2000, { type: "scene", scene: "ready" });
    if (state.scene === "ready" && state.ready) after(1700, { type: "scene", scene: "now" });
    if (state.scene === "enter") after(1700, { type: "scene", scene: "gym" });
    if (state.scene === "gym" && state.setDone) after(900, { type: "scene", scene: "rest" });
    if (state.scene === "rest" && !state.restDone) after(2600, { type: "restDone" });
    if (state.assist === "applied") after(1500, { type: "closeAssist" });
    if (state.undoOpen) after(6000, { type: "dismissUndo" });
    return () => timers.forEach(clearTimeout);
  }, [mode, state.scene, state.ready, state.setDone, state.restDone, state.assist, state.undoOpen]);

  const api = useMemo(
    () => ({
      play: () => setMode("playing"),
      pause: () => setMode("paused"),
      restart: () => {
        rawDispatch({ type: "reset" });
        setElapsed(0);
        setLog([]);
        setMode("playing");
      },
      seekTo: (ms: number) => {
        const t = Math.max(0, Math.min(DURATION, ms));
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
