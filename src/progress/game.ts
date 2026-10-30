import { newlyEarned, unlockAchievements } from './achievements';
import { applyAnswer } from './applyAnswer';
import { localDateIso } from './dates';
import { levelForXp } from './levels';
import { addPracticeDay, advanceDayStreak, activeDayStreak } from './practice';
import { addLessonDone, type ProgressState, type QuizDifficulty } from './types';

// ---------------------------------------------------------------------------
// The XP table. Every number the game pays out is here and nowhere else.
// ---------------------------------------------------------------------------

/** Where a quiz answer came from: one of the three run difficulties, or the free-practice Quiz tab. */
export type QuizMode = QuizDifficulty | 'practice';

export const XP = {
  /** A right answer. Wrong answers earn nothing. */
  quizCorrect: { easy: 5, medium: 10, hard: 15, practice: 5 } satisfies Record<QuizMode, number>,
  /** Per star a finished run earned. */
  runStar: 10,
  /** On top of the stars, for 10 out of 10. */
  runPerfect: 25,
  /** First time a lesson is finished; finishing it again earns nothing. */
  lesson: 50,
  /** The first time a song is ever played. */
  songFirst: 20,
  /** Each later song, at most once per song per day. */
  songRepeat: 5,
  /** The first thing done on a day, whatever it is. */
  firstPracticeOfDay: 10,
  /** Tuning all six strings, at most once a day. */
  tunedAll: 15,
} as const;

// ---------------------------------------------------------------------------
// Quiz runs
// ---------------------------------------------------------------------------

/** Questions in one run. */
export const RUN_LENGTH = 10;
/** Right answers in a row it takes to move up one multiplier. */
export const COMBO_STEP = 3;
export const MAX_MULTIPLIER = 4;

/** What a right answer is worth before the combo, by difficulty. */
export const BASE_POINTS: Record<QuizDifficulty, number> = { easy: 10, medium: 20, hard: 30 };

/**
 * The multiplier for an answer given `correctInARow` right answers
 * immediately before it in the run: ×1 for the first three, ×2 for the next
 * three, then ×3, and ×4 from the tenth. The answer that completes a set of
 * three is still paid at the old rate; the new one starts on the next.
 */
export function comboMultiplier(correctInARow: number): number {
  const before = Math.max(0, Math.floor(correctInARow));
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(before / COMBO_STEP));
}

/** A run in progress. */
export type RunState = {
  answered: number;
  correct: number;
  /** Right answers in a row, as of the last answer. */
  combo: number;
  score: number;
};

export function newRun(): RunState {
  return { answered: 0, correct: 0, combo: 0, score: 0 };
}

export type AnswerScore = {
  /** What this answer scored: base times `multiplier`, or 0 for a wrong one. */
  points: number;
  /** The multiplier this answer was paid at (1 for a wrong answer, which pays nothing). */
  multiplier: number;
  /** Right answers in a row after this one. */
  combo: number;
  /** What the next right answer will be paid at, for showing "x2" ahead of time. */
  nextMultiplier: number;
  /** The run with this answer folded in. */
  run: RunState;
};

/** Folds one answer into a run. A wrong answer scores nothing and breaks the combo. */
export function scoreAnswer(run: RunState, correct: boolean, difficulty: QuizDifficulty): AnswerScore {
  const multiplier = comboMultiplier(run.combo);
  const points = correct ? BASE_POINTS[difficulty] * multiplier : 0;
  const combo = correct ? run.combo + 1 : 0;
  return {
    points,
    multiplier: correct ? multiplier : 1,
    combo,
    nextMultiplier: comboMultiplier(combo),
    run: {
      answered: run.answered + 1,
      correct: run.correct + (correct ? 1 : 0),
      combo,
      score: run.score + points,
    },
  };
}

export type RunStars = 0 | 1 | 2 | 3;

/** 0 stars below 5 right, 1 for 5 to 7, 2 for 8 and 9, 3 for all 10. */
export function runStars(correct: number): RunStars {
  if (correct >= RUN_LENGTH) return 3;
  if (correct >= 8) return 2;
  if (correct >= 5) return 1;
  return 0;
}

export type RunResult = {
  correct: number;
  total: number;
  score: number;
  stars: RunStars;
  /** Every question right. */
  perfect: boolean;
};

/** The outcome of a run, once its questions are answered. */
export function finishRun(run: RunState): RunResult {
  return {
    correct: run.correct,
    total: run.answered,
    score: run.score,
    stars: runStars(run.correct),
    perfect: run.answered >= RUN_LENGTH && run.correct === run.answered,
  };
}

/** The event to record when a run ends. */
export function runEvent(difficulty: QuizDifficulty, result: RunResult): GameEvent {
  return {
    type: 'quiz-run',
    difficulty,
    correct: result.correct,
    total: result.total,
    score: result.score,
  };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'quiz-answer'; correct: boolean; itemId?: string; mode: QuizMode }
  | { type: 'quiz-run'; difficulty: QuizDifficulty; correct: number; total: number; score: number }
  | { type: 'lesson-done'; lessonId: string }
  | { type: 'song-played'; songId: string }
  | { type: 'tuned-all' };

