import { describe, expect, it } from 'vitest';
import { applyAnswer } from './applyAnswer';
import { emptyProgressState } from './types';

describe('applyAnswer', () => {
  it('bumps the current and longest streak on a correct answer', () => {
    const next = applyAnswer(emptyProgressState(), true, '2026-09-03');
    expect(next.streak).toEqual({ current: 1, longest: 1, lastActiveDate: '2026-09-03' });
  });

  it('resets the current streak but keeps the longest on a wrong answer', () => {
    const withStreak = applyAnswer(emptyProgressState(), true, '2026-09-03');
    const afterMiss = applyAnswer(withStreak, false, '2026-09-03');
    expect(afterMiss.streak).toEqual({ current: 0, longest: 1, lastActiveDate: '2026-09-03' });
  });

  it('tallies answered and correct counts for the day', () => {
    let state = emptyProgressState();
    state = applyAnswer(state, true, '2026-09-03');
    state = applyAnswer(state, false, '2026-09-03');
    expect(state.daily['2026-09-03']).toEqual({ date: '2026-09-03', answered: 2, correct: 1 });
  });

  it('does not mutate daily stats from other days', () => {
    let state = emptyProgressState();
    state = applyAnswer(state, true, '2026-09-01');
    state = applyAnswer(state, true, '2026-09-03');
    expect(state.daily['2026-09-01']).toEqual({ date: '2026-09-01', answered: 1, correct: 1 });
    expect(state.daily['2026-09-03']).toEqual({ date: '2026-09-03', answered: 1, correct: 1 });
  });
});
