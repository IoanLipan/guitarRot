/**
 * The leaderboard's weeks: ISO 8601 (Monday first, week 1 holds the year's
 * first Thursday), counted in UTC so that everybody's week turns over at the
 * same moment wherever they are. A week is named `YYYY-Www` (`2026-W44`); the
 * year is the ISO week-year, so the last days of December can belong to
 * `W01` of the next year and the first days of January to `W52` or `W53`.
 */

/** What a valid week key looks like. The Firestore rules check the same shape. */
export const WEEK_KEY = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoWeekKey(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Move to the Thursday of this week (Sunday counts as day 7): the year it falls in is the week's year.
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  const week = Math.ceil(((day.getTime() - Date.UTC(year, 0, 1)) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
