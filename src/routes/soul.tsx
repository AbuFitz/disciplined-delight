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
        eyebrow="Faith & reflection"
        title="A private pause"
        sub="Your selected practices and quiet reflection. No tradition is assumed."
      />
      {prayerPack && salah.enabled ? (
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
      ) : prayerPack ? (
        <Panel aria-label="Islamic prayer practice" className="mb-4">
          <VIcon name="spirituality" size={24} className="text-primary" />
          <h2 className="mt-2 font-display text-2xl font-bold">Islamic prayer practice</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            If you pray, VAYVOR can show prayer times on Today, remind you and keep a private
            record. If not, nothing about prayer appears anywhere.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void setSalahEnabled(true)}>
              Turn on Salah
            </Button>
            <Button onClick={() => void setSalahEnabled(false)}>Not for me</Button>
          </div>
        </Panel>
      ) : null}
      <ReflectPanel date={date} space="soul" />
      <div className="mt-6">
        <MindHistory space="soul" kinds={["reflection"]} />
      </div>
    </>
  );
}
