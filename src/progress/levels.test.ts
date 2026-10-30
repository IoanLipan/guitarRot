import { describe, expect, it } from 'vitest';
import { RANK_TITLES, levelForXp, levelProgress, rankTitle, xpForLevel } from './levels';

describe('xpForLevel', () => {
  it.each([
    [1, 0],
    [2, 100],
    [3, 300],
    [4, 600],
    [5, 1000],
    [10, 4500],
  ])('level %i starts at %i xp', (level, xp) => {
    expect(xpForLevel(level)).toBe(xp);
  });

  it('puts anything below level 1 at 0', () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-3)).toBe(0);
  });
});

describe('levelForXp', () => {
  it('is level 1 from nothing up to 99', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
  });

  it('moves up on the exact boundary, not before', () => {
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(999)).toBe(4);
    expect(levelForXp(1000)).toBe(5);
    expect(levelForXp(4499)).toBe(9);
    expect(levelForXp(4500)).toBe(10);
  });

  it('inverts xpForLevel at every boundary and just before it, far up the curve', () => {
    for (let level = 1; level <= 500; level += 1) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
      if (level > 1) expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it('treats a nonsense total as level 1', () => {
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(levelForXp(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('describes the start of the game', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 100, fraction: 0 });
  });

  it('measures inside the level, against that level alone', () => {
    // Level 2 runs from 100 to 300: 200 wide.
    expect(levelProgress(150)).toEqual({ level: 2, xpIntoLevel: 50, xpForNext: 200, fraction: 0.25 });
  });

  it('starts a fresh bar on the boundary', () => {
    expect(levelProgress(300)).toEqual({ level: 3, xpIntoLevel: 0, xpForNext: 300, fraction: 0 });
  });

  it('keeps the fraction below 1 one xp short of the next level', () => {
    const { fraction } = levelProgress(299);
    expect(fraction).toBeGreaterThan(0.99);
    expect(fraction).toBeLessThan(1);
  });
});

describe('rankTitle', () => {
  it('names the first ten levels, one each', () => {
    expect(RANK_TITLES).toHaveLength(10);
    expect(new Set(RANK_TITLES).size).toBe(10);
    expect(rankTitle(1)).toBe('Bedroom Strummer');
    expect(rankTitle(5)).toBe('Barre Breaker');
    expect(rankTitle(9)).toBe('Headliner');
  });

  it('keeps the top rank from level 10 on', () => {
    expect(rankTitle(10)).toBe('Road Legend');
    expect(rankTitle(57)).toBe('Road Legend');
  });

  it('never goes below the first', () => {
    expect(rankTitle(0)).toBe('Bedroom Strummer');
    expect(rankTitle(-4)).toBe('Bedroom Strummer');
  });
});
