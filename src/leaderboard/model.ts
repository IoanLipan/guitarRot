/**
 * What a leaderboard row is, how XP turns into writes to it, and how rows are
 * ranked. Plain data and plain functions: no Firebase in here, so all of it
 * is tested without a database. `service.ts` is the part that talks to Firestore.
 */
import type { InstrumentId } from '@/music';
import { levelForXp } from '@/progress/levels';
import { NAME_MAX, NAME_MIN, NAME_PATTERN } from './name';
import { WEEK_KEY } from './week';

export const LEADERBOARD_COLLECTION = 'leaderboard';

/** Rows shown in a list. */
export const BOARD_SIZE = 25;

/** The most XP (all-time or weekly) one write may add. The rules enforce the same limit. */
export const MAX_STEP = 2000;

/** The list people look at: this week's XP, or all of it. */
export type BoardKind = 'week' | 'all';

/** What is stored at `leaderboard/{uid}`, apart from `updatedAt` (the server's clock, set on every write). */
export type EntryData = {
  /** Public. Never an email address. */
  name: string;
  level: number;
  /** All-time XP, mirrored from the player's progress. */
  xp: number;
  /** The ISO week `weekXp` counts, `YYYY-Www`. */
  weekKey: string;
  /** XP earned in `weekKey`. A row whose week is not this week has none to show. */
  weekXp: number;
  /** The instrument being learned when the row was last written. */
  instrument: InstrumentId;
};

export type BoardEntry = EntryData & { uid: string };

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** A stored row, or null when it is not one this app wrote (a hand-edited or half-written document). */
export function parseEntry(uid: string, data: unknown): BoardEntry | null {
  if (typeof data !== 'object' || data === null) return null;
  const row = data as Record<string, unknown>;
  const { name, level, xp, weekKey, weekXp, instrument } = row;
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) return null;
  const length = Array.from(name).length;
  if (length < NAME_MIN || length > NAME_MAX) return null;
  if (!isCount(level) || level < 1 || !isCount(xp) || !isCount(weekXp)) return null;
  if (typeof weekKey !== 'string' || !WEEK_KEY.test(weekKey)) return null;
  if (instrument !== 'guitar' && instrument !== 'ukulele') return null;
  return { uid, name, level, xp, weekKey, weekXp, instrument };
}

/** This week's XP of a row: nothing if its week is an earlier one. */
export function weekXpOf(entry: Pick<EntryData, 'weekKey' | 'weekXp'>, weekKey: string): number {
  return entry.weekKey === weekKey ? entry.weekXp : 0;
}

/** The number a list is ordered by. */
export function scoreOf(entry: EntryData, kind: BoardKind, weekKey: string): number {
  return kind === 'week' ? weekXpOf(entry, weekKey) : entry.xp;
}

export type RankedEntry = BoardEntry & { rank: number; score: number };

/**
 * Numbers rows that are already in order, best first. Players on the same
 * score share a rank and the next rank skips (1, 2, 2, 4), which is what
 * "players with more XP, plus one" gives for a player counted from the database.
 */
export function rankEntries(entries: readonly BoardEntry[], kind: BoardKind, weekKey: string): RankedEntry[] {
  const ranked: RankedEntry[] = [];
  entries.forEach((entry, index) => {
    const score = scoreOf(entry, kind, weekKey);
    const before = ranked[index - 1];
    ranked.push({ ...entry, score, rank: before !== undefined && before.score === score ? before.rank : index + 1 });
  });
  return ranked;
}

// --- Writing XP ---------------------------------------------------------------

/** One update to the player's row, before it is turned into Firestore field values. */
export type EntryPatch = {
  /** All-time XP to add, at most {@link MAX_STEP}. An increment, not a total: see `planUpdates`. */
  xpDelta: number;
  /** The level the row's XP comes to once this patch is in. */
  level: number;
  instrument: InstrumentId;
  /** What happens to the weekly count: nothing, add to it (an atomic increment), or begin a new week. */
  week: { kind: 'none' } | { kind: 'add'; xp: number } | { kind: 'start'; weekKey: string; xp: number };
};

function whole(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * The writes that bring a row up to date with the player.
 *
 *  - All-time XP follows the player's own progress: the row is brought up to
 *    `localXp`, and never below what it already holds (the rules refuse that).
 *    It is raised by an increment of the difference rather than set to a
 *    total, so writes that were queued while a phone was offline, or made by
 *    a second phone, cannot be refused for looking like a step backwards.
 *    Increments are at most {@link MAX_STEP} each: a player back from a long
 *    time signed out, or restored on a new phone, catches up over a few writes.
 *  - `earned` is the XP that came in since the last write. It is added to the
 *    week with an increment, so two phones adding at once both count; the
 *    first XP of a later week starts that week instead. A phone whose clock is
 *    behind the row's week adds to the row's week rather than going back.
 *
 * An empty list means the row is already current.
 */
export function planUpdates(
  entry: EntryData,
  input: { weekKey: string; earned: number; localXp: number; instrument: InstrumentId },
): EntryPatch[] {
  const earned = whole(input.earned);
  const target = Math.max(whole(input.localXp), entry.xp);
  const startsWeek = earned > 0 && input.weekKey > entry.weekKey;

  const weekSteps: number[] = [];
  for (let left = earned; left > 0; left -= MAX_STEP) weekSteps.push(Math.min(left, MAX_STEP));
  const count = Math.max(Math.ceil((target - entry.xp) / MAX_STEP), weekSteps.length);

  const patches: EntryPatch[] = [];
  let xp = entry.xp;
  for (let step = 0; step < count; step += 1) {
    const xpDelta = Math.min(target - xp, MAX_STEP);
    xp += xpDelta;
    const added = weekSteps[step];
    const week: EntryPatch['week'] =
      added === undefined
        ? { kind: 'none' }
        : step === 0 && startsWeek
          ? { kind: 'start', weekKey: input.weekKey, xp: added }
          : { kind: 'add', xp: added };
    patches.push({ xpDelta, level: levelForXp(xp), instrument: input.instrument, week });
  }
  return patches;
}
