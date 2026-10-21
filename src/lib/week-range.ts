import type { ISODate } from "@/domain/dates";

const part = (date: ISODate, opts: Intl.DateTimeFormatOptions) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
};

/** "19 – 25 Oct", or "28 Oct – 3 Nov" when the week crosses a month. */
export function weekRangeLabel(first: ISODate, last: ISODate) {
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return sameMonth
    ? `${part(first, { day: "numeric" })} – ${part(last, { day: "numeric", month: "short" })}`
    : `${part(first, { day: "numeric", month: "short" })} – ${part(last, { day: "numeric", month: "short" })}`;
}
