import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  Section,
  Skeleton,
} from "@/components/nl/ui";
import { PrayerList } from "@/components/nl/prayer";
import { ManualDaySheet, SalahSettingsSheet } from "@/components/nl/salah-setup";
import { PRAYER_METHODS as METHODS } from "@/domain/prayer-methods";
import { useNow } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import { addDays, formatClock, formatDateLong, weekdayIndex, type ISODate } from "@/domain/dates";
import { formatCountdown, nextPrayer, PRAYER_LABEL, PRAYERS } from "@/domain/prayer";

export const Route = createFileRoute("/salah")({ component: SalahPage });

function SalahPage() {
  const now = useNow(30_000);
  const p = usePrayer(now);
  const [date, setDate] = useState<ISODate | null>(null);
  const [settings, setSettings] = useState(false);
  const [manual, setManual] = useState(false);
  const d = date ?? p.today;
  const day = p.lookup(d);
  const next = p.configured ? nextPrayer(now, p.lookup, p.tz) : null;
  const isFriday = weekdayIndex(d) === 4;
  const methodName = METHODS.find(([id]) => id === p.settings?.method)?.[1];

  const history = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => addDays(p.today, -i));
    const logged = days.map(
      (x) => PRAYERS.filter((pr) => p.logs.some((l) => l.id === `${x}:${pr}`)).length,
    );
    return { days, logged, total: logged.reduce((a, b) => a + b, 0) };
  }, [p.logs, p.today]);

  if (!p.ready) return <Skeleton className="h-72" />;

  if (!p.configured) {
    return (
      <>
        <PageHeader
          title="Salah"
          sub="Nothing is assumed: times come from the method you pick or your mosque's own timetable."
        />
        <Panel tone="dusk" className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight">Set up your prayer times</h2>
          <p className="mt-2 text-foreground/80">
            Use a calculation method for your town, or enter your mosque's timetable. Your logs stay
            private to your account and never enter Circle.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full sm:w-fit"
            onClick={() => setSettings(true)}
          >
            Choose a source
          </Button>
        </Panel>
        <SalahSettingsSheet open={settings} onOpenChange={setSettings} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Salah"
        actions={
          <IconButton label="Source and method" onClick={() => setSettings(true)}>
            <Settings2 className="size-5" />
          </IconButton>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-5">
          {next?.status === "ok" && (
            <Panel tone="dusk">
              <p className="text-sm font-semibold text-foreground/70">Next prayer</p>
              <p className="mt-1 text-5xl font-bold tracking-tight sm:text-6xl">
                {PRAYER_LABEL[next.prayer]}
              </p>
              <p className="tnum mt-2 text-xl">
                {formatClock(next.at, p.tz)}{" "}
                <span className="text-foreground/70">
                  · in {formatCountdown(next.at - now)}
                  {next.isTomorrow ? " (tomorrow)" : ""}
                </span>
              </p>
            </Panel>
          )}
          <section aria-label="Prayers for the selected day">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center">
                <IconButton
                  label="Previous day"
                  className="bg-surface/80"
                  onClick={() => setDate(addDays(d, -1))}
                >
                  <ChevronLeft className="size-5" />
                </IconButton>
                <h2 className="min-w-0 px-3 text-center text-lg font-semibold tracking-tight sm:min-w-44">
                  {d === p.today ? "Today" : formatDateLong(d)}
                </h2>
                <IconButton
                  label="Next day"
                  className="bg-surface/80"
                  onClick={() => setDate(addDays(d, 1))}
                >
                  <ChevronRight className="size-5" />
                </IconButton>
              </div>
              {d !== p.today && (
                <Button size="sm" variant="ghost" onClick={() => setDate(null)}>
                  Back to today
                </Button>
              )}
            </div>
            {day ? (
              <>
                <div className="rounded-3xl bg-surface/80 px-4">
                  <PrayerList
                    day={day}
                    date={d}
                    logs={p.logs}
                    tz={p.tz}
                    now={d < p.today ? Infinity : now}
                    showIqamah
                  />
                </div>
                <p className="mt-3 px-1 text-sm text-muted-foreground">
                  {day.origin === "manual"
                    ? `Your timetable${p.settings?.mosqueName ? ` (${p.settings.mosqueName})` : ""}`
                    : `Calculated: ${methodName}, ${p.settings!.school ? "Hanafi" : "standard"} Asr, ${p.settings!.locality}`}
                  . Tap Prayed to record; past days can be filled in.
                </p>
                {isFriday &&
                  (day.jumuah ? (
                    <p className="mt-2 rounded-2xl bg-surface/80 p-3 text-sm">
                      <strong>Jumu'ah:</strong> {day.jumuah}
                    </p>
                  ) : (
                    <p className="mt-2 px-1 text-sm text-muted-foreground">
                      Add Jumu'ah details from your mosque with "Enter times".
                    </p>
                  ))}
              </>
            ) : (
              <EmptyState
                title="No prayer times for this date"
                body={
                  p.error ??
                  (p.settings?.mode === "manual"
                    ? "Enter your mosque's times for this date."
                    : "Times haven't been saved for this date. Fetch them when you're online or enter them yourself. Other days' times aren't reused.")
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {p.settings?.mode === "aladhan" && (
                      <Button variant="primary" size="sm" busy={p.refreshing} onClick={p.refresh}>
                        Fetch times
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setManual(true)}>
                      Enter times
                    </Button>
                  </div>
                }
              />
            )}
            {day && (
              <div className="mt-2">
                <Button variant="ghost" size="sm" onClick={() => setManual(true)}>
                  {day.origin === "manual"
                    ? "Edit these times"
                    : "Enter times manually for this date"}
                </Button>
              </div>
            )}
          </section>
        </div>

        <aside aria-label="Private history" className="content-start">
          <Section title="Last 14 days" className="mb-3">
            <Panel>
              <p className="tnum text-sm text-muted-foreground">
                {history.total} of {history.days.length * 5} prayers logged. Private; blank days
                just mean nothing was recorded.
              </p>
              <ul className="mt-3 grid grid-cols-7 gap-1.5">
                {history.days
                  .slice()
                  .reverse()
                  .map((x, i) => {
                    const n = history.logged[history.days.length - 1 - i]!;
                    return (
                      <li
                        key={x}
                        className={`rounded-xl p-1.5 text-center ${n ? "bg-primary/15" : "bg-surface-2"}`}
                        aria-label={`${formatDateLong(x)}: ${n} of 5 logged`}
                      >
                        <p className="text-[0.6rem] text-muted-foreground">{x.slice(8)}</p>
                        <p className="tnum text-sm font-semibold">{n || "·"}</p>
                      </li>
                    );
                  })}
              </ul>
            </Panel>
          </Section>
          {p.settings && (
            <div className="flex flex-wrap gap-2">
              <Chip>{p.settings.locality}</Chip>
              <Chip>{p.settings.timezone}</Chip>
            </div>
          )}
        </aside>
      </div>
      <SalahSettingsSheet open={settings} onOpenChange={setSettings} settings={p.settings} />
      {p.settings && (
        <ManualDaySheet
          open={manual}
          onOpenChange={setManual}
          date={d}
          settings={p.settings}
          current={day as never}
        />
      )}
    </>
  );
}
