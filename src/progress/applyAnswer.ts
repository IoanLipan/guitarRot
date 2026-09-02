import { DAILY_KEEP_DAYS, pruneDaily, type ProgressState } from './types';

/** Folds one quiz answer into progress state: streak, longest streak, and today's tally. */
export function applyAnswer(state: ProgressState, correct: boolean, today: string): ProgressState {
  const current = correct ? state.streak.current + 1 : 0;
  const streak = {
    current,
    longest: Math.max(state.streak.longest, current),
    lastActiveDate: today,
  };

  const previous = state.daily[today] ?? { date: today, answered: 0, correct: 0 };
  const daily = pruneDaily(
    {
      ...state.daily,
      [today]: {
        date: today,
        answered: previous.answered + 1,
        correct: previous.correct + (correct ? 1 : 0),
      },
    },
    DAILY_KEEP_DAYS,
    today,
  );

  return { ...state, streak, daily };
}
