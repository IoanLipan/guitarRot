import { addDays, isIsoDate } from './dates';
import { dayStreakFromDays, PRACTICE_KEEP_DAYS } from './practice';
import {
  DAILY_KEEP_DAYS,
  PROGRESS_VERSION,
  QUIZ_DIFFICULTIES,
  emptyProgressState,
  emptyQuizBests,
  pruneDaily,
  type DailyStat,
  type DayStreak,
  type ProgressState,
  type QuizBest,
  type QuizDifficulty,
  type Settings,
  type SrsItem,
} from './types';

/**
 * Folds the progress held in the cloud into the progress on this device, so
 * signing in on a new phone never loses anything and two phones that played
 * apart end up with both.
 *
 * Neither side wins as a whole. Every field has its own rule, and the rules
 * are chosen so that merging is a union of what each side knows:
 *
 *  - idempotent: `merge(a, merge(a, b))` equals `merge(a, b)`, so merging the
 *    same remote twice (a snapshot arriving again) changes nothing;
 *  - order-insensitive for everything that is synced: `merge(a, b)` and
 *    `merge(b, a)` agree on every field except the few that are deliberately
 *    this device's own (`settings`, `seenContent`) and the order of the
 *    lists that are sets in disguise (`lessonsDone`, `songsPlayed`). That is
 *    what lets phones that merge the same documents settle on the same
 *    progress instead of overwriting each other forever; see
 *    {@link syncSignature}.
 *
 * The inputs must already be valid progress (run unknown data through
 * `migrate` first). Nothing is mutated.
 */
export function mergeProgress(local: ProgressState, remote: ProgressState): ProgressState {
  const practiceDays = mergePracticeDays(local.practiceDays, remote.practiceDays);
  return {
    version: PROGRESS_VERSION,
    // ponytail: XP earned offline on two phones at the same time isn't summed, the bigger total
    // wins, so one of the two sessions' XP is lost. Upgrade path: a per-device ledger
    // (`xpByDevice`, sum the devices) once anybody actually plays on two phones at once.
    xp: Math.max(local.xp, remote.xp),
    lessonsDone: unionInOrder(local.lessonsDone, remote.lessonsDone),
    achievements: mergeAchievements(local.achievements, remote.achievements),
    practiceDays,
    dayStreak: mergeDayStreak(practiceDays, local.dayStreak, remote.dayStreak),
    streak: mergeStreak(local.streak, remote.streak),
    daily: mergeDaily(local.daily, remote.daily),
    quizBests: mergeQuizBests(local.quizBests, remote.quizBests),
    songsPlayed: unionInOrder(local.songsPlayed, remote.songsPlayed),
    songsToday: mergeSongsToday(local.songsToday, remote.songsToday),
    tunedAllDate: laterDate(local.tunedAllDate, remote.tunedAllDate),
    srs: mergeSrs(local.srs, remote.srs),
    // What was shown on this phone is this phone's business.
    seenContent: [...local.seenContent],
    settings: mergeSettings(local.settings, remote.settings, isPristine(local)),
  };
}

/** Nothing earned yet: a phone fresh out of the box, whatever it has been told about the instrument. */
function isPristine(state: ProgressState): boolean {
  return syncSignature(state) === syncSignature(emptyProgressState());
}

/** `first`, then whatever `second` has that `first` does not, each in its own order. */
function unionInOrder(first: readonly string[], second: readonly string[]): string[] {
  return [...new Set([...first, ...second])];
}

function laterDate(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}

function mergeAchievements(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = { ...a };
  for (const [id, date] of Object.entries(b)) {
    const mine = merged[id];
    // Unlocks are permanent; when both phones unlocked one, it was first unlocked on the earlier date.
    if (mine === undefined || date < mine) merged[id] = date;
  }
  return merged;
}

/** Practice days from both, sorted, once each, and no older than a streak can still care about. */
function mergePracticeDays(a: readonly string[], b: readonly string[]): string[] {
  const days = [...new Set([...a, ...b])].filter(isIsoDate).sort();
  const latest = days[days.length - 1];
  if (latest === undefined) return [];
  const cutoff = addDays(latest, -PRACTICE_KEEP_DAYS);
  return days.filter((day) => day >= cutoff);
}

/** The streak with the later last day; on the same day, the longer one. Nothing beats a streak that has a day. */
function laterStreak<T extends { current: number }>(a: T, b: T, dateOf: (streak: T) => string | null): T {
  const dateA = dateOf(a);
  const dateB = dateOf(b);
  if (dateA === dateB) return b.current > a.current ? b : a;
  if (dateA === null) return b;
  if (dateB === null) return a;
  return dateB > dateA ? b : a;
}

/**
 * The day streak is rebuilt from the merged practice days, so a streak that
 * runs across days practised on different phones is one streak. The stored
 * streaks stay candidates (the days that proved an old one may be past the
 * keep window, and a state without days must not be zeroed), and the best
 * run ever is the best of all of them.
 */
function mergeDayStreak(practiceDays: readonly string[], a: DayStreak, b: DayStreak): DayStreak {
  const rebuilt = dayStreakFromDays(practiceDays);
  const dateOf = (streak: DayStreak) => streak.lastDate;
  const latest = laterStreak(laterStreak(rebuilt, a, dateOf), b, dateOf);
  return {
    current: latest.current,
    longest: Math.max(rebuilt.longest, a.longest, a.current, b.longest, b.current),
    lastDate: latest.lastDate,
  };
}

