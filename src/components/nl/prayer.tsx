import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button, Chip, Row } from "./ui";
import { logPrayer, unlogPrayer } from "@/data/actions";
import type { PrayerLog } from "@/data/types";
import { formatClock, type ISODate } from "@/domain/dates";
import {
  PRAYER_LABEL,
  PRAYERS,
  prayerInstant,
  type PrayerDay,
  type PrayerName,
} from "@/domain/prayer";

/** Five prayers for a date with neutral logging. Unlogged is just "Not logged". */
export function PrayerList({
  day,
  date,
  logs,
  tz,
  now,
  showIqamah,
}: {
  day: PrayerDay;
  date: ISODate;
  logs: PrayerLog[];
  tz: string;
  now: number;
  showIqamah?: boolean;
}) {
  return (
    <ul>
      {day.start.sunrise && (
        <Row as="li" className="justify-between text-muted-foreground">
          <span>Sunrise</span>
          <span className="tnum">{day.start.sunrise}</span>
        </Row>
      )}
      {PRAYERS.map((p) => {
        const log = logs.find((l) => l.id === `${date}:${p}`);
        const at = prayerInstant(day, p, tz);
        const started = at <= now;
        return (
          <Row as="li" key={p} className="justify-between">
            <div>
              <p className="font-medium">{PRAYER_LABEL[p]}</p>
              <p className="text-sm text-muted-foreground tnum">
                Starts {day.start[p]}
                {showIqamah && day.iqamah?.[p] ? ` · Jamaat ${day.iqamah[p]}` : ""}
                {log
                  ? ` · Prayed ${formatClock(log.prayedAt, tz)}${log.backdated ? " (added later)" : ""}`
                  : ""}
              </p>
            </div>
            <PrayedButton date={date} prayer={p} log={log} canLog={started} day={day} />
          </Row>
        );
      })}
    </ul>
  );
}

export function PrayedButton({
  date,
  prayer,
  log,
  canLog = true,
  day,
}: {
  date: ISODate;
  prayer: PrayerName;
  log?: PrayerLog;
  canLog?: boolean;
  day?: PrayerDay;
}) {
  if (log) {
    return (
      <div className="flex items-center gap-1">
        <Chip tone="ok" icon={<Check className="size-3.5" />}>
          Prayed
        </Chip>
        <button
          aria-label={`Undo ${PRAYER_LABEL[prayer]}`}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
          onClick={async () => {
            await unlogPrayer(date, prayer);
            toast("Prayer unmarked");
          }}
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={!canLog}
      onClick={async () => {
        await logPrayer(date, prayer, {
          sourceSnapshot: day
            ? { sourceId: day.sourceId, startTime: day.start[prayer] }
            : undefined,
        });
        toast.success(`${PRAYER_LABEL[prayer]} recorded`);
      }}
    >
      Prayed
    </Button>
  );
}

export { PRAYERS };
