import { describe, expect, it } from 'vitest';
import {
  PRACTICE_KEEP_DAYS,
  activeDayStreak,
  addPracticeDay,
  advanceDayStreak,
  dayStreakFromDays,
} from './practice';
import type { DayStreak } from './types';

const NONE: DayStreak = { current: 0, longest: 0, lastDate: null };

describe('addPracticeDay', () => {
  it('adds the day, keeping the list sorted', () => {
    expect(addPracticeDay(['2026-10-20', '2026-10-28'], '2026-10-30')).toEqual([
      '2026-10-20',
      '2026-10-28',
      '2026-10-30',
    ]);
  });

  it('does not repeat a day already there', () => {
    expect(addPracticeDay(['2026-10-29', '2026-10-30'], '2026-10-30')).toEqual(['2026-10-29', '2026-10-30']);
  });

  it('forgets days beyond the keep window and no others', () => {
    const edge = '2025-09-25'; // exactly PRACTICE_KEEP_DAYS before 2026-10-30
    expect(PRACTICE_KEEP_DAYS).toBe(400);
    expect(addPracticeDay(['2025-09-24', edge, '2026-10-01'], '2026-10-30')).toEqual([
      edge,
      '2026-10-01',
      '2026-10-30',
    ]);
  });

  it('does not mutate its input', () => {
    const days = ['2026-10-01'];
    addPracticeDay(days, '2026-10-02');
    expect(days).toEqual(['2026-10-01']);
  });
});

describe('advanceDayStreak', () => {
  it('starts a streak at 1 on the first day ever', () => {
    expect(advanceDayStreak(NONE, '2026-10-30')).toEqual({ current: 1, longest: 1, lastDate: '2026-10-30' });
  });

  it('extends it the next day', () => {
    const day1 = advanceDayStreak(NONE, '2026-10-30');
    expect(advanceDayStreak(day1, '2026-10-31')).toEqual({ current: 2, longest: 2, lastDate: '2026-10-31' });
  });

  it('leaves it alone for a second practice on the same day', () => {
    const day1 = advanceDayStreak(NONE, '2026-10-30');
    expect(advanceDayStreak(day1, '2026-10-30')).toEqual(day1);
  });

  it('carries on across the end of a month', () => {
    const streak = advanceDayStreak({ current: 4, longest: 4, lastDate: '2026-01-31' }, '2026-02-01');
    expect(streak).toEqual({ current: 5, longest: 5, lastDate: '2026-02-01' });
  });

  it('carries on across the end of a year', () => {
    const streak = advanceDayStreak({ current: 29, longest: 29, lastDate: '2026-12-31' }, '2027-01-01');
    expect(streak.current).toBe(30);
  });

  it('carries on across a leap day', () => {
    expect(advanceDayStreak({ current: 2, longest: 2, lastDate: '2028-02-28' }, '2028-02-29').current).toBe(3);
    expect(advanceDayStreak({ current: 3, longest: 3, lastDate: '2028-02-29' }, '2028-03-01').current).toBe(4);
  });

  it('carries on over a clock change', () => {
    expect(advanceDayStreak({ current: 6, longest: 6, lastDate: '2026-03-28' }, '2026-03-29').current).toBe(7);
    expect(advanceDayStreak({ current: 7, longest: 7, lastDate: '2026-03-29' }, '2026-03-30').current).toBe(8);
  });

  it('starts over at 1 after a missed day, and keeps the longest', () => {
    const streak = advanceDayStreak({ current: 8, longest: 8, lastDate: '2026-10-27' }, '2026-10-29');
    expect(streak).toEqual({ current: 1, longest: 8, lastDate: '2026-10-29' });
  });

  it('does not treat a last date in the future as a gap', () => {
    const skewed: DayStreak = { current: 5, longest: 5, lastDate: '2026-11-05' };
    expect(advanceDayStreak(skewed, '2026-10-30')).toBe(skewed);
  });
});

describe('activeDayStreak', () => {
  const streak: DayStreak = { current: 5, longest: 9, lastDate: '2026-10-28' };

  it('shows the streak on the day it was last extended', () => {
    expect(activeDayStreak(streak, '2026-10-28')).toBe(5);
  });

  it('still shows it the day after, while there is time to extend it', () => {
    expect(activeDayStreak(streak, '2026-10-29')).toBe(5);
  });

  it('shows 0 once a whole day has been missed', () => {
    expect(activeDayStreak(streak, '2026-10-30')).toBe(0);
  });

  it('is 0 before any practice', () => {
    expect(activeDayStreak(NONE, '2026-10-30')).toBe(0);
  });
});

describe('dayStreakFromDays', () => {
  it('is empty for no days', () => {
    expect(dayStreakFromDays([])).toEqual(NONE);
  });

  it('finds the current and the longest run, whatever order the days come in', () => {
    const days = ['2026-10-26', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-27', '2026-10-21'];
    expect(dayStreakFromDays(days)).toEqual({ current: 2, longest: 3, lastDate: '2026-10-27' });
  });

  it('runs on across a month boundary', () => {
    expect(dayStreakFromDays(['2026-09-29', '2026-09-30', '2026-10-01']).current).toBe(3);
  });
});
