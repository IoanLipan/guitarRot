import { describe, expect, it } from 'vitest';
import {
  PROGRESS_VERSION,
  addLessonDone,
  emptyProgressState,
  pruneDaily,
  pushSeen,
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

  it('starts the game at zero: no xp, no practice days, nothing unlocked', () => {
    const state = emptyProgressState();
    expect(state.xp).toBe(0);
    expect(state.practiceDays).toEqual([]);
    expect(state.dayStreak).toEqual({ current: 0, longest: 0, lastDate: null });
    expect(state.achievements).toEqual({});
    expect(state.songsPlayed).toEqual([]);
    expect(state.tunedAllDate).toBeNull();
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(state.quizBests[difficulty]).toEqual({ best: 0, stars: 0, runs: 0 });
    }
  });

  it('returns a fresh object each time', () => {
    const a = emptyProgressState();
    a.seenContent.push('x');
    a.quizBests.easy.runs = 3;
    a.songsToday.ids.push('s');
    expect(emptyProgressState().seenContent).toEqual([]);
    expect(emptyProgressState().quizBests.easy.runs).toBe(0);
    expect(emptyProgressState().songsToday.ids).toEqual([]);
  });
});

describe('addLessonDone', () => {
  it('appends a new lesson', () => {
    expect(addLessonDone(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('does not repeat a lesson that is already done', () => {
    expect(addLessonDone(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const done = ['a'];
    addLessonDone(done, 'b');
    expect(done).toEqual(['a']);
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
