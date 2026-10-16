import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, NumberField, Segmented, Select, Sheet, TextArea, TextInput } from "./ui";
import {
  DEFAULT_PRAYER_SETTINGS,
  refreshPrayerTimes,
  saveManualDay,
  savePrayerSettings,
  sourceIdOf,
} from "@/data/prayer";
import { bulkPut } from "@/data/db";
import { COL, type PrayerSettings } from "@/data/types";
import { parseTimetablePaste } from "@/domain/timetable";
import { PRAYER_LABEL, PRAYERS, type PrayerName } from "@/domain/prayer";
import { localDate, type ISODate } from "@/domain/dates";
import { PRAYER_METHODS } from "@/domain/prayer-methods";

const METHODS = PRAYER_METHODS;

export function SalahSettingsSheet({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings?: PrayerSettings;
}) {
  const base = settings ?? DEFAULT_PRAYER_SETTINGS;
  const [s, setS] = useState<PrayerSettings>(base);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(false);
  if (open && !seen) {
    setSeen(true);
    setS(settings ?? DEFAULT_PRAYER_SETTINGS);
  }
  if (!open && seen) setSeen(false);
  const set = <K extends keyof PrayerSettings>(k: K, v: PrayerSettings[K]) =>
    setS((o) => ({ ...o, [k]: v }));
  const adj = (p: PrayerName, v: number | undefined) =>
    set("adjustments", { ...(s.adjustments ?? {}), [p]: v ?? 0 });

  const save = async () => {
    setBusy(true);
    try {
      const saved = await savePrayerSettings(s, settings);
      if (saved.mode === "aladhan") {
        try {
          await refreshPrayerTimes(saved, localDate(Date.now(), saved.timezone));
          toast.success("Saved. Prayer times updated.");
        } catch (e) {
          toast.warning(`Saved, but times couldn't be fetched: ${(e as Error).message}`);
        }
      } else toast.success("Saved. Enter your mosque's times below.");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Prayer time source"
      description="Calculated times are a method's output and may differ from your mosque. Use manual times to match a timetable exactly."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          busy={busy}
          disabled={!s.locality.trim()}
          onClick={save}
        >
          Save and update times
        </Button>
      }
    >
      <div className="grid gap-5 pb-4">
        <Field label="Source">
          <Segmented
            label="Source"
            value={s.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "aladhan", label: "Calculated (AlAdhan)" },
              { value: "manual", label: "My mosque / manual" },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Town or city" htmlFor="ps-city">
            <TextInput
              id="ps-city"
              value={s.locality}
              onChange={(e) => set("locality", e.target.value)}
            />
          </Field>
          <Field label="Country" htmlFor="ps-country">
            <TextInput
              id="ps-country"
              value={s.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Timezone"
          hint="Europe/London handles clock changes. Change it only when you travel."
          htmlFor="ps-tz"
        >
          <TextInput
            id="ps-tz"
            value={s.timezone}
            onChange={(e) => set("timezone", e.target.value)}
          />
        </Field>
        <Field label="Mosque name (optional)" htmlFor="ps-m">
          <TextInput
            id="ps-m"
            value={s.mosqueName ?? ""}
            onChange={(e) => set("mosqueName", e.target.value)}
          />
        </Field>
        {s.mode === "aladhan" && (
          <>
            <Field
              label="Calculation method"
              hint="Different methods give different Fajr and Isha angles. Check against your mosque."
              htmlFor="ps-method"
            >
              <Select
                id="ps-method"
                value={s.method}
                onChange={(e) => set("method", Number(e.target.value))}
              >
                {METHODS.map(([id, n]) => (
                  <option key={id} value={id}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Asr convention" htmlFor="ps-asr">
              <Select
                id="ps-asr"
                value={s.school}
                onChange={(e) => set("school", Number(e.target.value) as 0 | 1)}
              >
                <option value={0}>Standard (Shafi, Maliki, Hanbali)</option>
                <option value={1}>Hanafi</option>
              </Select>
            </Field>
            <Field
              label="High-latitude handling"
              hint="Affects Fajr and Isha in summer at UK latitudes."
              htmlFor="ps-lat"
            >
              <Select
                id="ps-lat"
                value={s.latitudeAdjustmentMethod}
                onChange={(e) =>
                  set("latitudeAdjustmentMethod", Number(e.target.value) as 1 | 2 | 3)
                }
              >
                <option value={3}>Angle based</option>
                <option value={1}>Middle of the night</option>
                <option value={2}>One-seventh of the night</option>
              </Select>
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Minute adjustments</legend>
              <p className="mb-2 text-xs text-muted-foreground">
                Applied on top of calculated times, for example +2 to match a timetable.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PRAYERS.map((p) => (
                  <div key={p} className="flex items-center justify-between gap-2">
                    <span className="w-16 text-sm">{PRAYER_LABEL[p]}</span>
                    <NumberField
                      label={`${PRAYER_LABEL[p]} adjustment`}
                      unit="min"
                      min={-30}
                      max={30}
                      step={1}
                      decimals={0}
                      value={s.adjustments?.[p] ?? 0}
                      onChange={(v) => adj(p, v)}
                      className="w-44"
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Changing the source or method clears cached times that used the old one. Your prayer logs
          and their original times are kept.
        </p>
      </div>
    </Sheet>
  );
}

export function ManualDaySheet({
  open,
  onOpenChange,
  date,
  settings,
  current,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: ISODate;
  settings: PrayerSettings;
  current?: {
    start: Record<PrayerName, string> & { sunrise?: string };
    iqamah?: Partial<Record<PrayerName, string>>;
    jumuah?: string;
  };
}) {
  const [tab, setTab] = useState<"day" | "paste">("day");
  const empty = { fajr: "", sunrise: "", dhuhr: "", asr: "", maghrib: "", isha: "" } as Record<
    string,
    string
  >;
  const [t, setT] = useState<Record<string, string>>(
    current ? { ...empty, ...current.start } : empty,
  );
  const [iq, setIq] = useState<Record<string, string>>({ ...(current?.iqamah ?? {}) });
  const [jumuah, setJumuah] = useState(current?.jumuah ?? "");
  const [paste, setPaste] = useState("");
  const [errs, setErrs] = useState<string[]>([]);
  const [seen, setSeen] = useState(false);
  if (open && !seen) {
    setSeen(true);
    setT(current ? { ...empty, ...current.start } : empty);
    setIq({ ...(current?.iqamah ?? {}) });
    setJumuah(current?.jumuah ?? "");
    setErrs([]);
  }
  if (!open && seen) setSeen(false);
  const ok = (v: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);
  const complete = PRAYERS.every((p) => ok(t[p] ?? ""));

  const saveDay = async () => {
    await saveManualDay(
      {
        date,
        start: {
          fajr: t.fajr!,
          dhuhr: t.dhuhr!,
          asr: t.asr!,
          maghrib: t.maghrib!,
          isha: t.isha!,
          sunrise: ok(t.sunrise ?? "") ? t.sunrise : undefined,
        },
        iqamah: Object.fromEntries(PRAYERS.filter((p) => ok(iq[p] ?? "")).map((p) => [p, iq[p]])),
        jumuah: jumuah.trim() || undefined,
      } as never,
      settings,
    );
    toast.success("Times saved for this date");
    onOpenChange(false);
  };
  const savePaste = async () => {
    const year = Number(date.slice(0, 4));
    const { days, errors } = parseTimetablePaste(paste, year, sourceIdOf(settings));
    setErrs(errors);
    if (days.length === 0) return;
    await bulkPut(
      days.map((d) => ({
        collection: COL.prayerDays,
        id: d.date,
        data: { ...d, origin: "manual", fetchedAt: Date.now() },
      })),
      { overwrite: true },
    );
    toast.success(
      `Saved ${days.length} days${errors.length ? `, ${errors.length} lines skipped` : ""}`,
    );
    if (!errors.length) onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Enter prayer times"
      description="Start times and congregation (jamaat) times are stored separately."
      footer={
        tab === "day" ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!complete}
            onClick={saveDay}
          >
            Save times for {date}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!paste.trim()}
            onClick={savePaste}
          >
            Import timetable
          </Button>
        )
      }
    >
      <div className="grid gap-4 pb-4">
        <Segmented
          label="Entry"
          value={tab}
          onChange={setTab}
          options={[
            { value: "day", label: "One day" },
            { value: "paste", label: "Paste a timetable" },
          ]}
        />
        {tab === "day" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sunrise (optional)">
                <TextInput
                  inputMode="numeric"
                  placeholder="07:28"
                  value={t.sunrise}
                  onChange={(e) => setT({ ...t, sunrise: e.target.value })}
                />
              </Field>
              <div />
              {PRAYERS.map((p) => (
                <div key={p} className="contents">
                  <Field
                    label={`${PRAYER_LABEL[p]} starts`}
                    error={t[p] && !ok(t[p]!) ? "Use 24-hour HH:MM" : undefined}
                  >
                    <TextInput
                      inputMode="numeric"
                      placeholder="HH:MM"
                      value={t[p]}
                      onChange={(e) => setT({ ...t, [p]: e.target.value })}
                    />
                  </Field>
                  <Field label={`${PRAYER_LABEL[p]} jamaat (optional)`}>
                    <TextInput
                      inputMode="numeric"
                      placeholder="HH:MM"
                      value={iq[p] ?? ""}
                      onChange={(e) => setIq({ ...iq, [p]: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
            </div>
            <Field
              label="Jumu'ah details (optional)"
              hint="Entered from your mosque. Kept separate from Dhuhr."
              htmlFor="ms-j"
            >
              <TextInput
                id="ms-j"
                value={jumuah}
                onChange={(e) => setJumuah(e.target.value)}
                placeholder="e.g. Khutbah 1:15 pm, second jamaat 2:00 pm"
              />
            </Field>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              One line per day:{" "}
              <code className="rounded bg-surface-2 px-1">
                16/10 05:52 07:28 12:47 15:33 18:06 19:29
              </code>{" "}
              (Fajr, sunrise, Dhuhr, Asr, Maghrib, Isha). Sunrise is optional. Year defaults to{" "}
              {date.slice(0, 4)}.
            </p>
            <TextArea
              aria-label="Timetable"
              className="min-h-56 font-mono text-sm"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            {errs.length > 0 && (
              <ul role="alert" className="text-sm text-destructive">
                {errs.slice(0, 6).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
