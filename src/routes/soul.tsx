import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MoonStar } from "lucide-react";
import { MindHistory, PrivacyNote, ReflectPanel } from "@/components/nl/mind";
import { Button, PageHeader, Panel, Skeleton } from "@/components/nl/ui";
import { useSalahEnabled } from "@/data/agenda";
import { useNow, useToday } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import { setSalahEnabled } from "@/data/routine-actions";
import { formatClock, localMinutes } from "@/domain/dates";
import { PRAYER_LABEL, PRAYERS, nextPrayer } from "@/domain/prayer";

export const Route = createFileRoute("/soul")({ component: SoulPage });

function SoulPage() {
  const nav = useNavigate();
  const now = useNow(30_000);
  const date = useToday();
  const salah = useSalahEnabled();
  const prayer = usePrayer(now);
  if (!salah.ready || !prayer.ready) return <Skeleton className="h-64" />;
  const todayLogged = prayer.logs.filter((l) => l.date === prayer.today).length;
  const next = prayer.configured ? nextPrayer(now, prayer.lookup, prayer.tz) : null;
  void localMinutes;
  return (
    <>
      <PageHeader
        eyebrow="Soul"
        title="Still point"
        sub="Optional prayer routines and quiet reflection."
      />
      {salah.enabled ? (
        <Panel aria-label="Salah" className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow">Salah</p>
            <Button variant="ghost" size="sm" onClick={() => void setSalahEnabled(false)}>
              Turn off
            </Button>
          </div>
          {!prayer.configured ? (
            <>
              <h2 className="mt-1 font-display text-2xl font-bold">
                Choose how to get prayer times
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a locality and method, or enter your mosque's timetable.
              </p>
              <div className="mt-4">
                <Link
                  to="/salah"
                  className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
                >
                  Set up Salah
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-1 font-display text-3xl font-extrabold tnum">
                {todayLogged} of {PRAYERS.length} prayed today
              </h2>
              {next?.status === "ok" && (
                <p className="mt-1">
                  Next: <strong>{PRAYER_LABEL[next.prayer]}</strong> at{" "}
                  {formatClock(next.at, prayer.tz)}
                  {next.isTomorrow ? " (tomorrow)" : ""}
                </p>
              )}
              <div className="mt-4">
                <Link
                  to="/salah"
                  className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-semibold hover:bg-surface-2"
                >
                  Open Salah
                </Link>
              </div>
            </>
          )}
          <div className="mt-3">
            <PrivacyNote what="Your prayer record" />
          </div>
        </Panel>
      ) : (
        <Panel aria-label="Salah is optional" className="mb-4">
          <MoonStar className="size-6 text-primary" aria-hidden />
          <h2 className="mt-2 font-display text-2xl font-bold">Salah is optional</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            If you pray, VAYVOR can show prayer times on Today, remind you and keep a private
            record. If not, nothing about prayer appears anywhere.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                await setSalahEnabled(true);
                nav({ to: "/salah" });
              }}
            >
              Turn on Salah
            </Button>
            <Button onClick={() => void setSalahEnabled(false)}>Not for me</Button>
          </div>
        </Panel>
      )}
      <ReflectPanel date={date} space="soul" />
      <div className="mt-6">
        <MindHistory space="soul" kinds={["reflection"]} />
      </div>
    </>
  );
}
