import { createFileRoute, Link } from "@tanstack/react-router";
import { MindHistory, PrivacyNote, ReflectPanel } from "@/components/nl/mind";
import { Button, PageHeader, Panel, Skeleton } from "@/components/nl/ui";
import { useSalahEnabled } from "@/data/agenda";
import { useNow, useProfile, useToday } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import { setSalahEnabled } from "@/data/routine-actions";
import { formatClock, localMinutes } from "@/domain/dates";
import { PRAYER_LABEL, PRAYERS, nextPrayer } from "@/domain/prayer";
import { hasIslamicPrayerPack, resolveFaithProfile } from "@/domain/faith";
import { VIcon } from "@/components/nl/icon";

export const Route = createFileRoute("/soul")({ component: SoulPage });

function SoulPage() {
  const now = useNow(30_000);
  const date = useToday();
  const salah = useSalahEnabled();
  const prayer = usePrayer(now);
  const { profile, ready: profileReady } = useProfile();
  if (!salah.ready || !prayer.ready || !profileReady || !profile)
    return <Skeleton className="h-64" />;
  const prayerPack = hasIslamicPrayerPack(resolveFaithProfile(profile));
  const todayLogged = prayer.logs.filter((l) => l.date === prayer.today).length;
  const next = prayer.configured ? nextPrayer(now, prayer.lookup, prayer.tz) : null;
  void localMinutes;
  return (
    <>
      <PageHeader
        title="Soul"
        sub="Quiet reflection and your own practices. No tradition is assumed."
      />
      {prayerPack && salah.enabled ? (
        <Panel aria-label="Salah" className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <VIcon name="spirituality" size={20} />
              </span>
              <h2 className="text-lg font-semibold tracking-tight">Salah</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void setSalahEnabled(false)}>
              Turn off
            </Button>
          </div>
          {!prayer.configured ? (
            <>
              <p className="mt-4 text-2xl font-bold leading-tight tracking-tight">
                Choose how to get prayer times
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a locality and method, or enter your mosque's timetable.
              </p>
              <Link
                to="/salah"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground sm:w-fit"
              >
                Set up Salah
              </Link>
            </>
          ) : (
            <>
              <p className="tnum mt-4 text-3xl font-bold tracking-tight">
                {todayLogged} of {PRAYERS.length} prayed today
              </p>
              {next?.status === "ok" && (
                <p className="mt-1 text-muted-foreground">
                  Next: <strong className="text-foreground">{PRAYER_LABEL[next.prayer]}</strong> at{" "}
                  {formatClock(next.at, prayer.tz)}
                  {next.isTomorrow ? " (tomorrow)" : ""}
                </p>
              )}
              <Link
                to="/salah"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-surface-2 px-6 font-semibold sm:w-fit"
              >
                Open Salah
              </Link>
            </>
          )}
          <div className="mt-3">
            <PrivacyNote what="Your prayer record" />
          </div>
        </Panel>
      ) : prayerPack ? (
        <Panel aria-label="Islamic prayer practice" className="mb-4">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary"
          >
            <VIcon name="spirituality" size={20} />
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Islamic prayer practice</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            If you pray, VAYVOR can show prayer times on Today, remind you and keep a private
            record. If not, nothing about prayer appears anywhere.
          </p>
          <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
            <Button variant="primary" onClick={() => void setSalahEnabled(true)}>
              Turn on Salah
            </Button>
            <Button onClick={() => void setSalahEnabled(false)}>Not for me</Button>
          </div>
        </Panel>
      ) : null}
      <div className="mb-6">
        <ReflectPanel date={date} space="soul" />
      </div>
      <MindHistory space="soul" kinds={["reflection"]} />
    </>
  );
}
