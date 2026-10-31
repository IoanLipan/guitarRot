import { ALL_LESSONS, courseFor, getSong, isMovieSong, type Lesson } from '@/content';
import { INSTRUMENTS, instrumentIdOf } from '@/music';
import { levelForXp } from './levels';
import type { ProgressState } from './types';

/** The material a badge is drawn in: a guitar pick, from plain to precious. */
export type AchievementTier = 'celluloid' | 'steel' | 'gold';

export type AchievementCategory = 'learn' | 'quiz' | 'songs' | 'streak' | 'milestone';

export type Achievement = {
  /** Stable: unlocks are stored against it. Never rename one that has shipped. */
  id: string;
  name: string;
  /** One line, in plain words, on what it takes. */
  howTo: string;
  tier: AchievementTier;
  category: AchievementCategory;
  /** Whether the state proves it, from the state alone. Unlocking is recorded elsewhere. */
  earned: (state: ProgressState) => boolean;
  /**
   * For the ones that count something, how far along the player is, so a
   * locked badge can say "9 of 15". Absent for the all-or-nothing ones.
   */
  progress?: (state: ProgressState) => { have: number; need: number };
};

/** A course unit and the lessons in it, in course order. */
export type CourseUnit = { unit: string; lessonIds: string[] };

/**
 * The units of some lessons, in course order. A unit belongs to one
 * instrument's course: two courses that happen to name a unit alike still have
 * two units. Left to itself it covers every course there is.
 */
export function courseUnits(lessons: readonly Lesson[] = ALL_LESSONS): CourseUnit[] {
  const units: (CourseUnit & { instrument: string })[] = [];
  for (const lesson of lessons) {
    const instrument = instrumentIdOf(lesson);
    let group = units.find((candidate) => candidate.unit === lesson.unit && candidate.instrument === instrument);
    if (group === undefined) {
      group = { unit: lesson.unit, instrument, lessonIds: [] };
      units.push(group);
    }
    group.lessonIds.push(lesson.id);
  }
  return units.map(({ unit, lessonIds }) => ({ unit, lessonIds }));
}

/** Units in which every lesson is done, across every course unless given one. */
export function unitsFinished(state: ProgressState, lessons: readonly Lesson[] = ALL_LESSONS): number {
  const done = new Set(state.lessonsDone);
  return courseUnits(lessons).filter((unit) => unit.lessonIds.every((id) => done.has(id))).length;
}

/**
 * How far the player is through the one course they are furthest through, as
 * units finished of units in it: the progress toward finishing a whole course,
 * on whichever instrument. An instrument whose course is not written yet has
 * nothing to finish and never counts.
 */
export function wholeCourseProgress(state: ProgressState): { have: number; need: number } {
  let best = { have: 0, need: 0 };
  for (const instrument of INSTRUMENTS) {
    const lessons = courseFor(instrument.id);
    const need = courseUnits(lessons).length;
    if (need === 0) continue;
    const have = unitsFinished(state, lessons);
    if (best.need === 0 || have / need > best.have / best.need) best = { have, need };
  }
  return best;
}

/** Quiz runs finished, at any difficulty. */
export function quizRunsFinished(state: ProgressState): number {
  const { easy, medium, hard } = state.quizBests;
  return easy.runs + medium.runs + hard.runs;
}

/** Something countable, with the progress toward it that goes with it. */
function counting(
  need: number,
  have: (state: ProgressState) => number,
): Pick<Achievement, 'earned' | 'progress'> {
  return {
    earned: (state) => have(state) >= need,
    progress: (state) => ({ have: Math.min(need, have(state)), need }),
  };
}

const playedSong = (state: ProgressState, test: (songId: string) => boolean): boolean =>
  state.songsPlayed.some(test);

