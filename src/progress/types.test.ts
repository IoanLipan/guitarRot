import { describe, expect, it } from 'vitest';
import {
  PROGRESS_VERSION,
  emptyProgressState,
  migrate,
  pruneDaily,
  pushSeen,
  type ProgressState,
} from './types';

describe('emptyProgressState', () => {
  it('stamps the current version', () => {
    expect(emptyProgressState().version).toBe(PROGRESS_VERSION);
  });

  it('starts with nothing learned and no streak', () => {
    const state = emptyProgressState();
    expect(state.srs).toEqual({});
    expect(state.seenContent).toEqual([]);
    expect(state.streak).toEqual({ current: 0, longest: 0, lastActiveDate: null });
  });

  it('returns a fresh object each time', () => {
    const a = emptyProgressState();
    a.seenContent.push('x');
    expect(emptyProgressState().seenContent).toEqual([]);
  });
});

describe('migrate', () => {
  it('turns null into an empty state', () => {
    expect(migrate(null)).toEqual(emptyProgressState());
  });

  it('turns a string into an empty state', () => {
    expect(migrate('corrupted')).toEqual(emptyProgressState());
  });

  it('turns an unknown version into an empty state', () => {
    expect(migrate({ version: 999, srs: {} })).toEqual(emptyProgressState());
  });

  it('fills in fields missing from an otherwise valid state', () => {
    const partial = { version: PROGRESS_VERSION, srs: {} };
    const migrated = migrate(partial);
    expect(migrated.settings.defaultSpeed).toBe(1);
    expect(migrated.daily).toEqual({});
  });

  it('preserves scheduling data it recognises', () => {
    const state: ProgressState = {
      ...emptyProgressState(),
      srs: {
        'fret:s0f5': { id: 'fret:s0f5', dueAt: 123, intervalDays: 3, ease: 2.3, reps: 4, lapses: 1 },
      },
    };
    expect(migrate(JSON.parse(JSON.stringify(state))).srs['fret:s0f5']?.reps).toBe(4);
  });

  it('drops srs entries that are not well formed', () => {
    const broken = { version: PROGRESS_VERSION, srs: { bad: { id: 'bad' } } };
    expect(migrate(broken).srs).toEqual({});
  });
});

describe('pushSeen', () => {
  it('appends the newest id last', () => {
    expect(pushSeen(['a', 'b'], 'c', 10)).toEqual(['a', 'b', 'c']);
  });

  it('moves a repeat to the end rather than duplicating it', () => {
    expect(pushSeen(['a', 'b', 'c'], 'a', 10)).toEqual(['b', 'c', 'a']);
  });

  it('drops the oldest entry once the limit is reached', () => {
    expect(pushSeen(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });
});

describe('pruneDaily', () => {
  it('keeps days inside the window', () => {
    const daily = {
      '2026-09-01': { date: '2026-09-01', answered: 3, correct: 2 },
      '2026-09-02': { date: '2026-09-02', answered: 5, correct: 5 },
    };
    expect(Object.keys(pruneDaily(daily, 30, '2026-09-02')).sort()).toEqual([
      '2026-09-01',
      '2026-09-02',
    ]);
  });

  it('drops days older than the window', () => {
    const daily = {
      '2025-01-01': { date: '2025-01-01', answered: 3, correct: 2 },
      '2026-09-02': { date: '2026-09-02', answered: 5, correct: 5 },
    };
    expect(Object.keys(pruneDaily(daily, 30, '2026-09-02'))).toEqual(['2026-09-02']);
  });
});
