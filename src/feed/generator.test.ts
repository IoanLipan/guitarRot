import { describe, expect, it } from 'vitest';
import { CHORDS, RIFFS } from '@/content';
import {
  EASY_MAX_CHORD_DIFFICULTY,
  EASY_MAX_RIFF_LEVEL,
  EASY_OPENING_CARDS,
  emptyCursor,
  generateFeedPage,
  mulberry32,
  NO_REPEAT_WINDOW,
  QUIZ_MAX_GAP,
  type FeedItem,
} from './generator';

/** Generates `count` cards through however many pages, as one flat list. */
function run(count: number, seed = 1, pageSize = count): FeedItem[] {
  const random = mulberry32(seed);
  let cursor = emptyCursor();
  const all: FeedItem[] = [];
  while (all.length < count) {
    const page = generateFeedPage(Math.min(pageSize, count - all.length), cursor, random);
    all.push(...page.items);
    cursor = page.cursor;
  }
  return all;
}

function contentId(item: FeedItem): string | null {
  if (item.kind === 'riff') return item.riff.id;
  if (item.kind === 'chord') return item.chord.id;
  return null;
}

describe('generateFeedPage', () => {
  it('is deterministic for a given seed', () => {
    expect(run(40, 7).map((i) => i.id)).toEqual(run(40, 7).map((i) => i.id));
  });

  it('produces different feeds for different seeds', () => {
    expect(run(40, 1).map((i) => i.id)).not.toEqual(run(40, 2).map((i) => i.id));
  });

  it('gives every card a unique key, across page boundaries', () => {
    const items = run(60, 3, 8);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('keeps generating forever without running dry', () => {
    expect(run(500, 5, 10)).toHaveLength(500);
  });

  // The guarantee is per pool: a riff cannot come back inside the window, and
  // a pool smaller than the window (the window is 15; there are 21 riffs and
  // 29 chords now, but there were once 9 of each) falls back to "every other
  // item has had a turn first". `expectedGap` computes whichever applies.
  it.each([
    ['riff', RIFFS.length],
    ['chord', CHORDS.length],
  ])('cycles the whole %s pool before repeating any of them', (kind, poolSize) => {
    const ids = run(300, 11, 12)
      .filter((item) => item.kind === kind)
      .map(contentId);

    const expectedGap = Math.min(NO_REPEAT_WINDOW, poolSize - 1);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (id === null || id === undefined) continue;
      expect(ids.slice(Math.max(0, i - expectedGap), i)).not.toContain(id);
    }
  });

  it('spaces repeats of one riff many cards apart in the finished feed', () => {
    const items = run(300, 11, 12);
    const lastSeen = new Map<string, number>();
    let closest = Infinity;
    items.forEach((item, index) => {
      const id = contentId(item);
      if (id === null) return;
      const previous = lastSeen.get(id);
      if (previous !== undefined) closest = Math.min(closest, index - previous);
      lastSeen.set(id, index);
    });
    expect(closest).toBeGreaterThanOrEqual(8);
  });

  it('never leaves the user more than a few cards without a quiz', () => {
    const kinds = run(300, 13, 15).map((i) => i.kind);
    let sinceQuiz = 0;
    for (const kind of kinds) {
      sinceQuiz = kind === 'quiz' ? 0 : sinceQuiz + 1;
      expect(sinceQuiz).toBeLessThanOrEqual(QUIZ_MAX_GAP);
    }
  });

  it('never runs three cards of the same kind together', () => {
    const kinds = run(400, 17, 20).map((i) => i.kind);
    for (let i = 2; i < kinds.length; i += 1) {
      expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2]).toBe(false);
    }
  });

  it('roughly hits the designed riff/chord/quiz mix', () => {
    const kinds = run(600, 23, 25).map((i) => i.kind);
    const share = (kind: string) => kinds.filter((k) => k === kind).length / kinds.length;
    expect(share('riff')).toBeGreaterThan(0.4);
    expect(share('chord')).toBeGreaterThan(0.15);
    expect(share('quiz')).toBeGreaterThan(0.15);
    expect(share('riff')).toBeGreaterThan(share('chord'));
  });

  it('alternates note and chord quizzes instead of clumping them', () => {
    const quizKinds = run(200, 29, 20)
      .filter((i) => i.kind === 'quiz')
      .map((i) => (i.kind === 'quiz' ? i.question.kind : null));
    for (let i = 1; i < quizKinds.length; i += 1) {
      expect(quizKinds[i]).not.toBe(quizKinds[i - 1]);
    }
  });

  it('shows solos and rhythm parts, not just one riff on repeat', () => {
    const riffIds = new Set(
      run(200, 31, 20)
        .filter((i) => i.kind === 'riff')
        .map((i) => (i.kind === 'riff' ? i.riff.id : '')),
    );
    expect(riffIds.size).toBeGreaterThanOrEqual(6);
  });
});

