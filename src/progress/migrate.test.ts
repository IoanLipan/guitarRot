import { describe, expect, it } from 'vitest';
import { courseUnits } from './achievements';
import { activeDayStreak } from './practice';
import { levelForXp } from './levels';
import { XP } from './game';
import { migrate } from './migrate';
import { PROGRESS_VERSION, emptyProgressState } from './types';

/** Local noon, so the date it falls on is the same in every time zone. */
const NOW = new Date(2026, 9, 30, 12);
const TODAY = '2026-10-30';

const FIRST_UNIT = courseUnits()[0]?.lessonIds ?? [];

/**
 * Progress as version 1 of the app wrote it: no game fields at all. A few weeks
 * of use: one finished course unit, answers on seven days (two short runs
 * of days with a gap between them, and a day opened but never answered), a
 * best answer streak of 12 and a couple of reviews scheduled.
 */
function storedV1() {
  return {
    version: 1,
    srs: {
      'note-s0f3': { id: 'note-s0f3', dueAt: 1_790_000_000_000, intervalDays: 6, ease: 2.4, reps: 2, lapses: 1 },
      'chord-Am-open': { id: 'chord-Am-open', dueAt: 1_790_100_000_000, intervalDays: 1, ease: 2.3, reps: 1, lapses: 0 },
    },
    seenContent: ['riff-a', 'riff-b', 'chord-G-open'],
    streak: { current: 4, longest: 12, lastActiveDate: '2026-10-28' },
    daily: {
      '2026-10-20': { date: '2026-10-20', answered: 10, correct: 7 },
      '2026-10-21': { date: '2026-10-21', answered: 12, correct: 9 },
      '2026-10-24': { date: '2026-10-24', answered: 8, correct: 6 },
      '2026-10-25': { date: '2026-10-25', answered: 15, correct: 12 },
      '2026-10-26': { date: '2026-10-26', answered: 10, correct: 10 },
      '2026-10-27': { date: '2026-10-27', answered: 20, correct: 14 },
      '2026-10-28': { date: '2026-10-28', answered: 5, correct: 3 },
      '2026-10-29': { date: '2026-10-29', answered: 0, correct: 0 },
    },
    lessonsDone: [...FIRST_UNIT],
    settings: { preferFlats: true, defaultSpeed: 0.75, toneId: 'clean' },
  };
}

describe('migrate: garbage', () => {
  it.each([null, undefined, 'corrupted', 7, [], {}, { version: 0 }, { version: 3 }, { version: 999, srs: {} }])(
    'falls back to a fresh state for %j',
    (raw) => {
      expect(migrate(raw, NOW)).toEqual(emptyProgressState());
    },
  );
});

