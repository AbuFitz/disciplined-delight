import "./buddy.css";
import { useMemo } from "react";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL, type Session, type SessionExercise } from "@/data/types";
import { consistencyMirror, mirrorForExercise, mirrorSummary } from "@/domain/buddy/mirror";
import { localDate } from "@/domain/dates";
import { cn } from "@/lib/utils";

/**
 * "You vs You". Every line compares the person with their own earlier work. There are no
 * rankings, no other people, and a lighter day reads as information rather than a result.
 */
export function MirrorExercise({
  session,
  exercise,
  className,
}: {
  session: Pick<Session, "id" | "date">;
  exercise: SessionExercise;
  className?: string;
}) {
  const history = useCollection<Session>(COL.sessions).items;
  const mirror = useMemo(
    () => mirrorForExercise(exercise, history, session),
    [exercise, history, session],
  );
  return (
    <div
      className={cn("mirror", className)}
      data-testid="mirror-exercise"
      aria-label="You versus you"
    >
      <p className="eyebrow">You vs you</p>
      <ul className="mirror-lines">
        {mirror.lines.map((line) => (
          <li key={line.kind} data-kind={line.kind}>
            {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MirrorSummaryCard({ session }: { session: Session }) {
  const history = useCollection<Session>(COL.sessions).items;
  const summary = useMemo(() => mirrorSummary(session, history), [session, history]);
  const lines = [...(summary.comeback ? [summary.comeback] : []), ...summary.wins];
  if (!lines.length) return null;
  return (
    <div className="mirror" data-testid="mirror-summary">
      <p className="eyebrow">You vs you</p>
      <ul className="mirror-lines">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** Today panel: consistency against the person's own usual week, and the last session's comparison. */
export function MirrorToday() {
  const history = useCollection<Session>(COL.sessions).items;
  const { profile } = useProfile();
  const now = useNow(60_000);
  const today = localDate(now, profile?.timezone ?? "UTC");
  const consistency = useMemo(() => consistencyMirror(history, today), [history, today]);
  const last = useMemo(
    () =>
      history
        .filter((s) => s.status === "completed" || s.status === "ended-early")
        .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))[0],
    [history],
  );
  const summary = useMemo(() => (last ? mirrorSummary(last, history) : undefined), [last, history]);
  return (
    <div className="mirror mt-3" data-testid="mirror-today">
      <p className="eyebrow">You vs you</p>
      <ul className="mirror-lines">
        <li>{consistency.text}</li>
        {summary?.wins[0] && <li>Last session: {summary.wins[0]}</li>}
        {summary?.comeback && <li>{summary.comeback}</li>}
      </ul>
    </div>
  );
}
