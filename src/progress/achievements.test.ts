import { describe, expect, it } from 'vitest';
import { COURSE, SONGS, isMovieSong } from '@/content';
import {
  ACHIEVEMENTS,
  courseUnits,
  getAchievement,
  newlyEarned,
  quizRunsFinished,
  unitsFinished,
  unlockAchievements,
} from './achievements';
import { xpForLevel } from './levels';
import { emptyProgressState, type ProgressState } from './types';

const units = courseUnits();
const lessonIdsOfUnits = (count: number): string[] => units.slice(0, count).flatMap((unit) => unit.lessonIds);
const allLessonIds = COURSE.map((lesson) => lesson.id);

const songIds = SONGS.map((song) => song.id);
const movieId = SONGS.find((song) => isMovieSong(song))?.id ?? '';
const hardId = SONGS.find((song) => song.difficulty === 'hard')?.id ?? '';
const plainIds = SONGS.filter((song) => !isMovieSong(song) && song.difficulty !== 'hard').map((song) => song.id);

function state(patch: Partial<ProgressState>): ProgressState {
  return { ...emptyProgressState(), ...patch };
}

function runs(easy: number, medium = 0, hard = 0): ProgressState['quizBests'] {
  return {
    easy: { best: 0, stars: 0, runs: easy },
    medium: { best: 0, stars: 0, runs: medium },
    hard: { best: 0, stars: 0, runs: hard },
  };
}

function perfect(difficulty: 'easy' | 'medium' | 'hard', stars: 0 | 1 | 2 | 3): ProgressState['quizBests'] {
  const bests = runs(0);
  bests[difficulty] = { best: 100, stars, runs: 1 };
  return bests;
}

/** For each achievement: a state that has just earned it, and one that is a single step short. */
const CASES: Record<string, { earned: ProgressState; short: ProgressState }> = {
  'first-lesson': { earned: state({ lessonsDone: ['x'] }), short: state({}) },
  'first-unit': {
    earned: state({ lessonsDone: lessonIdsOfUnits(1) }),
    short: state({ lessonsDone: lessonIdsOfUnits(1).slice(1) }),
  },
  'three-units': {
    earned: state({ lessonsDone: lessonIdsOfUnits(3) }),
    short: state({ lessonsDone: lessonIdsOfUnits(3).slice(1) }),
  },
  'whole-course': {
    earned: state({ lessonsDone: allLessonIds }),
    short: state({ lessonsDone: allLessonIds.slice(1) }),
  },
  'first-correct': {
    earned: state({ streak: { current: 0, longest: 1, lastActiveDate: null } }),
    short: state({}),
  },
  'streak-10': {
    earned: state({ streak: { current: 0, longest: 10, lastActiveDate: null } }),
    short: state({ streak: { current: 9, longest: 9, lastActiveDate: null } }),
  },
  'streak-25': {
    earned: state({ streak: { current: 0, longest: 25, lastActiveDate: null } }),
    short: state({ streak: { current: 24, longest: 24, lastActiveDate: null } }),
  },
  'streak-50': {
    earned: state({ streak: { current: 0, longest: 50, lastActiveDate: null } }),
    short: state({ streak: { current: 49, longest: 49, lastActiveDate: null } }),
  },
  'perfect-easy': { earned: state({ quizBests: perfect('easy', 3) }), short: state({ quizBests: perfect('easy', 2) }) },
  'perfect-medium': {
    earned: state({ quizBests: perfect('medium', 3) }),
    short: state({ quizBests: perfect('easy', 3) }),
  },
  'perfect-hard': { earned: state({ quizBests: perfect('hard', 3) }), short: state({ quizBests: perfect('hard', 2) }) },
  'runs-5': { earned: state({ quizBests: runs(2, 2, 1) }), short: state({ quizBests: runs(2, 2) }) },
  'runs-25': { earned: state({ quizBests: runs(10, 10, 5) }), short: state({ quizBests: runs(10, 10, 4) }) },
  'first-song': { earned: state({ songsPlayed: songIds.slice(0, 1) }), short: state({}) },
  'songs-5': { earned: state({ songsPlayed: songIds.slice(0, 5) }), short: state({ songsPlayed: songIds.slice(0, 4) }) },
  'songs-15': { earned: state({ songsPlayed: songIds.slice(0, 15) }), short: state({ songsPlayed: songIds.slice(0, 14) }) },
  'songs-30': { earned: state({ songsPlayed: songIds.slice(0, 30) }), short: state({ songsPlayed: songIds.slice(0, 29) }) },
  'movie-song': { earned: state({ songsPlayed: [movieId] }), short: state({ songsPlayed: plainIds.slice(0, 10) }) },
  'hard-song': { earned: state({ songsPlayed: [hardId] }), short: state({ songsPlayed: plainIds.slice(0, 10) }) },
  'days-3': {
    earned: state({ dayStreak: { current: 0, longest: 3, lastDate: '2026-10-01' } }),
    short: state({ dayStreak: { current: 2, longest: 2, lastDate: '2026-10-01' } }),
  },
  'days-7': {
    earned: state({ dayStreak: { current: 0, longest: 7, lastDate: '2026-10-01' } }),
    short: state({ dayStreak: { current: 6, longest: 6, lastDate: '2026-10-01' } }),
  },
  'days-30': {
    earned: state({ dayStreak: { current: 0, longest: 30, lastDate: '2026-10-01' } }),
    short: state({ dayStreak: { current: 29, longest: 29, lastDate: '2026-10-01' } }),
  },
  'tuned-up': { earned: state({ tunedAllDate: '2026-10-01' }), short: state({}) },
  'level-5': { earned: state({ xp: xpForLevel(5) }), short: state({ xp: xpForLevel(5) - 1 }) },
  'level-10': { earned: state({ xp: xpForLevel(10) }), short: state({ xp: xpForLevel(10) - 1 }) },
};