/** What one event paid out, for a toast or a results screen to show. */
export type Award = {
  /** XP earned by this event, the first-practice bonus included. */
  xp: number;
  levelBefore: number;
  levelAfter: number;
  /** Ids of achievements this event unlocked, in catalogue order. */
  unlocked: string[];
  /** The day streak after this event. */
  dayStreak: number;
  /** This was the first practice of the day, so the +10 is in `xp` and the day streak just moved. */
  firstOfDay: boolean;
  /** Quiz runs only: the score beat the best at that difficulty. */
  newBest?: boolean;
};

type Outcome = { state: ProgressState; xp: number; newBest?: boolean };

/** Whole numbers only, never negative: an event is data from the UI, and XP must not be able to go backwards. */
function count(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function applyQuizRun(
  state: ProgressState,
  event: Extract<GameEvent, { type: 'quiz-run' }>,
): Outcome | null {
  // A run is RUN_LENGTH questions. Anything else is not one, and counting it would
  // let a 1-for-1 "run" pass for a perfect one.
  if (event.total !== RUN_LENGTH) return null;

  const correct = Math.min(RUN_LENGTH, count(event.correct));
  const score = count(event.score);
  const stars = runStars(correct);
  const previous = state.quizBests[event.difficulty];
  const newBest = score > previous.best;

  const quizBests = {
    ...state.quizBests,
    [event.difficulty]: {
      best: Math.max(previous.best, score),
      stars: Math.max(previous.stars, stars) as RunStars,
      runs: previous.runs + 1,
    },
  };
  const xp = stars * XP.runStar + (correct === RUN_LENGTH ? XP.runPerfect : 0);
  return { state: { ...state, quizBests }, xp, newBest };
}

function applySongPlayed(state: ProgressState, songId: string, today: string): Outcome {
  const first = !state.songsPlayed.includes(songId);
  const songsPlayed = first ? [...state.songsPlayed, songId] : state.songsPlayed;

  const todays = state.songsToday.date === today ? state.songsToday.ids : [];
  if (todays.includes(songId)) {
    return { state: { ...state, songsPlayed }, xp: 0 };
  }
  return {
    state: { ...state, songsPlayed, songsToday: { date: today, ids: [...todays, songId] } },
    xp: first ? XP.songFirst : XP.songRepeat,
  };
}

function applyOutcome(
  state: ProgressState,
  event: GameEvent,
  today: string,
  nowMs: number,
): Outcome | null {
  switch (event.type) {
    case 'quiz-answer':
      return {
        state: applyAnswer(state, event.correct, today, event.itemId, nowMs),
        xp: event.correct ? XP.quizCorrect[event.mode] : 0,
      };
    case 'quiz-run':
      return applyQuizRun(state, event);
    case 'lesson-done': {
      if (event.lessonId === '') return null;
      if (state.lessonsDone.includes(event.lessonId)) return { state, xp: 0 };
      return {
        state: { ...state, lessonsDone: addLessonDone(state.lessonsDone, event.lessonId) },
        xp: XP.lesson,
      };
    }
    case 'song-played':
      return event.songId === '' ? null : applySongPlayed(state, event.songId, today);
    case 'tuned-all':
      return {
        state: { ...state, tunedAllDate: today },
        xp: state.tunedAllDate === today ? 0 : XP.tunedAll,
      };
  }
}

/**
 * The one way anything that happens in the app changes the game: records the
 * practice day and day streak, pays the XP, updates the counters and bests the
 * event touches, and unlocks whatever achievements the new state now earns.
 * Pure: `now` is the only clock, and the date it falls on locally is "today".
 *
 * A quiz answer still goes through `applyAnswer`, so the answer streak, the
 * daily tally and the spaced-repetition schedule behave exactly as before.
 */
export function applyGameEvent(
  state: ProgressState,
  event: GameEvent,
  now: Date,
): { state: ProgressState; award: Award } {
  const today = localDateIso(now);
  const levelBefore = levelForXp(state.xp);

  const outcome = applyOutcome(state, event, today, now.getTime());
  if (outcome === null) {
    return {
      state,
      award: {
        xp: 0,
        levelBefore,
        levelAfter: levelBefore,
        unlocked: [],
        dayStreak: activeDayStreak(state.dayStreak, today),
        firstOfDay: false,
      },
    };
  }

  let next = outcome.state;
  let xp = outcome.xp;

  // Every event is practice, so the first of the day starts the day's streak and pays its bonus.
  const firstOfDay = !next.practiceDays.includes(today);
  if (firstOfDay) {
    xp += XP.firstPracticeOfDay;
    next = {
      ...next,
      practiceDays: addPracticeDay(next.practiceDays, today),
      dayStreak: advanceDayStreak(next.dayStreak, today),
    };
  }

  next = { ...next, xp: next.xp + xp };

  // Last, so the predicates see the XP and counters this event just added.
  const unlocked = newlyEarned(next);
  next = unlockAchievements(next, unlocked, today);

  const award: Award = {
    xp,
    levelBefore,
    levelAfter: levelForXp(next.xp),
    unlocked,
    dayStreak: activeDayStreak(next.dayStreak, today),
    firstOfDay,
  };
  if (outcome.newBest !== undefined) award.newBest = outcome.newBest;
  return { state: next, award };
}
