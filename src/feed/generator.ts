import { CHORDS, RIFFS, type Riff } from '@/content';
import type { ChordShape } from '@/music';
import { generateChordQuestion, generateNoteQuestion, type QuizQuestion } from '@/quiz';

export type FeedItem =
  | { kind: 'riff'; id: string; riff: Riff }
  | { kind: 'chord'; id: string; chord: ChordShape }
  | { kind: 'quiz'; id: string; question: QuizQuestion };

export type FeedKind = FeedItem['kind'];

/** Target mix of the feed, per the design spec. */
export const COMPOSITION: Record<FeedKind, number> = { riff: 0.55, chord: 0.3, quiz: 0.15 };
/** No piece of content comes back around inside this many cards. */
export const NO_REPEAT_WINDOW = 15;
/** A quiz can't appear closer together than this, and never further apart than the max. */
export const QUIZ_MIN_GAP = 3;
export const QUIZ_MAX_GAP = 5;
/** Cap on how many cards in a row may share a kind. */
const MAX_RUN = 2;

export type FeedCursor = {
  /**
   * Recently shown ids, newest last, tracked per pool. Sharing one list
   * across pools lets chords crowd riffs out of their own window, and with
   * a library smaller than the window that silently degrades into repeats.
   */
  recentRiffIds: string[];
  recentChordIds: string[];
  /** Cards emitted since the last quiz. */
  sinceQuiz: number;
  /** Total cards emitted, so every card gets a unique key. */
  sequence: number;
  lastKind: FeedKind | null;
  runLength: number;
  /** Quizzes alternate note/chord rather than clumping. */
  nextQuizIsNote: boolean;
};

export function emptyCursor(): FeedCursor {
  return {
    recentRiffIds: [],
    recentChordIds: [],
    sinceQuiz: 0,
    sequence: 0,
    lastKind: null,
    runLength: 0,
    nextQuizIsNote: true,
  };
}

/** Small seeded PRNG, so a feed can be reproduced exactly in a test. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickKind(cursor: FeedCursor, random: () => number): FeedKind {
  // Open on something playable. Being tested before you've heard a note is
  // the fastest way to make someone close the app.
  if (cursor.sequence === 0) return 'riff';

  // A quiz is due: the feed promised one every few cards.
  if (cursor.sinceQuiz >= QUIZ_MAX_GAP) return 'quiz';

  const quizAllowed = cursor.sinceQuiz >= QUIZ_MIN_GAP;
  const candidates: FeedKind[] = quizAllowed ? ['riff', 'chord', 'quiz'] : ['riff', 'chord'];

  // Never a third card of the same kind in a row — that is what makes a feed
  // feel like a list instead of a shuffle.
  const allowed = candidates.filter(
    (kind) => !(kind === cursor.lastKind && cursor.runLength >= MAX_RUN),
  );
  const pool = allowed.length > 0 ? allowed : candidates;

  const total = pool.reduce((sum, kind) => sum + COMPOSITION[kind], 0);
  let roll = random() * total;
  for (const kind of pool) {
    roll -= COMPOSITION[kind];
    if (roll <= 0) return kind;
  }
  return pool[pool.length - 1] ?? 'riff';
}

/** Picks content the feed hasn't shown recently, falling back to the full pool. */
function pickContent<T extends { id: string }>(
  pool: readonly T[],
  recentIds: string[],
  random: () => number,
): T {
  const fresh = pool.filter((item) => !recentIds.includes(item.id));
  const from = fresh.length > 0 ? fresh : pool;
  const picked = from[Math.floor(random() * from.length)];
  if (picked === undefined) throw new Error('feed generator was given an empty content pool');
  return picked;
}

/**
 * Keeps the last N ids for one pool. The window can never exceed
 * `poolSize - 1`, or every candidate would be excluded and the rule would
 * quietly collapse into the repeats it exists to prevent.
 */
function remember(recentIds: string[], id: string, poolSize: number): string[] {
  const limit = Math.max(0, Math.min(NO_REPEAT_WINDOW, poolSize - 1));
  const next = [...recentIds, id];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/**
 * Produces the next page of feed cards.
 *
 * Pure given `random`, so a seeded run is reproducible and the composition
 * rules are testable. The cursor threads through calls, which is what lets
 * the feed keep generating forever without repeating itself.
 */
export function generateFeedPage(
  count: number,
  cursor: FeedCursor = emptyCursor(),
  random: () => number = Math.random,
): { items: FeedItem[]; cursor: FeedCursor } {
  const items: FeedItem[] = [];
  let next = { ...cursor };

  for (let i = 0; i < count; i += 1) {
    const kind = pickKind(next, random);
    const sequence = next.sequence + 1;
    const runLength = kind === next.lastKind ? next.runLength + 1 : 1;

    if (kind === 'riff') {
      const riff = pickContent(RIFFS, next.recentRiffIds, random);
      items.push({ kind, id: `feed-${sequence}-${riff.id}`, riff });
      next = {
        ...next,
        recentRiffIds: remember(next.recentRiffIds, riff.id, RIFFS.length),
        sinceQuiz: next.sinceQuiz + 1,
        sequence,
        lastKind: kind,
        runLength,
      };
      continue;
    }

    if (kind === 'chord') {
      const chord = pickContent(CHORDS, next.recentChordIds, random);
      items.push({ kind, id: `feed-${sequence}-${chord.id}`, chord });
      next = {
        ...next,
        recentChordIds: remember(next.recentChordIds, chord.id, CHORDS.length),
        sinceQuiz: next.sinceQuiz + 1,
        sequence,
        lastKind: kind,
        runLength,
      };
      continue;
    }

    const question = next.nextQuizIsNote
      ? generateNoteQuestion({ random })
      : generateChordQuestion({ random });
    items.push({ kind, id: `feed-${sequence}-${question.id}`, question });
    next = {
      ...next,
      sinceQuiz: 0,
      sequence,
      lastKind: kind,
      runLength,
      nextQuizIsNote: !next.nextQuizIsNote,
    };
  }

  return { items, cursor: next };
}