describe('the first card', () => {
  it('is always a riff, whatever the seed', () => {
    for (const seed of [1, 2, 3, 42, 99, 1000]) {
      const first = run(1, seed)[0];
      expect(first?.kind).toBe('riff');
    }
  });
});

describe('the opening cards', () => {
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

  it('only ever draw on easy riffs and chords, for every seed', () => {
    for (const seed of SEEDS) {
      for (const item of run(EASY_OPENING_CARDS, seed)) {
        if (item.kind === 'riff') expect(item.riff.level).toBeLessThanOrEqual(EASY_MAX_RIFF_LEVEL);
        if (item.kind === 'chord') {
          expect(item.chord.difficulty).toBeLessThanOrEqual(EASY_MAX_CHORD_DIFFICULTY);
        }
      }
    }
  });

  it('hold even when the feed is fetched a few cards at a time', () => {
    for (const seed of SEEDS) {
      for (const item of run(EASY_OPENING_CARDS, seed, 2)) {
        if (item.kind === 'riff') expect(item.riff.level).toBeLessThanOrEqual(EASY_MAX_RIFF_LEVEL);
      }
    }
  });

  it('are not all repeats of one riff: there is enough easy material to vary', () => {
    for (const seed of SEEDS) {
      const riffs = run(EASY_OPENING_CARDS, seed).flatMap((item) => (item.kind === 'riff' ? [item.riff.id] : []));
      expect(new Set(riffs).size).toBe(riffs.length);
    }
  });

  it('end after the opening: the harder riffs and chords come into the feed', () => {
    const later = SEEDS.flatMap((seed) => run(EASY_OPENING_CARDS + 20, seed).slice(EASY_OPENING_CARDS));
    expect(later.some((item) => item.kind === 'riff' && item.riff.level > EASY_MAX_RIFF_LEVEL)).toBe(true);
    expect(later.some((item) => item.kind === 'chord' && item.chord.difficulty > EASY_MAX_CHORD_DIFFICULTY)).toBe(true);
  });

  it('really are a limit: the library has harder riffs and chords to keep out', () => {
    expect(RIFFS.some((riff) => riff.level > EASY_MAX_RIFF_LEVEL)).toBe(true);
    expect(CHORDS.some((chord) => chord.difficulty > EASY_MAX_CHORD_DIFFICULTY)).toBe(true);
    expect(RIFFS.filter((riff) => riff.level <= EASY_MAX_RIFF_LEVEL).length).toBeGreaterThanOrEqual(
      EASY_OPENING_CARDS,
    );
  });
});

describe('due-weighted quiz selection', () => {
  it('spends the next quiz slot on a due item instead of a random question', () => {
    const random = mulberry32(1);
    const page = generateFeedPage(20, emptyCursor(), random, ['note-s0f3']);
    const quiz = page.items.find((item) => item.kind === 'quiz');
    expect(quiz?.kind).toBe('quiz');
    expect(quiz && quiz.kind === 'quiz' ? quiz.question.id : null).toBe('note-s0f3');
  });

  it('falls through to a normal random question once due items run out', () => {
    const random = mulberry32(1);
    const page = generateFeedPage(20, emptyCursor(), random, ['note-s0f3']);
    const quizzes = page.items.filter((item) => item.kind === 'quiz');
    expect(quizzes.length).toBeGreaterThan(1);
    expect(quizzes[1] && quizzes[1].kind === 'quiz' ? quizzes[1].question.id : null).not.toBe(
      'note-s0f3',
    );
  });

  it('ignores a due id that no longer resolves to anything', () => {
    const random = mulberry32(1);
    const page = generateFeedPage(20, emptyCursor(), random, ['chord-not-a-real-chord']);
    const quiz = page.items.find((item) => item.kind === 'quiz');
    expect(quiz?.kind).toBe('quiz');
  });
});
