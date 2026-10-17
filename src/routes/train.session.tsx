import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Skeleton } from "@/components/nl/ui";
import { ExerciseCard, FinishSheet, RestBar, SessionHeader } from "@/components/nl/session";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL, type LegacyDayLog, type Session } from "@/data/types";
import { useWakeLock } from "@/lib/wake-lock";
import { useCatalogue } from "@/data/catalogue-runtime";

export const Route = createFileRoute("/train/session")({ component: SessionPage });

function SessionPage() {
  const nav = useNavigate();
  const sessionsQ = useCollection<Session>(COL.sessions);
  const legacy = useCollection<LegacyDayLog>(COL.legacyDays).items;
  const { profile } = useProfile();
  const now = useNow(1000);
  const [finish, setFinish] = useState(false);
  const session = sessionsQ.items.find((s) => s.status === "active" || s.status === "paused");
  const [openId, setOpenId] = useState<string | null>(null);
  const catalogue = useCatalogue();
  const normalise = (value: string) => value.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "");
  const byName = useMemo(
    () => new Map(catalogue.exercises.map((item) => [normalise(item.name), item])),
    [catalogue.exercises],
  );

  useWakeLock(!!profile?.wakeLock && session?.status === "active");
  useEffect(() => {
    if (session && openId == null) {
      const first =
        session.exercises.find((e) =>
          e.sets.some((s) => s.kind === "working" && !s.completed && !s.skipped),
        ) ?? session.exercises[0];
      setOpenId(first?.id ?? null);
    }
  }, [session, openId]);

  if (!sessionsQ.ready) return <Skeleton className="h-64" />;
  if (!session) {
    return (
      <EmptyState
        title="No session in progress"
        body="Start one from Train or Today."
        action={
          <Link
            to="/train"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground"
          >
            Go to Train
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <Link
        to="/train"
        className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Leave (session stays saved)
      </Link>
      <SessionHeader session={session} now={now} />
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
            media={
              (ex.catalogueId ? catalogue.byId.get(ex.catalogueId) : undefined)?.media[0] ??
              byName.get(normalise(ex.name))?.media[0]
            }
          />
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line px-4 pb-[calc(0.75rem+var(--safe-bottom))] pt-3 backdrop-blur-xl [background:color-mix(in_oklab,var(--background)_90%,transparent)] lg:left-[15.5rem]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="min-h-11 min-w-0 flex-1">
            {session.rest ? (
              <RestBar session={session} now={now} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Rest timer starts when you tick a set.
              </p>
            )}
          </div>
          <Button variant="primary" onClick={() => setFinish(true)}>
            <Flag className="size-4" />
            Finish
          </Button>
        </div>
      </div>
      <FinishSheet
        open={finish}
        onOpenChange={setFinish}
        session={session}
        onDone={() => nav({ to: "/train" })}
      />
    </div>
  );
}
