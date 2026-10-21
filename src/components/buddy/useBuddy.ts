import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { useSyncStatus } from "@/data/sync-status";
import { COL, type MindEntry, type Session, type WorkoutTemplate } from "@/data/types";
import { normaliseCompanion, type CompanionConfig } from "@/domain/companion";
import { daysBetween, localDate, localMinutes, weekdayIndex } from "@/domain/dates";
import { buddyBrief, type BuddyBrief, type BuddyContext } from "@/domain/buddy/brain";
import { personalBest } from "@/domain/buddy/mirror";
import { initialModel, reduce, effectiveMotion, type BuddyState } from "@/domain/buddy/state";
import { useReducedMotionPref } from "@/lib/media-prefs";
import { useLocation } from "@tanstack/react-router";

export function useCompanionConfig(): CompanionConfig & { ready: boolean } {
  const { items, ready } = useCollection<CompanionConfig>(COL.companion);
  const saved = items.find((item) => item.id === "main");
  return useMemo(() => ({ ...normaliseCompanion(saved), ready }), [saved, ready]);
}

/** Status signals only. Never reads note, reflection or journal text. */
export function useBuddyContext(): BuddyContext {
  const loc = useLocation();
  const config = useCompanionConfig();
  const { profile } = useProfile();
  const sessions = useCollection<Session>(COL.sessions).items;
  const templates = useCollection<WorkoutTemplate>(COL.templates).items;
  const mind = useCollection<MindEntry>(COL.mind).items;
  const sync = useSyncStatus();
  const now = useNow(60_000);
  const tz = profile?.timezone ?? "UTC";
  const today = localDate(now, tz);
  const online = useOnline();
  return useMemo(() => {
    const finished = sessions
      .filter((s) => s.status === "completed" || s.status === "ended-early")
      .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt));
    const active = sessions.find((s) => s.status === "active" || s.status === "paused");
    const last = finished[0];
    const pb =
      last && now - (last.endedAt ?? 0) < 15 * 60_000 ? personalBest(last, finished) : undefined;
    const pending = active?.exercises.find((e) =>
      e.sets.some((s) => s.kind === "working" && !s.completed && !s.skipped),
    );
    const planned = templates.some((t) => t.weekday === weekdayIndex(today) && !t.archivedAt);
    const sets = active?.exercises.flatMap((e) => e.sets.filter((s) => s.kind === "working")) ?? [];
    const r = active?.readiness;
    return {
      pathname: loc.pathname,
      minute: localMinutes(now, tz),
      online,
      syncError: sync.mode === "attention",
      needsSetup: !config.setupDone,
      session: active
        ? {
            resting: !!active.rest && (active.rest.endsAt ?? Infinity) > now,
            next: pending?.name,
            cue: pending && !pending.sets.some((s) => s.completed) ? pending.cue : undefined,
            doneSets: sets.filter((s) => s.completed).length,
            totalSets: sets.length,
            readinessAsked: !!r?.decision,
            lowReadiness:
              !!r && r.score < 55 && r.decision !== "kept_plan" && r.decision !== "dismissed",
          }
        : undefined,
      plannedToday: planned,
      completedToday: sessions.some((s) => s.date === today && s.status === "completed"),
      daysSinceLastSession: last ? daysBetween(last.date, today) : undefined,
      personalBest: pb,
      mindDoneToday: mind.some((m) => m.date === today),
      hasPlan: templates.length > 0,
    };
  }, [
    loc.pathname,
    now,
    tz,
    online,
    sync.mode,
    sessions,
    templates,
    mind,
    today,
    config.setupDone,
  ]);
}

export function useOnline() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener("online", bump);
    window.addEventListener("offline", bump);
    return () => {
      window.removeEventListener("online", bump);
      window.removeEventListener("offline", bump);
    };
  }, []);
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Drives the animation state machine from the brief; transient states settle on their own. */
export function useBuddyState(
  brief: BuddyBrief,
  enabled = true,
): { state: BuddyState; signal: (state: BuddyState, force?: boolean) => void } {
  const [model, dispatch] = useReducer(reduce, undefined, () => initialModel(Date.now()));
  const lastKey = useRef("");
  useEffect(() => {
    if (!enabled) return;
    const settled: BuddyState =
      brief.scene === "offline" ? "offline" : brief.scene === "quiet" ? "rest" : "idle";
    dispatch({ type: "base", base: settled, now: Date.now() });
    if (brief.key !== lastKey.current) {
      lastKey.current = brief.key;
      dispatch({
        type: "signal",
        state: brief.state,
        now: Date.now(),
        force: brief.priority === 3,
      });
    }
  }, [brief.key, brief.scene, brief.state, brief.priority, enabled]);
  useEffect(() => {
    if (model.until === null) return;
    const id = setTimeout(
      () => dispatch({ type: "tick", now: Date.now() }),
      Math.max(0, model.until - Date.now()) + 20,
    );
    return () => clearTimeout(id);
  }, [model.until, model.state]);
  const signal = useCallback(
    (next: BuddyState, force = false) =>
      dispatch({ type: "signal", state: next, now: Date.now(), force }),
    [],
  );
  return { state: model.state, signal };
}

export function useBuddyMotion(config: CompanionConfig) {
  const reduced = useReducedMotionPref();
  return effectiveMotion(config.motion, reduced);
}

export function useBrief(config: CompanionConfig, ctx: BuddyContext) {
  return useMemo(() => buddyBrief(ctx, config), [ctx, config]);
}
