import { questionForId } from '@/quiz';
import { getChord, getRiff, getSong, songHome, songPlayableOn, type Song } from '@/content';
import { instrumentIdOf, type InstrumentId } from '@/music';
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

function resolveQuiz(id: string): FeedItem | null {
  const question = questionForId(id);
  return question === null ? null : { kind: 'quiz', id: `shared-quiz-${id}`, question };
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

/**
 * The instrument a shared link needs to be shown on: a ukulele chord is a
 * four-string diagram and a guitar riff a six-line tab whatever the person who
 * opens the link usually plays. A song that `current` can play stays on it;
 * one it cannot goes to the instrument it was written for.
 */
export function sharedInstrument(content: SharedContent, current: InstrumentId): InstrumentId {
  if (content.tab === 'songs') return songPlayableOn(content.song, current) ? current : songHome(content.song);
  const { item } = content;
  if (item.kind === 'riff') return instrumentIdOf(item.riff);
  if (item.kind === 'chord') return instrumentIdOf(item.chord);
  return instrumentIdOf(item.question.kind === 'note' ? item.question : item.question.chord);
}

/** What a shared card is called, for the OS share sheet's preview. */
export function shareTitleOf(item: FeedItem): string {
  if (item.kind === 'riff') return item.riff.title;
  if (item.kind === 'chord') return `${item.chord.name} chord`;
  return item.question.prompt;
}