/**
 * Every achievement, in the order they are shown and in the order several
 * unlocking at once are reported. Each one is decided by `earned` from the
 * progress state alone, which is also what lets an upgrade from older
 * progress unlock the ones that data already proves.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  // --- Learn --------------------------------------------------------------
  {
    id: 'first-lesson',
    name: 'First lesson',
    howTo: 'Finish any lesson in the course.',
    tier: 'celluloid',
    category: 'learn',
    ...counting(1, (state) => state.lessonsDone.length),
  },
  {
    id: 'first-unit',
    name: 'Unit complete',
    howTo: 'Finish every lesson in one course unit.',
    tier: 'celluloid',
    category: 'learn',
    ...counting(1, (state) => unitsFinished(state)),
  },
  {
    id: 'three-units',
    name: 'Three units deep',
    howTo: 'Finish every lesson in three course units.',
    tier: 'steel',
    category: 'learn',
    ...counting(3, (state) => unitsFinished(state)),
  },
  {
    id: 'whole-course',
    name: 'Course graduate',
    howTo: 'Finish every lesson in a whole course.',
    tier: 'gold',
    category: 'learn',
    earned: (state) => {
      const { have, need } = wholeCourseProgress(state);
      return need > 0 && have >= need;
    },
    progress: (state) => wholeCourseProgress(state),
  },

  // --- Quiz ---------------------------------------------------------------
  {
    id: 'first-correct',
    name: 'Right on the note',
    howTo: 'Get your first quiz answer right.',
    tier: 'celluloid',
    category: 'quiz',
    earned: (state) => state.streak.longest >= 1,
  },
  {
    id: 'streak-10',
    name: 'Ten in a row',
    howTo: 'Answer 10 quiz questions right in a row.',
    tier: 'celluloid',
    category: 'quiz',
    ...counting(10, (state) => state.streak.longest),
  },
  {
    id: 'streak-25',
    name: 'Twenty-five in a row',
    howTo: 'Answer 25 quiz questions right in a row.',
    tier: 'steel',
    category: 'quiz',
    ...counting(25, (state) => state.streak.longest),
  },
  {
    id: 'streak-50',
    name: 'Fifty in a row',
    howTo: 'Answer 50 quiz questions right in a row.',
    tier: 'gold',
    category: 'quiz',
    ...counting(50, (state) => state.streak.longest),
  },
  {
    id: 'perfect-easy',
    name: 'Flawless on easy',
    howTo: 'Get all 10 right in an easy quiz run.',
    tier: 'celluloid',
    category: 'quiz',
    earned: (state) => state.quizBests.easy.stars === 3,
  },
  {
    id: 'perfect-medium',
    name: 'Flawless on medium',
    howTo: 'Get all 10 right in a medium quiz run.',
    tier: 'steel',
    category: 'quiz',
    earned: (state) => state.quizBests.medium.stars === 3,
  },
  {
    id: 'perfect-hard',
    name: 'Flawless on hard',
    howTo: 'Get all 10 right in a hard quiz run.',
    tier: 'gold',
    category: 'quiz',
    earned: (state) => state.quizBests.hard.stars === 3,
  },
  {
    id: 'runs-5',
    name: 'Getting the hang of it',
    howTo: 'Finish 5 quiz runs.',
    tier: 'celluloid',
    category: 'quiz',
    ...counting(5, quizRunsFinished),
  },
  {
    id: 'runs-25',
    name: 'Quiz regular',
    howTo: 'Finish 25 quiz runs.',
    tier: 'steel',
    category: 'quiz',
    ...counting(25, quizRunsFinished),
  },

  // --- Songs --------------------------------------------------------------
  {
    id: 'first-song',
    name: 'First song',
    howTo: 'Play any song for 20 seconds.',
    tier: 'celluloid',
    category: 'songs',
    ...counting(1, (state) => state.songsPlayed.length),
  },
  {
    id: 'songs-5',
    name: 'Five songs',
    howTo: 'Play 5 different songs.',
    tier: 'celluloid',
    category: 'songs',
    ...counting(5, (state) => state.songsPlayed.length),
  },
  {
    id: 'songs-15',
    name: 'Fifteen songs',
    howTo: 'Play 15 different songs.',
    tier: 'steel',
    category: 'songs',
    ...counting(15, (state) => state.songsPlayed.length),
  },
  {
    id: 'songs-30',
    name: 'Thirty songs',
    howTo: 'Play 30 different songs.',
    tier: 'gold',
    category: 'songs',
    ...counting(30, (state) => state.songsPlayed.length),
  },
  {
    id: 'movie-song',
    name: 'Cinema night',
    howTo: 'Play a song from the Movies category.',
    tier: 'celluloid',
    category: 'songs',
    earned: (state) => playedSong(state, (id) => {
      const song = getSong(id);
      return song !== undefined && isMovieSong(song);
    }),
  },
  {
    id: 'hard-song',
    name: 'Hard song',
    howTo: 'Play a song marked hard.',
    tier: 'steel',
    category: 'songs',
    earned: (state) => playedSong(state, (id) => getSong(id)?.difficulty === 'hard'),
  },

  // --- Streak -------------------------------------------------------------
  {
    id: 'days-3',
    name: 'Three days running',
    howTo: 'Practice 3 days in a row.',
    tier: 'celluloid',
    category: 'streak',
    ...counting(3, (state) => state.dayStreak.longest),
  },
  {
    id: 'days-7',
    name: 'A week running',
    howTo: 'Practice 7 days in a row.',
    tier: 'steel',
    category: 'streak',
    ...counting(7, (state) => state.dayStreak.longest),
  },
  {
    id: 'days-30',
    name: 'A month running',
    howTo: 'Practice 30 days in a row.',
    tier: 'gold',
    category: 'streak',
    ...counting(30, (state) => state.dayStreak.longest),
  },

  // --- Milestones ---------------------------------------------------------
  {
    id: 'tuned-up',
    name: 'Tuned up',
    howTo: 'Tune every string of your instrument with the tuner.',
    tier: 'celluloid',
    category: 'milestone',
    earned: (state) => state.tunedAllDate !== null,
  },
  {
    id: 'level-5',
    name: 'Level 5',
    howTo: 'Reach level 5.',
    tier: 'steel',
    category: 'milestone',
    ...counting(5, (state) => levelForXp(state.xp)),
  },
  {
    id: 'level-10',
    name: 'Level 10',
    howTo: 'Reach level 10.',
    tier: 'gold',
    category: 'milestone',
    ...counting(10, (state) => levelForXp(state.xp)),
  },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

/** Ids the state proves but has not yet recorded as unlocked, in catalogue order. */
export function newlyEarned(state: ProgressState): string[] {
  return ACHIEVEMENTS.filter(
    (achievement) => state.achievements[achievement.id] === undefined && achievement.earned(state),
  ).map((achievement) => achievement.id);
}

/** Records `ids` as unlocked on `date`. Ones already unlocked keep their original date. */
export function unlockAchievements(
  state: ProgressState,
  ids: readonly string[],
  date: string,
): ProgressState {
  if (ids.length === 0) return state;
  const achievements = { ...state.achievements };
  for (const id of ids) achievements[id] ??= date;
  return { ...state, achievements };
}