describe('the catalogue', () => {
  it('has a unique id for each achievement', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(20);
  });

  it('is fully covered by the cases below, with none left over', () => {
    expect(Object.keys(CASES).sort()).toEqual(ACHIEVEMENTS.map((achievement) => achievement.id).sort());
  });

  it('gives each one a name and a plain one-line way to earn it', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.name).toMatch(/^[A-Z]/);
      expect(achievement.name).not.toMatch(/[!]|\p{Extended_Pictographic}/u);
      expect(achievement.howTo).toMatch(/^[A-Z].*\.$/);
      expect(achievement.howTo).not.toMatch(/\n|\p{Extended_Pictographic}/u);
    }
  });

  it('uses only the three tiers and five categories, and spreads across all of them', () => {
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.tier))).toEqual(
      new Set(['celluloid', 'steel', 'gold']),
    );
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.category))).toEqual(
      new Set(['learn', 'quiz', 'songs', 'streak', 'milestone']),
    );
  });

  it('can be looked up by id', () => {
    expect(getAchievement('songs-15')?.name).toBe('Fifteen songs');
    expect(getAchievement('nope')).toBeUndefined();
  });

  it('is earnable with the content that ships: enough songs, a movie song, a hard song, a course', () => {
    expect(songIds.length).toBeGreaterThanOrEqual(30);
    expect(movieId).not.toBe('');
    expect(hardId).not.toBe('');
    expect(plainIds.length).toBeGreaterThanOrEqual(10);
    expect(units.length).toBeGreaterThanOrEqual(3);
  });

  it('earns nothing from a fresh state', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.earned(emptyProgressState())).toBe(false);
    }
  });
});

describe('each achievement', () => {
  it.each(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement] as const))(
    '%s: earned at its threshold, not one step before',
    (id, achievement) => {
      const cases = CASES[id];
      expect(cases).toBeDefined();
      expect(achievement.earned(cases!.earned)).toBe(true);
      expect(achievement.earned(cases!.short)).toBe(false);
    },
  );

  it('ignores a played song id the catalogue no longer has', () => {
    const played = state({ songsPlayed: ['a-song-that-was-removed'] });
    expect(getAchievement('movie-song')?.earned(played)).toBe(false);
    expect(getAchievement('hard-song')?.earned(played)).toBe(false);
    // It still counts as a song played, which is all the counting ones ask.
    expect(getAchievement('first-song')?.earned(played)).toBe(true);
  });

  it('counts a unit only when every one of its lessons is done', () => {
    expect(unitsFinished(state({ lessonsDone: lessonIdsOfUnits(2) }))).toBe(2);
    expect(unitsFinished(state({ lessonsDone: lessonIdsOfUnits(2).slice(0, -1) }))).toBe(1);
    expect(unitsFinished(state({ lessonsDone: allLessonIds }))).toBe(units.length);
  });

  it('adds quiz runs up across the three difficulties', () => {
    expect(quizRunsFinished(state({ quizBests: runs(1, 2, 3) }))).toBe(6);
  });
});

describe('progress toward the counting achievements', () => {
  it('reports how far along, capped at the target', () => {
    const songs15 = getAchievement('songs-15');
    expect(songs15?.progress?.(state({ songsPlayed: songIds.slice(0, 9) }))).toEqual({ have: 9, need: 15 });
    expect(songs15?.progress?.(state({ songsPlayed: songIds.slice(0, 20) }))).toEqual({ have: 15, need: 15 });
  });

  it('reads the level from the xp', () => {
    expect(getAchievement('level-5')?.progress?.(state({ xp: xpForLevel(3) }))).toEqual({ have: 3, need: 5 });
  });

  it('is absent for the all-or-nothing ones', () => {
    expect(getAchievement('tuned-up')?.progress).toBeUndefined();
    expect(getAchievement('perfect-hard')?.progress).toBeUndefined();
  });
});

describe('newlyEarned', () => {
  it('lists what the state earns, in catalogue order', () => {
    const both = state({
      lessonsDone: lessonIdsOfUnits(1),
      streak: { current: 0, longest: 10, lastActiveDate: null },
      tunedAllDate: '2026-10-01',
    });
    expect(newlyEarned(both)).toEqual(['first-lesson', 'first-unit', 'first-correct', 'streak-10', 'tuned-up']);
  });

  it('leaves out the ones already unlocked', () => {
    const half = state({ lessonsDone: lessonIdsOfUnits(1), achievements: { 'first-lesson': '2026-09-01' } });
    expect(newlyEarned(half)).toEqual(['first-unit']);
  });
});

describe('unlockAchievements', () => {
  it('stamps the given date', () => {
    expect(unlockAchievements(state({}), ['first-lesson', 'tuned-up'], '2026-10-30').achievements).toEqual({
      'first-lesson': '2026-10-30',
      'tuned-up': '2026-10-30',
    });
  });

  it('never moves the date of one already unlocked', () => {
    const before = state({ achievements: { 'first-lesson': '2026-09-01' } });
    expect(unlockAchievements(before, ['first-lesson'], '2026-10-30').achievements).toEqual({
      'first-lesson': '2026-09-01',
    });
  });

  it('hands back the same state when there is nothing to unlock', () => {
    const before = state({});
    expect(unlockAchievements(before, [], '2026-10-30')).toBe(before);
  });
});
