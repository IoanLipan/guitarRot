import { addDays, daysBetween } from './dates';
import type { DayStreak } from './types';

/** Practice days kept; older ones no longer change what a streak can be. */
export const PRACTICE_KEEP_DAYS = 400;

/** Adds `today` to the sorted list of practice days, dropping any past the keep window. */
export function addPracticeDay(
  days: readonly string[],
  today: string,
  keepDays: number = PRACTICE_KEEP_DAYS,
): string[] {
  const cutoff = addDays(today, -keepDays);
  const kept = days.filter((day) => day >= cutoff && day !== today);
  return [...kept, today].sort();
}

/**
 * Counts `today` as a practice day. Practising again the same day changes
 * nothing; the day after the last one extends the streak; a gap starts it
 * over at 1. A last date in the future (a clock that was wrong and has since
 * been corrected) is left alone rather than treated as a gap, so a bad
 * clock cannot cost anybody a streak.
 */
export function advanceDayStreak(streak: DayStreak, today: string): DayStreak {
  const { lastDate } = streak;
  if (lastDate !== null && lastDate >= today) return streak;

  const continues = lastDate !== null && daysBetween(lastDate, today) === 1;
  const current = continues ? streak.current + 1 : 1;
  return { current, longest: Math.max(streak.longest, current), lastDate: today };
}

/**
 * The streak to show on `today`. The stored `current` only changes when
 * somebody practises, so after a missed day it is stale: it still reads 5
 * when the streak has in fact already ended.
 */
export function activeDayStreak(streak: DayStreak, today: string): number {
  const { lastDate } = streak;
  if (lastDate === null) return 0;
  return daysBetween(lastDate, today) <= 1 ? streak.current : 0;
}

/** Rebuilds the streak from a list of practice days, as when migrating older progress. */
export function dayStreakFromDays(days: readonly string[]): DayStreak {
  let streak: DayStreak = { current: 0, longest: 0, lastDate: null };
  for (const day of [...new Set(days)].sort()) streak = advanceDayStreak(streak, day);
  return { ...streak };
}