describe('migrate: version 2', () => {
  it('fills in fields missing from an otherwise valid state', () => {
    const migrated = migrate({ version: PROGRESS_VERSION, srs: {} }, NOW);
    expect(migrated.settings.defaultSpeed).toBe(1);
    expect(migrated.daily).toEqual({});
    expect(migrated.xp).toBe(0);
    expect(migrated.quizBests).toEqual(emptyProgressState().quizBests);
  });

  it('round-trips a state with game progress in it', () => {
    const state = {
      ...emptyProgressState(),
      xp: 740,
      practiceDays: ['2026-10-28', '2026-10-29'],
      dayStreak: { current: 2, longest: 9, lastDate: '2026-10-29' },
      achievements: { 'first-lesson': '2026-10-01' },
      quizBests: {
        easy: { best: 220, stars: 3, runs: 4 },
        medium: { best: 90, stars: 1, runs: 2 },
        hard: { best: 0, stars: 0, runs: 0 },
      },
      songsPlayed: ['amazing-grace', 'greensleeves'],
      songsToday: { date: '2026-10-29', ids: ['greensleeves'] },
      tunedAllDate: '2026-10-15',
    };
    expect(migrate(JSON.parse(JSON.stringify(state)), NOW)).toEqual(state);
  });

  it('keeps what it recognises and drops what it does not', () => {
    const migrated = migrate(
      {
        ...emptyProgressState(),
        xp: -30,
        practiceDays: ['2026-10-29', 'yesterday', '2026-02-30', 42, '2026-10-28', '2026-10-29'],
        dayStreak: { current: 'lots', longest: 4, lastDate: 'someday' },
        achievements: { 'first-lesson': '2026-10-01', 'first-song': 'long ago', bad: 5 },
        quizBests: { easy: { best: 90, stars: 7, runs: 2.9 }, medium: 'x' },
        songsPlayed: ['a', 3, 'a', 'b'],
        songsToday: { date: 5, ids: ['a'] },
        tunedAllDate: 'never',
      },
      NOW,
    );

    expect(migrated.xp).toBe(0);
    expect(migrated.practiceDays).toEqual(['2026-10-28', '2026-10-29']);
    // A streak that cannot be trusted is rebuilt from the days that can.
    expect(migrated.dayStreak).toEqual({ current: 2, longest: 2, lastDate: '2026-10-29' });
    expect(migrated.achievements).toEqual({ 'first-lesson': '2026-10-01' });
    expect(migrated.quizBests.easy).toEqual({ best: 90, stars: 3, runs: 2 });
    expect(migrated.quizBests.medium).toEqual({ best: 0, stars: 0, runs: 0 });
    expect(migrated.songsPlayed).toEqual(['a', 'b']);
    expect(migrated.songsToday).toEqual({ date: '', ids: [] });
    expect(migrated.tunedAllDate).toBeNull();
  });

  it('forgets practice days older than the window', () => {
    const migrated = migrate({ ...emptyProgressState(), practiceDays: ['2024-01-01', '2026-10-29'] }, NOW);
    expect(migrated.practiceDays).toEqual(['2026-10-29']);
  });

  it('does not unlock anything on its own: unlocking is the event path', () => {
    const migrated = migrate({ ...emptyProgressState(), lessonsDone: ['strings'] }, NOW);
    expect(migrated.achievements).toEqual({});
  });
});

