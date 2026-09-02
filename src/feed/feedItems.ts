import { CHORDS, RIFFS, type Riff } from '@/content';
import type { ChordShape } from '@/music';
import { generateChordQuestion, generateNoteQuestion, type QuizQuestion } from '@/quiz';

export type FeedItem =
  | { kind: 'riff'; id: string; riff: Riff }
  | { kind: 'chord'; id: string; chord: ChordShape }
  | { kind: 'quiz'; id: string; question: QuizQuestion };

/** Riff / chord / quiz interleave from the design handoff's 9-card feed. */
const FEED_PATTERN: readonly FeedItem['kind'][] = [
  'riff', 'chord', 'quiz',
  'chord', 'riff', 'quiz',
  'riff', 'chord', 'quiz',
];

function at<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) throw new Error('at() called with an empty list');
  return item;
}

/** Builds the Feed's card list. Deterministic content cycles; quiz questions are randomized. */
export function buildFeedItems(opts: { random?: () => number } = {}): FeedItem[] {
  const random = opts.random ?? Math.random;
  let riffCursor = 0;
  let chordCursor = 0;
  let nextQuizIsNote = true;

  return FEED_PATTERN.map((kind, i) => {
    if (kind === 'riff') {
      const riff = at(RIFFS, riffCursor);
      riffCursor += 1;
      return { kind, id: `feed-${i}-${riff.id}`, riff } as const;
    }
    if (kind === 'chord') {
      const chord = at(CHORDS, chordCursor);
      chordCursor += 1;
      return { kind, id: `feed-${i}-${chord.id}`, chord } as const;
    }
    const question = nextQuizIsNote
      ? generateNoteQuestion({ random })
      : generateChordQuestion({ random });
    nextQuizIsNote = !nextQuizIsNote;
    return { kind, id: `feed-${i}-${question.id}`, question } as const;
  });
}
