import { newlyEarned, unlockAchievements } from './achievements';
import { addDays, isIsoDate, localDateIso } from './dates';
import { XP } from './game';
import { dayStreakFromDays, PRACTICE_KEEP_DAYS } from './practice';
import {
  DEFAULT_SETTINGS,
  PROGRESS_VERSION,
  QUIZ_DIFFICULTIES,
  emptyProgressState,
  emptyQuizBests,
  type DailyStat,
  type DayStreak,
  type ProgressState,
  type QuizBest,
  type QuizDifficulty,
  type SrsItem,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSrsItem(value: unknown): value is SrsItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.dueAt === 'number' &&
    typeof value.intervalDays === 'number' &&
    typeof value.ease === 'number' &&
    typeof value.reps === 'number' &&
    typeof value.lapses === 'number'
  );
}

function isDailyStat(value: unknown): value is DailyStat {
  if (!isRecord(value)) return false;
  return (
    typeof value.date === 'string' &&
    typeof value.answered === 'number' &&
    typeof value.correct === 'number'
  );
}

/** A whole number from storage, never negative; anything else is 0. */
function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string'))]
    : [];
}

function readDates(value: unknown, today: string): string[] {
  const cutoff = addDays(today, -PRACTICE_KEEP_DAYS);
  return [...new Set(Array.isArray(value) ? value.filter(isIsoDate) : [])]
    .filter((day) => day >= cutoff)
    .sort();
}

function readQuizBests(value: unknown): Record<QuizDifficulty, QuizBest> {
  const bests = emptyQuizBests();
  if (!isRecord(value)) return bests;
  for (const difficulty of QUIZ_DIFFICULTIES) {
    const entry = value[difficulty];
    if (!isRecord(entry)) continue;
    const stars = readCount(entry.stars);
    bests[difficulty] = {
      best: readCount(entry.best),
      stars: stars >= 3 ? 3 : stars === 2 ? 2 : stars === 1 ? 1 : 0,
      runs: readCount(entry.runs),
    };
  }
  return bests;
}

/** The stored streak, or one rebuilt from the practice days when what is stored will not do. */
function readDayStreak(value: unknown, practiceDays: readonly string[]): DayStreak {
  if (!isRecord(value)) return dayStreakFromDays(practiceDays);
  const lastDate = value.lastDate === null ? null : isIsoDate(value.lastDate) ? value.lastDate : undefined;
  if (lastDate === undefined) return dayStreakFromDays(practiceDays);

  const current = readCount(value.current);
  return { current, longest: Math.max(current, readCount(value.longest)), lastDate };
}

/** The fields version 1 and 2 share. A bad entry is dropped, not trusted. */
function readCommon(raw: Record<string, unknown>): ProgressState {
  const base = emptyProgressState();

  const srs: Record<string, SrsItem> = {};
  if (isRecord(raw.srs)) {
    for (const [key, value] of Object.entries(raw.srs)) {
      if (isSrsItem(value)) srs[key] = value;
    }
  }

  const daily: Record<string, DailyStat> = {};
  if (isRecord(raw.daily)) {
    for (const [key, value] of Object.entries(raw.daily)) {
      if (isDailyStat(value)) daily[key] = value;
    }
  }

  const seenContent = Array.isArray(raw.seenContent)
    ? raw.seenContent.filter((id): id is string => typeof id === 'string')
    : [];

  // Optional on purpose: a state saved before the course existed has no such
  // field, and that is not corruption, just "no lessons done yet".
  const lessonsDone = Array.isArray(raw.lessonsDone)
    ? [...new Set(raw.lessonsDone.filter((id): id is string => typeof id === 'string'))]
    : [];

  const streak = isRecord(raw.streak)
    ? {
        current: typeof raw.streak.current === 'number' ? raw.streak.current : 0,
        longest: typeof raw.streak.longest === 'number' ? raw.streak.longest : 0,
        lastActiveDate:
          typeof raw.streak.lastActiveDate === 'string' ? raw.streak.lastActiveDate : null,
      }
    : base.streak;

  const settings = isRecord(raw.settings)
    ? {
        preferFlats:
          typeof raw.settings.preferFlats === 'boolean'
            ? raw.settings.preferFlats
            : DEFAULT_SETTINGS.preferFlats,
        defaultSpeed:
          typeof raw.settings.defaultSpeed === 'number'
            ? raw.settings.defaultSpeed
            : DEFAULT_SETTINGS.defaultSpeed,
        toneId:
          typeof raw.settings.toneId === 'string'
            ? raw.settings.toneId
            : DEFAULT_SETTINGS.toneId,
      }
    : { ...DEFAULT_SETTINGS };

  return { ...base, srs, seenContent, streak, daily, lessonsDone, settings };
}

/** The game fields of a version 2 state. */
function readGame(raw: Record<string, unknown>, today: string): Partial<ProgressState> {
  const practiceDays = readDates(raw.practiceDays, today);

  const achievements: Record<string, string> = {};
  if (isRecord(raw.achievements)) {
    for (const [id, date] of Object.entries(raw.achievements)) {
      if (isIsoDate(date)) achievements[id] = date;
    }
  }

  const songsToday =
    isRecord(raw.songsToday) && typeof raw.songsToday.date === 'string'
      ? { date: raw.songsToday.date, ids: readStrings(raw.songsToday.ids) }
      : { date: '', ids: [] };

  return {
    xp: readCount(raw.xp),
    practiceDays,
    dayStreak: readDayStreak(raw.dayStreak, practiceDays),
    achievements,
    quizBests: readQuizBests(raw.quizBests),
    songsPlayed: readStrings(raw.songsPlayed),
    songsToday,
    tunedAllDate: isIsoDate(raw.tunedAllDate) ? raw.tunedAllDate : null,
  };
}

/**
 * Builds the game fields for progress saved before there was a game, from what
 * that progress already proves, so a long-time player does not start at level
 * 1 with an empty trophy case. Days they answered questions become practice
 * days; lessons finished and questions answered right are paid at today's
 * rates; achievements the data earns are unlocked, dated `today`.
 */
function upgradeFromV1(state: ProgressState, today: string): ProgressState {
  const answeredDays = Object.entries(state.daily)
    .filter(([date, stat]) => isIsoDate(date) && stat.answered > 0)
    .map(([date]) => date);
  const practiceDays = readDates(answeredDays, today);

  const correctAnswers = Object.values(state.daily).reduce((sum, stat) => sum + readCount(stat.correct), 0);
  const upgraded: ProgressState = {
    ...state,
    xp: state.lessonsDone.length * XP.lesson + correctAnswers * XP.quizCorrect.practice,
    practiceDays,
    dayStreak: dayStreakFromDays(practiceDays),
  };
  return unlockAchievements(upgraded, newlyEarned(upgraded), today);
}

/**
 * Turns whatever came out of storage into a usable state. Anything
 * unrecognised is discarded rather than trusted: a corrupt blob must not be
 * able to crash the app on launch, and a lost streak beats a broken app.
 *
 * A version 1 state is upgraded, not discarded. `now` is only the date the
 * upgrade stamps on the achievements it unlocks.
 */
export function migrate(raw: unknown, now: Date = new Date()): ProgressState {
  if (!isRecord(raw) || (raw.version !== 1 && raw.version !== PROGRESS_VERSION)) {
    return emptyProgressState();
  }

  const today = localDateIso(now);
  const common = readCommon(raw);
  if (raw.version === 1) return upgradeFromV1(common, today);
  return { ...common, ...readGame(raw, today) };
}
