import { DEFAULT_INSTRUMENT_ID, getInstrument, type InstrumentId } from '@/music';

/**
 * 2 added the game layer (xp, day streak, achievements, quiz bests, songs).
 * Version 1 states are upgraded on load by `migrate`, not discarded.
 */
export const PROGRESS_VERSION = 2;

export type SrsItem = {
  id: string;
  /** Epoch milliseconds. */
  dueAt: number;
  intervalDays: number;
  /** SM-2 ease factor. Starts at 2.5 and floors at 1.3. */
  ease: number;
  reps: number;
  lapses: number;
};

export type Settings = {
  preferFlats: boolean;
  /** Feed riff playback speed, 0.25 to 1.5. */
  defaultSpeed: number;
  /** The voicing id (from `audio/tones.ts`) of the instrument being played. */
  toneId: string;
  /** The instrument being learned: the Feed, Songs, Learn and Quiz all follow it. */
  instrument: InstrumentId;
  /**
   * Whether the player has picked an instrument. A fresh install has not and is
   * asked; progress saved before there was a choice belongs to a guitarist, so
   * it loads as chosen.
   */
  instrumentChosen: boolean;
  /**
   * The voicing last used on each instrument that is not the current one, kept
   * when the player switches away so switching back finds their choice again.
   * The current instrument's is `toneId`.
   */
  toneByInstrument: Partial<Record<InstrumentId, string>>;
};

export type DailyStat = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  answered: number;
  correct: number;
};

/** The three quiz difficulties. Songs use the same three words for theirs. */
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export const QUIZ_DIFFICULTIES: readonly QuizDifficulty[] = ['easy', 'medium', 'hard'];

export type QuizBest = {
  /** Highest run score at this difficulty. */
  best: number;
  /** Most stars any run at this difficulty has earned; 3 means a perfect run. */
  stars: 0 | 1 | 2 | 3;
  /** Runs finished at this difficulty. */
  runs: number;
};

/** Days in a row with any practice at all, as opposed to answers in a row. */
export type DayStreak = {
  current: number;
  longest: number;
  /** Local ISO date of the last practice day counted, or null before the first. */
  lastDate: string | null;
};

export type ProgressState = {
  version: number;
  srs: Record<string, SrsItem>;
  /** Ring buffer of recently shown content ids; newest last. */
  seenContent: string[];
  streak: { current: number; longest: number; lastActiveDate: string | null };
  daily: Record<string, DailyStat>;
  /** Ids of finished course lessons, in the order they were finished. */
  lessonsDone: string[];
  settings: Settings;

  // --- Game layer (version 2) ---------------------------------------------

  /** Experience points earned, ever. Only goes up. */
  xp: number;
  /** Local ISO dates with any practice, sorted, once each, about a year and a bit back. */
  practiceDays: string[];
  dayStreak: DayStreak;
  /** Achievement id to the local ISO date it was unlocked. Unlocks are permanent. */
  achievements: Record<string, string>;
  quizBests: Record<QuizDifficulty, QuizBest>;
  /** Ids of the songs played, once each, in the order first played. */
  songsPlayed: string[];
  /**
   * The songs that have already earned XP on `date`, so replaying one the
   * same day earns nothing. `date` is '' before the first, which no day equals.
   */
  songsToday: { date: string; ids: string[] };
  /** The last local date the tuner tuned every string of an instrument, or null if it never has. */
  tunedAllDate: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  preferFlats: false,
  defaultSpeed: 1,
  // Kept in step with the audio module's DEFAULT_TONE_ID by a test rather
  // than an import, so progress storage stays free of audio dependencies.
  // They disagreed once, and a fresh install booted on acoustic and then
  // immediately reloaded a second sample set to land on clean.
  toneId: 'acoustic',
  instrument: DEFAULT_INSTRUMENT_ID,
  instrumentChosen: false,
  toneByInstrument: {},
};

/**
 * The settings after switching to `next`: the voicing in use goes into the
 * shelf for the instrument being left, and the one that instrument last used
 * (or its default) becomes the voicing in use. Choosing counts as having chosen.
 */
export function withInstrument(settings: Settings, next: InstrumentId): Settings {
  if (settings.instrument === next) return { ...settings, instrumentChosen: true };
  const shelf = { ...settings.toneByInstrument, [settings.instrument]: settings.toneId };
  return {
    ...settings,
    instrument: next,
    instrumentChosen: true,
    toneId: shelf[next] ?? getInstrument(next).defaultToneId,
    toneByInstrument: shelf,
  };
}

export const SEEN_LIMIT = 200;
export const DAILY_KEEP_DAYS = 365;

export function emptyQuizBests(): Record<QuizDifficulty, QuizBest> {
  return {
    easy: { best: 0, stars: 0, runs: 0 },
    medium: { best: 0, stars: 0, runs: 0 },
    hard: { best: 0, stars: 0, runs: 0 },
  };
}

export function emptyProgressState(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    srs: {},
    seenContent: [],
    streak: { current: 0, longest: 0, lastActiveDate: null },
    daily: {},
    lessonsDone: [],
    settings: { ...DEFAULT_SETTINGS },
    xp: 0,
    practiceDays: [],
    dayStreak: { current: 0, longest: 0, lastDate: null },
    achievements: {},
    quizBests: emptyQuizBests(),
    songsPlayed: [],
    songsToday: { date: '', ids: [] },
    tunedAllDate: null,
  };
}

/** Appends an id, moving a repeat to the end and trimming to the limit. */
export function pushSeen(seen: string[], id: string, limit: number = SEEN_LIMIT): string[] {
  const without = seen.filter((existing) => existing !== id);
  without.push(id);
  return without.length > limit ? without.slice(without.length - limit) : without;
}

/** Adds a finished lesson id; a lesson already done is left where it was. */
export function addLessonDone(done: readonly string[], id: string): string[] {
  return done.includes(id) ? [...done] : [...done, id];
}

export function pruneDaily(
  daily: Record<string, DailyStat>,
  keepDays: number,
  today: string,
): Record<string, DailyStat> {
  const cutoff = new Date(`${today}T00:00:00Z`).getTime() - keepDays * 24 * 60 * 60 * 1000;
  const kept: Record<string, DailyStat> = {};
  for (const [date, stat] of Object.entries(daily)) {
    if (new Date(`${date}T00:00:00Z`).getTime() >= cutoff) kept[date] = stat;
  }
  return kept;
}
