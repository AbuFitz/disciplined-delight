import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Skeleton } from "@/components/nl/ui";
import {
  ExerciseCard,
  FinishSheet,
  GymMode,
  RestBar,
  SessionHeader,
} from "@/components/nl/session";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL, type LegacyDayLog, type Session } from "@/data/types";
import { useWakeLock } from "@/lib/wake-lock";
import { useCatalogue } from "@/data/catalogue-runtime";
import { ReadinessCheckIn } from "@/components/nl/readiness-checkin";
import { VIcon } from "@/components/nl/icon";
import { ShellBar } from "@/components/nl/shell-slots";

export const Route = createFileRoute("/train/session")({ component: SessionPage });

function SessionPage() {
  const nav = useNavigate();
  const sessionsQ = useCollection<Session>(COL.sessions);
  const legacy = useCollection<LegacyDayLog>(COL.legacyDays).items;
  const { profile } = useProfile();
  const now = useNow(1000);
  const [finish, setFinish] = useState(false);
  const [gymMode, setGymMode] = useState(false);
  const session = sessionsQ.items.find((s) => s.status === "active" || s.status === "paused");
  const [openId, setOpenId] = useState<string | null>(null);
  const catalogue = useCatalogue();
  const normalise = (value: string) => value.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "");
  const byName = useMemo(
    () => new Map(catalogue.exercises.map((item) => [normalise(item.name), item])),
    [catalogue.exercises],
  );

  const wake = useWakeLock((!!profile?.wakeLock || gymMode) && session?.status === "active");
  useEffect(() => {
    if (session && openId == null) {
      const first =
        session.exercises.find((e) =>
          e.sets.some((s) => s.kind === "working" && !s.completed && !s.skipped),
        ) ?? session.exercises[0];
      setOpenId(first?.id ?? null);
    }
  }, [session, openId]);

  if (!sessionsQ.ready) return <Skeleton className="h-64 rounded-3xl" />;
  if (!session) {
    return (
      <EmptyState
        title="No session in progress"
        body="Start one from Train or Today."
        action={
          <Link
            to="/train"
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
          >
            Go to Train
          </Link>
        }
      />
    );
  }

  const catalogueFor = (exercise: Session["exercises"][number]) =>
    (exercise.catalogueId ? catalogue.byId.get(exercise.catalogueId) : undefined) ??
    byName.get(normalise(exercise.name));
  if (gymMode)
    return (
      <>
        <GymMode
          session={session}
          sessions={sessionsQ.items}
          now={now}
          catalogueFor={catalogueFor}
          preferences={profile?.gymMode ?? { voice: false, haptics: false, autoMedia: false }}
          music={profile?.trainingMusic}
          wake={wake}
          onExit={() => setGymMode(false)}
          onFinish={() => setFinish(true)}
        />
        <FinishSheet
          open={finish}
          onOpenChange={setFinish}
          session={session}
          onDone={() => nav({ to: "/train" })}
        />
      </>
    );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/train"
        className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface/80 px-4 text-sm font-medium text-muted-foreground active:scale-95"
      >
        <VIcon name="back" size={16} />
        Leave (session stays saved)
      </Link>
      <SessionHeader session={session} now={now} />
      {!session.readiness?.decision && <ReadinessCheckIn session={session} />}
      {session.readiness?.decision && (
        <button
          onClick={() => setGymMode(true)}
          className="mb-4 flex min-h-16 w-full items-center gap-3 rounded-3xl bg-primary px-4 py-3 text-left text-primary-foreground transition active:scale-[0.98]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <VIcon name="training" size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold leading-tight">Enter Gym Mode</span>
            <span className="block text-sm opacity-80">One set at a time</span>
          </span>
          <span aria-hidden>→</span>
        </button>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {session.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            session={session}
            ex={ex}
            index={i}
            total={session.exercises.length}
            now={now}
            open={openId === ex.id}
            onToggle={() => setOpenId(openId === ex.id ? null : ex.id)}
            sessions={sessionsQ.items}
            legacy={legacy}
            catalogue={catalogueFor(ex)}
          />
        ))}
      </div>
      <ShellBar>
        <div className="mx-3 mb-2 grid gap-3 rounded-3xl bg-surface p-3 shadow-lg lg:mx-0 lg:mb-0 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="min-h-11 min-w-0">
            {session.rest ? (
              <RestBar session={session} now={now} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Rest timer starts when you tick a set.
              </p>
            )}
          </div>
          <Button variant="primary" onClick={() => setFinish(true)}>
            <VIcon name="finish" size={16} />
            Finish
          </Button>
        </div>
      </ShellBar>
      <FinishSheet
        open={finish}
        onOpenChange={setFinish}
        session={session}
        onDone={() => nav({ to: "/train" })}
      />
    </div>
  );
}
