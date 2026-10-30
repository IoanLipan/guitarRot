/**
 * Calendar-date helpers for the day streak and the daily tallies.
 *
 * A date here is always a plain `YYYY-MM-DD` string, and every sum or
 * difference of dates is done on UTC day numbers. Doing it on local
 * midnights instead breaks twice a year, when a day is 23 or 25 hours long
 * and "tomorrow" is no longer `+ 24 hours`.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The calendar date on the device's own clock. This is the date the player
 * means by "today": one practised at 00:30 local time counts for the new
 * day, whatever UTC says.
 */
export function localDateIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** A real calendar date in `YYYY-MM-DD` form: `2026-02-30` is not one. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
  );
}

function dayNumber(iso: string): number {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(iso: string, days: number): string {
  return new Date((dayNumber(iso) + days) * MS_PER_DAY).toISOString().slice(0, 10);
}
