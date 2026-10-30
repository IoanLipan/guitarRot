import { emptyProgressState, type ProgressState } from '@/progress';

/** The day the game-surface tests pretend it is. A Friday, so a week back from it crosses a weekend. */
export const TODAY = '2026-10-30';

/**
 * A mid-game player for the screens' tests: level 3 (340 XP), a streak of two
 * days that missed the 27th and the 29th, a bit of every kind of progress,
 * and one pick of each tier earned.
 */
export function midGameState(overrides: Partial<ProgressState> = {}): ProgressState {
  const base = emptyProgressState();
  return {
    ...base,
    xp: 340,
    streak: { current: 4, longest: 18, lastActiveDate: TODAY },
    practiceDays: ['2026-10-25', '2026-10-26', '2026-10-28', TODAY],
    dayStreak: { current: 1, longest: 12, lastDate: TODAY },
    achievements: {
      'first-lesson': '2026-10-02',
      'first-song': '2026-10-12',
      'streak-25': '2026-10-20',
      'days-30': '2026-10-21',
    },
    quizBests: {
      easy: { best: 620, stars: 3, runs: 6 },
      medium: { best: 340, stars: 2, runs: 2 },
      hard: { best: 0, stars: 0, runs: 0 },
    },
    songsPlayed: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'],
    ...overrides,
  };
}