/** The answer streak: the current run is the later phone's, the longest is the longest of either. */
function mergeStreak(a: ProgressState['streak'], b: ProgressState['streak']): ProgressState['streak'] {
  const latest = laterStreak(a, b, (streak) => streak.lastActiveDate);
  return {
    current: latest.current,
    // A run that is current on either phone has happened, whatever that phone's own longest says.
    longest: Math.max(a.longest, a.current, b.longest, b.current),
    lastActiveDate: latest.lastActiveDate,
  };
}

/**
 * Each day keeps the bigger of the two tallies.
 * ponytail: answers given on the same day on two phones aren't added up (like XP, same upgrade path).
 */
function mergeDaily(a: Record<string, DailyStat>, b: Record<string, DailyStat>): Record<string, DailyStat> {
  const merged: Record<string, DailyStat> = {};
  for (const source of [a, b]) {
    for (const [date, stat] of Object.entries(source)) {
      const mine = merged[date];
      merged[date] = {
        date,
        answered: Math.max(mine?.answered ?? 0, stat.answered),
        correct: Math.max(mine?.correct ?? 0, stat.correct),
      };
    }
  }
  const latest = Object.keys(merged).filter(isIsoDate).sort().pop();
  return latest === undefined ? merged : pruneDaily(merged, DAILY_KEEP_DAYS, latest);
}

function mergeQuizBests(
  a: Record<QuizDifficulty, QuizBest>,
  b: Record<QuizDifficulty, QuizBest>,
): Record<QuizDifficulty, QuizBest> {
  const merged = emptyQuizBests();
  for (const difficulty of QUIZ_DIFFICULTIES) {
    const [mine, theirs] = [a[difficulty], b[difficulty]];
    merged[difficulty] = {
      best: Math.max(mine.best, theirs.best),
      stars: Math.max(mine.stars, theirs.stars) as QuizBest['stars'],
      runs: Math.max(mine.runs, theirs.runs),
    };
  }
  return merged;
}

/** The later day's list; on the same day, the songs of both, so neither phone pays XP for a song twice. */
function mergeSongsToday(a: ProgressState['songsToday'], b: ProgressState['songsToday']): ProgressState['songsToday'] {
  if (a.date > b.date) return { date: a.date, ids: [...a.ids] };
  if (b.date > a.date) return { date: b.date, ids: [...b.ids] };
  return { date: a.date, ids: unionInOrder(a.ids, b.ids) };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When an item was last reviewed. Not stored, but a review sets `dueAt` to
 * the review's time plus `intervalDays`, so the difference is that time.
 */
function reviewedAt(item: SrsItem): number {
  return item.dueAt - item.intervalDays * ONE_DAY_MS;
}

/** True when `a` was reviewed after `b`; ties go to the item with more reps, then the later `dueAt`. */
function reviewedAfter(a: SrsItem, b: SrsItem): boolean {
  return (
    reviewedAt(a) - reviewedAt(b) ||
    a.reps - b.reps ||
    a.dueAt - b.dueAt ||
    a.lapses - b.lapses ||
    a.ease - b.ease ||
    a.intervalDays - b.intervalDays
  ) > 0;
}

/** Per item, the more recent review wins; lapses only ever count up, so the larger count is kept. */
function mergeSrs(a: Record<string, SrsItem>, b: Record<string, SrsItem>): Record<string, SrsItem> {
  const merged: Record<string, SrsItem> = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const [mine, theirs] = [a[id], b[id]];
    if (mine === undefined || theirs === undefined) {
      merged[id] = { ...(mine ?? theirs!) };
      continue;
    }
    const winner = reviewedAfter(theirs, mine) ? theirs : mine;
    merged[id] = { ...winner, lapses: Math.max(mine.lapses, theirs.lapses) };
  }
  return merged;
}

/**
 * Settings are this device's preferences, so the local ones stay, with one
 * exception: a phone that has nothing yet (never asked which instrument is
 * learned, or asked a moment ago and not played since: the first screen of a
 * new phone asks before there is any way to sign in) takes the account's
 * instrument and voicings, or it would land on the guitar with a ukulele
 * player's lessons. Anything else, such as a consent switch, is never carried
 * over from another phone. Once either side has chosen, the phone counts as
 * having chosen.
 */
function mergeSettings(local: Settings, remote: Settings, localIsPristine: boolean): Settings {
  const adopt = remote.instrumentChosen && (!local.instrumentChosen || localIsPristine);
  if (!adopt) return { ...local, toneByInstrument: { ...local.toneByInstrument } };
  return {
    ...local,
    instrument: remote.instrument,
    instrumentChosen: true,
    toneId: remote.toneId,
    toneByInstrument: { ...remote.toneByInstrument },
  };
}

/**
 * Everything that is synced, in one canonical string. Two states with the
 * same signature hold the same progress: the order of the lists that are sets
 * in disguise and of object keys does not matter, and the parts that are
 * not synced (`settings`, `seenContent`, the version) are left out.
 *
 * The sync engine writes to the cloud only when the merged progress has a
 * different signature from the cloud's. That is what stops two phones with
 * different settings, or a list in a different order, from writing to each
 * other for ever.
 */
export function syncSignature(state: ProgressState): string {
  return stableStringify({
    xp: state.xp,
    lessonsDone: [...state.lessonsDone].sort(),
    achievements: state.achievements,
    practiceDays: state.practiceDays,
    dayStreak: state.dayStreak,
    streak: state.streak,
    daily: state.daily,
    quizBests: state.quizBests,
    songsPlayed: [...state.songsPlayed].sort(),
    songsToday: { date: state.songsToday.date, ids: [...state.songsToday.ids].sort() },
    tunedAllDate: state.tunedAllDate,
    srs: state.srs,
  });
}

/** JSON with every object's keys sorted, so equal data is equal text. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return item;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(item).sort()) sorted[key] = (item as Record<string, unknown>)[key];
    return sorted;
  });
}
