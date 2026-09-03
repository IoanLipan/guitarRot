import { NOTE_QUIZ_FRET_RANGE, chordQuestionFor, noteQuestionAt } from '@/quiz';
import { getChord, getRiff, getSong, type Song } from '@/content';
import { STRING_COUNT } from '@/music';
import type { FeedItem } from '@/feed/generator';
import type { ShareTarget } from './shareId';

/** Where a resolved link lands: a card in the feed, or a song in the browser. */
export type SharedContent =
  | { tab: 'feed'; item: FeedItem }
  | { tab: 'songs'; song: Song };

/** The stable, position-independent address of a feed card. */
export function shareTargetOf(item: FeedItem): ShareTarget {
  if (item.kind === 'riff') return { kind: 'riff', id: item.riff.id };
  if (item.kind === 'chord') return { kind: 'chord', id: item.chord.id };
  return { kind: 'quiz', id: item.question.id };
}

const NOTE_QUESTION = /^note-s(\d+)f(\d+)$/;

/**
 * Rebuilds a quiz from its id. Quiz cards are generated rather than
 * authored, so a shared one is reconstructed from the fret or chord its id
 * names — the answers get reshuffled, which is fine: the question is what
 * was shared.
 */
function resolveQuiz(id: string): FeedItem | null {
  const note = NOTE_QUESTION.exec(id);
  if (note !== null) {
    const stringIndex = Number(note[1]);
    const fret = Number(note[2]);
    const [lowFret, highFret] = NOTE_QUIZ_FRET_RANGE;
    if (stringIndex >= STRING_COUNT || fret < lowFret || fret > highFret) return null;
    return { kind: 'quiz', id: `shared-quiz-${id}`, question: noteQuestionAt(stringIndex, fret) };
  }

  if (id.startsWith('chord-')) {
    const chord = getChord(id.slice('chord-'.length));
    if (chord === undefined) return null;
    return { kind: 'quiz', id: `shared-quiz-${id}`, question: chordQuestionFor(chord) };
  }

  return null;
}

export function resolveShareTarget(target: ShareTarget): SharedContent | null {
  if (target.kind === 'riff') {
    const riff = getRiff(target.id);
    return riff === undefined ? null : { tab: 'feed', item: { kind: 'riff', id: `shared-riff-${riff.id}`, riff } };
  }

  if (target.kind === 'chord') {
    const chord = getChord(target.id);
    return chord === undefined
      ? null
      : { tab: 'feed', item: { kind: 'chord', id: `shared-chord-${chord.id}`, chord } };
  }

  if (target.kind === 'song') {
    const song = getSong(target.id);
    return song === undefined ? null : { tab: 'songs', song };
  }

  const item = resolveQuiz(target.id);
  return item === null ? null : { tab: 'feed', item };
}

/** What a shared card is called, for the OS share sheet's preview. */
export function shareTitleOf(item: FeedItem): string {
  if (item.kind === 'riff') return item.riff.title;
  if (item.kind === 'chord') return `${item.chord.name} chord`;
  return item.question.prompt;
}
