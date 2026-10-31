import { describe, expect, it } from 'vitest';
import { chordsFor, riffsFor } from '@/content';
import { reviewSrsItem } from '@/quiz/srs';
import {
  EASY_MAX_RIFF_LEVEL,
  EASY_OPENING_CARDS,
  emptyCursor,
  generateFeedPage,
  mulberry32,
  NO_REPEAT_WINDOW,
  QUIZ_MAX_GAP,
} from './generator';

function page(count: number, seed: number, dueIds: string[] = [], instrument: 'guitar' | 'ukulele' = 'ukulele') {
  return generateFeedPage(count, emptyCursor(), mulberry32(seed), dueIds, instrument);
}

describe('a ukulele feed', () => {
  it('deals riffs, chords and quizzes, like the guitar\'s: the ukulele has riffs of its own to show', () => {
    expect(riffsFor('ukulele').length).toBeGreaterThanOrEqual(20);
    const { items } = page(80, 4);

    expect(items.some((item) => item.kind === 'riff')).toBe(true);
    expect(items.some((item) => item.kind === 'chord')).toBe(true);
    expect(items.some((item) => item.kind === 'quiz')).toBe(true);
  });

  it('mixes the kinds in about the guitar\'s proportions: more riffs than chords, a quiz every few cards', () => {
    const { items } = page(400, 21);
    const share = (kind: string) => items.filter((item) => item.kind === kind).length / items.length;
    expect(share('riff')).toBeGreaterThan(0.4);
    expect(share('riff')).toBeLessThan(0.65);
    expect(share('chord')).toBeGreaterThan(0.18);
    expect(share('chord')).toBeLessThan(0.4);
    expect(share('quiz')).toBeGreaterThan(0.1);
    expect(share('quiz')).toBeLessThan(0.3);
  });

  it('shows only ukulele riffs, and opens on an easy one: a first card a beginner can play', () => {
    const library = new Set(riffsFor('ukulele').map((riff) => riff.id));
    for (const seed of [1, 2, 3, 4, 5]) {
      const { items } = page(40, seed);
      const first = items[0];
      expect(first?.kind).toBe('riff');
      if (first?.kind === 'riff') expect(first.riff.level).toBeLessThanOrEqual(EASY_MAX_RIFF_LEVEL);
      for (const item of items) {
        if (item.kind === 'riff') {
          expect(library.has(item.riff.id)).toBe(true);
          expect(item.riff.instrument).toBe('ukulele');
        }
      }
    }
  });

  it('keeps the opening cards easy, then draws on every level', () => {
    const early = page(EASY_OPENING_CARDS, 9).items.flatMap((item) => (item.kind === 'riff' ? [item.riff.level] : []));
    expect(Math.max(...early)).toBeLessThanOrEqual(EASY_MAX_RIFF_LEVEL);
    const levels = new Set(page(300, 3).items.flatMap((item) => (item.kind === 'riff' ? [item.riff.level] : [])));
    expect([...levels].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('never repeats a riff inside the window the pool allows', () => {
    const riffs = riffsFor('ukulele');
    const window = Math.min(NO_REPEAT_WINDOW, riffs.length - 1);
    const ids = page(200, 17).items.flatMap((item) => (item.kind === 'riff' ? [item.riff.id] : []));
    for (let i = 0; i < ids.length; i += 1) {
      const recent = ids.slice(Math.max(0, i - Math.floor(window / 2)), i);
      expect(recent).not.toContain(ids[i]);
    }
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