describe('migrate: version 1 to version 2', () => {
  it('lands on the current version', () => {
    expect(migrate(storedV1(), NOW).version).toBe(PROGRESS_VERSION);
  });

  it('keeps every field version 1 had', () => {
    const v1 = storedV1();
    const migrated = migrate(JSON.parse(JSON.stringify(v1)), NOW);

    expect(migrated.srs).toEqual(v1.srs);
    expect(migrated.seenContent).toEqual(v1.seenContent);
    expect(migrated.streak).toEqual(v1.streak);
    expect(migrated.daily).toEqual(v1.daily);
    expect(migrated.lessonsDone).toEqual(v1.lessonsDone);
    expect(migrated.settings).toEqual(v1.settings);
  });

  it('defaults the fields it cannot know anything about', () => {
    const migrated = migrate(storedV1(), NOW);
    expect(migrated.quizBests).toEqual(emptyProgressState().quizBests);
    expect(migrated.songsPlayed).toEqual([]);
    expect(migrated.songsToday).toEqual({ date: '', ids: [] });
    expect(migrated.tunedAllDate).toBeNull();
  });

  it('seeds the practice days from the days answers were given', () => {
    // 2026-10-29 was opened with nothing answered, so it is not a practice day.
    expect(migrate(storedV1(), NOW).practiceDays).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
    ]);
  });

  it('rebuilds the day streak from those days', () => {
    const { dayStreak } = migrate(storedV1(), NOW);
    expect(dayStreak).toEqual({ current: 5, longest: 5, lastDate: '2026-10-28' });
  });

  it('knows a streak that ended two days ago is not still going', () => {
    const { dayStreak } = migrate(storedV1(), NOW);
    expect(activeDayStreak(dayStreak, TODAY)).toBe(0);
    expect(activeDayStreak(dayStreak, '2026-10-29')).toBe(5);
  });

  it('pays the lessons already finished and the questions already answered right', () => {
    // 7 + 9 + 6 + 12 + 10 + 14 + 3 right answers across the daily tallies.
    const correct = 61;
    const migrated = migrate(storedV1(), NOW);
    expect(migrated.xp).toBe(FIRST_UNIT.length * XP.lesson + correct * XP.quizCorrect.practice);
  });

  it('does not start a long-time player at level 1', () => {
    expect(levelForXp(migrate(storedV1(), NOW).xp)).toBeGreaterThan(1);
  });

  it('unlocks the achievements the old data already proves, dated the day of the upgrade', () => {
    const { achievements } = migrate(storedV1(), NOW);
    expect(achievements).toMatchObject({
      'first-lesson': TODAY,
      'first-unit': TODAY,
      'first-correct': TODAY,
      'streak-10': TODAY,
      'days-3': TODAY,
    });
  });

  it('does not unlock what the old data cannot prove', () => {
    const { achievements } = migrate(storedV1(), NOW);
    for (const id of ['three-units', 'streak-25', 'days-7', 'first-song', 'tuned-up', 'perfect-easy']) {
      expect(achievements).not.toHaveProperty(id);
    }
  });

  it('upgrades a brand-new version 1 state to an empty game', () => {
    const migrated = migrate({ ...storedV1(), daily: {}, lessonsDone: [], streak: { current: 0, longest: 0, lastActiveDate: null } }, NOW);
    expect(migrated.xp).toBe(0);
    expect(migrated.practiceDays).toEqual([]);
    expect(migrated.dayStreak).toEqual({ current: 0, longest: 0, lastDate: null });
    expect(migrated.achievements).toEqual({});
  });

  it('is stable: migrating the result again changes nothing', () => {
    const once = migrate(storedV1(), NOW);
    expect(migrate(JSON.parse(JSON.stringify(once)), NOW)).toEqual(once);
  });

  it('still drops malformed entries in the old fields, as before', () => {
    const migrated = migrate({ version: 1, srs: { bad: { id: 'bad' } }, lessonsDone: ['strings', 7, null, 'strings', 'tab'] }, NOW);
    expect(migrated.srs).toEqual({});
    expect(migrated.lessonsDone).toEqual(['strings', 'tab']);
  });
});

describe('migrate: the fields version 1 and 2 share', () => {
  it('preserves scheduling data it recognises', () => {
    const state = {
      ...emptyProgressState(),
      srs: {
        'fret:s0f5': { id: 'fret:s0f5', dueAt: 123, intervalDays: 3, ease: 2.3, reps: 4, lapses: 1 },
      },
    };
    expect(migrate(JSON.parse(JSON.stringify(state)), NOW).srs['fret:s0f5']?.reps).toBe(4);
  });

  it('drops srs entries that are not well formed', () => {
    const broken = { version: PROGRESS_VERSION, srs: { bad: { id: 'bad' } } };
    expect(migrate(broken, NOW).srs).toEqual({});
  });

  it('defaults lessonsDone for a state saved before the course existed', () => {
    const { lessonsDone: _omitted, ...beforeTheCourse } = emptyProgressState();
    expect(migrate(beforeTheCourse, NOW).lessonsDone).toEqual([]);
  });

  it('keeps the finished lesson ids it is given, in order', () => {
    const saved = { ...emptyProgressState(), lessonsDone: ['strings', 'tuning'] };
    expect(migrate(JSON.parse(JSON.stringify(saved)), NOW).lessonsDone).toEqual(['strings', 'tuning']);
  });

  it('keeps only strings, once each', () => {
    const saved = { ...emptyProgressState(), lessonsDone: ['strings', 7, null, 'strings', 'tab'] };
    expect(migrate(saved, NOW).lessonsDone).toEqual(['strings', 'tab']);
  });

  it('ignores a lessonsDone that is not a list', () => {
    expect(migrate({ ...emptyProgressState(), lessonsDone: 'strings' }, NOW).lessonsDone).toEqual([]);
  });
});
