import { vi } from 'vitest';
import { emptyProgressState, type Award } from '@/progress';
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

/** A progress handle whose every action is a spy, for tests of the screens that take one. */
export function fakeProgressHandle(overrides: Partial<ProgressHandle> = {}): ProgressHandle {
  return {
    state: emptyProgressState(),
    loaded: true,
    recordAnswer: vi.fn(),
    record: vi.fn(() => NO_AWARD),
    lastAward: null,
    subscribeAwards: vi.fn(() => () => {}),
    updateSettings: vi.fn(),
    completeLesson: vi.fn(),
    flush: vi.fn(),
    ...overrides,
  };
}
