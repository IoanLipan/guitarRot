import { describe, expect, it } from 'vitest';
import { chordsFor, riffsFor } from '@/content';
import { reviewSrsItem } from '@/quiz/srs';
import { emptyCursor, generateFeedPage, mulberry32, NO_REPEAT_WINDOW, QUIZ_MAX_GAP } from './generator';

function page(count: number, seed: number, dueIds: string[] = [], instrument: 'guitar' | 'ukulele' = 'ukulele') {
  return generateFeedPage(count, emptyCursor(), mulberry32(seed), dueIds, instrument);
}

describe('a ukulele feed', () => {
  it('is chords and quizzes: there are no ukulele riffs yet, and it does not ask for one', () => {
    expect(riffsFor('ukulele')).toEqual([]);
    const { items } = page(60, 4);

    expect(items.some((item) => item.kind === 'riff')).toBe(false);
    expect(items.some((item) => item.kind === 'chord')).toBe(true);
    expect(items.some((item) => item.kind === 'quiz')).toBe(true);
  });

  it('opens on a chord, since a ukulele has nothing playable to open on but one', () => {
    for (const seed of [1, 2, 3, 4, 5]) expect(page(3, seed).items[0]?.kind).toBe('chord');
  });

  it('shows only ukulele chords, and every quiz on its neck', () => {
    const library = new Set(chordsFor('ukulele').map((chord) => chord.id));
    for (const item of page(80, 12).items) {
      if (item.kind === 'chord') expect(library.has(item.chord.id)).toBe(true);
      if (item.kind === 'quiz') {
        const { question } = item;
        if (question.kind === 'note') {
          expect(question.instrument).toBe('ukulele');
          expect(question.position.stringIndex).toBeLessThan(4);
        } else {
          expect(question.chord.instrument).toBe('ukulele');
        }
      }
    }
  });

  it('still quizzes at least once every few cards, as the feed promises', () => {
    const { items } = page(60, 8);
    let since = 0;
    for (const item of items) {
      since = item.kind === 'quiz' ? 0 : since + 1;
      expect(since).toBeLessThanOrEqual(QUIZ_MAX_GAP);
    }
  });

  it('never repeats a chord inside the window the pool allows', () => {
    const chords = chordsFor('ukulele');
    const window = Math.min(NO_REPEAT_WINDOW, chords.length - 1);
    const ids = page(80, 6).items.flatMap((item) => (item.kind === 'chord' ? [item.chord.id] : []));
    for (let i = 0; i < ids.length; i += 1) {
      const recent = ids.slice(Math.max(0, i - Math.floor(window / 2)), i);
      expect(recent).not.toContain(ids[i]);
    }
  });

  it('asks the reviews that are due on a ukulele neck, and leaves the guitar\'s for the guitar\'s feed', () => {
    const due = ['note-s2f5', 'note-uke-s1f3', 'chord-Am-open', 'chord-uke-Em'];
    const ukulele = page(40, 2, due, 'ukulele');
    const ids = ukulele.items.flatMap((item) => (item.kind === 'quiz' ? [item.question.id] : []));
    expect(ids).toContain('note-uke-s1f3');
    expect(ids).toContain('chord-uke-Em');
    expect(ids).not.toContain('note-s2f5');
    expect(ids).not.toContain('chord-Am-open');

    const guitar = page(40, 2, due, 'guitar');
    const guitarIds = guitar.items.flatMap((item) => (item.kind === 'quiz' ? [item.question.id] : []));
    expect(guitarIds).toContain('note-s2f5');
    expect(guitarIds).not.toContain('note-uke-s1f3');
    expect(guitarIds).not.toContain('chord-uke-Em');
  });
});

describe('the guitar feed', () => {
  it('is unchanged by there being a ukulele: riffs open it, and it never shows a ukulele chord', () => {
    const { items } = page(40, 5, [], 'guitar');
    expect(items[0]?.kind).toBe('riff');
    for (const item of items) {
      if (item.kind === 'chord') expect(item.chord.instrument).toBeUndefined();
    }
  });

  it('is the same cards, in the same order, for the same seed with or without naming the guitar', () => {
    const named = generateFeedPage(30, emptyCursor(), mulberry32(99), [], 'guitar');
    const unnamed = generateFeedPage(30, emptyCursor(), mulberry32(99));
    expect(named.items.map((item) => item.id)).toEqual(unnamed.items.map((item) => item.id));
  });
});

describe('the review schedule is shared, but a review belongs to one neck', () => {
  it('keeps the same string and fret on the two instruments as two items', () => {
    const guitar = reviewSrsItem('note-s3f3', undefined, true, 0);
    const ukulele = reviewSrsItem('note-uke-s3f3', undefined, true, 0);
    expect(guitar.id).not.toBe(ukulele.id);
  });
});
