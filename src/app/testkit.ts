import { vi } from 'vitest';
import { emptyProgressState, type Award, type ProgressState } from '@/progress';
import type { ProgressHandle } from './useProgress';

/** What `record` answers when a test does not care: nothing earned. */
export const NO_AWARD: Award = {
  xp: 0,
  levelBefore: 1,
  levelAfter: 1,
  unlocked: [],
  dayStreak: 0,
  firstOfDay: false,
};

/**
 * A player who has used the app before: nothing earned, but they have said what they play, so the
 * first-run question is not asked. `emptyProgressState()` on its own is a fresh install, which is asked.
 */
export function returningState(): ProgressState {
  const state = emptyProgressState();
  return { ...state, settings: { ...state.settings, instrumentChosen: true } };
}

/** A progress handle whose every action is a spy, for tests of the screens that take one. */
export function fakeProgressHandle(overrides: Partial<ProgressHandle> = {}): ProgressHandle {
  return {
    state: returningState(),
    loaded: true,
    recordAnswer: vi.fn(),
    record: vi.fn(() => NO_AWARD),
    lastAward: null,
    subscribeAwards: vi.fn(() => () => {}),
    updateSettings: vi.fn(),
    setInstrument: vi.fn(),
    completeLesson: vi.fn(),
    flush: vi.fn(),
    ...overrides,
  };
}
