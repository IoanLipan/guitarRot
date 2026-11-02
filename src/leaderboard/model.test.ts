import { describe, expect, it } from 'vitest';
import { levelForXp } from '@/progress/levels';
import {
  MAX_STEP,
  parseEntry,
  planUpdates,
  rankEntries,
  scoreOf,
  weekXpOf,
  type BoardEntry,
  type EntryData,
} from './model';

const THIS_WEEK = '2026-W44';

const entry = (over: Partial<EntryData> = {}): EntryData => ({
  name: 'Ada',
  level: 3,
  xp: 340,
  weekKey: THIS_WEEK,
  weekXp: 40,
  instrument: 'guitar',
  ...over,
});
const row = (uid: string, over: Partial<EntryData> = {}): BoardEntry => ({ uid, ...entry(over) });

describe('planUpdates', () => {
  const play = { weekKey: THIS_WEEK, earned: 10, localXp: 350, instrument: 'guitar' as const };

  it('adds an award to the same week with an increment, and mirrors the all-time XP and level', () => {
    expect(planUpdates(entry(), play)).toEqual([
      { xpDelta: 10, level: levelForXp(350), instrument: 'guitar', week: { kind: 'add', xp: 10 } },
    ]);
  });

  it('starts the new week with the award when the row is from an earlier week', () => {
    const patches = planUpdates(entry({ weekKey: '2026-W43', weekXp: 900 }), play);
    expect(patches).toEqual([
      { xpDelta: 10, level: 3, instrument: 'guitar', week: { kind: 'start', weekKey: THIS_WEEK, xp: 10 } },
    ]);
  });

  it('starts a new week across the year boundary too', () => {
    const patches = planUpdates(entry({ weekKey: '2026-W53' }), { ...play, weekKey: '2027-W01' });
    expect(patches[0]?.week).toEqual({ kind: 'start', weekKey: '2027-W01', xp: 10 });
  });

  it('does not touch the week when nothing was earned in it', () => {
    const patches = planUpdates(entry({ weekKey: '2026-W40' }), { ...play, earned: 0, localXp: 2000 });
    expect(patches).toHaveLength(1);
    expect(patches[0]?.week).toEqual({ kind: 'none' });
  });

  it('writes nothing when the row is already current', () => {
    expect(planUpdates(entry(), { ...play, earned: 0, localXp: 340 })).toEqual([]);
    expect(planUpdates(entry(), { ...play, earned: 0, localXp: 100 })).toEqual([]);
  });

  it('never sends less XP than the row already has', () => {
    const [patch] = planUpdates(entry({ xp: 500 }), { ...play, earned: 10, localXp: 120 });
    expect(patch?.xpDelta).toBe(0);
    expect(patch?.level).toBe(levelForXp(500));
    expect(patch?.week).toEqual({ kind: 'add', xp: 10 });
  });

  it('adds to the row’s own week when this phone’s clock is behind it', () => {
    const [patch] = planUpdates(entry({ weekKey: '2026-W45' }), play);
    expect(patch?.week).toEqual({ kind: 'add', xp: 10 });
  });

  it('catches up a long way in steps the rules allow', () => {
    const patches = planUpdates(entry({ xp: 1000 }), { ...play, earned: 0, localXp: 1000 + MAX_STEP * 2 + 500 });
    expect(patches.map((p) => p.xpDelta)).toEqual([2000, 2000, 500]);
    expect(patches.map((p) => p.level)).toEqual([3000, 5000, 5500].map(levelForXp));
    expect(patches.every((p) => p.week.kind === 'none')).toBe(true);
  });

  it('puts the week’s XP in the first step of a catch-up, split if it is more than a step', () => {
    const patches = planUpdates(entry({ weekKey: '2026-W40', xp: 0 }), { ...play, earned: 4500, localXp: 4500 });
    expect(patches.map((p) => p.week)).toEqual([
      { kind: 'start', weekKey: THIS_WEEK, xp: 2000 },
      { kind: 'add', xp: 2000 },
      { kind: 'add', xp: 500 },
    ]);
    expect(patches.map((p) => p.xpDelta)).toEqual([2000, 2000, 500]);
  });

  it('never asks for more than a step in one write', () => {
    for (const earned of [0, 1, 1999, 2000, 2001, 9999]) {
      for (const localXp of [0, 340, 2340, 2341, 50_000]) {
        const base = entry({ weekKey: '2026-W40' });
        let xp = base.xp;
        for (const patch of planUpdates(base, { weekKey: THIS_WEEK, earned, localXp, instrument: 'guitar' })) {
          expect(patch.xpDelta).toBeLessThanOrEqual(MAX_STEP);
          expect(patch.xpDelta).toBeGreaterThanOrEqual(0);
          if (patch.week.kind !== 'none') expect(patch.week.xp).toBeLessThanOrEqual(MAX_STEP);
          xp += patch.xpDelta;
        }
        // Ends up exactly at the player's total (or where the row already was, if that is more).
        expect(xp).toBe(Math.max(localXp, base.xp));
      }
    }
  });

  it('only counts whole, non-negative XP', () => {
    expect(planUpdates(entry(), { ...play, earned: -5, localXp: Number.NaN })).toEqual([]);
    expect(planUpdates(entry(), { ...play, earned: 10.9, localXp: 350.7 })[0]).toMatchObject({
      xpDelta: 10,
      week: { kind: 'add', xp: 10 },
    });
  });

  it('carries the instrument being learned', () => {
    expect(planUpdates(entry(), { ...play, instrument: 'ukulele' })[0]?.instrument).toBe('ukulele');
  });
});

describe('weekXpOf and scoreOf', () => {
  it('counts only the current week’s XP', () => {
    expect(weekXpOf(entry({ weekXp: 40 }), THIS_WEEK)).toBe(40);
    expect(weekXpOf(entry({ weekKey: '2026-W43', weekXp: 900 }), THIS_WEEK)).toBe(0);
  });

  it('picks the number a list is ordered by', () => {
    expect(scoreOf(entry(), 'week', THIS_WEEK)).toBe(40);
    expect(scoreOf(entry(), 'all', THIS_WEEK)).toBe(340);
  });
});

describe('rankEntries', () => {
  it('numbers rows from 1, and gives players on the same score the same rank', () => {
    const ranked = rankEntries(
      [row('a', { xp: 900 }), row('b', { xp: 500 }), row('c', { xp: 500 }), row('d', { xp: 120 })],
      'all',
      THIS_WEEK,
    );
    expect(ranked.map((r) => [r.uid, r.rank, r.score])).toEqual([
      ['a', 1, 900],
      ['b', 2, 500],
      ['c', 2, 500],
      ['d', 4, 120],
    ]);
  });

  it('ranks the week by this week’s XP', () => {
    const ranked = rankEntries([row('a', { weekXp: 80 }), row('b', { weekXp: 10 })], 'week', THIS_WEEK);
    expect(ranked.map((r) => [r.uid, r.rank, r.score])).toEqual([
      ['a', 1, 80],
      ['b', 2, 10],
    ]);
  });
});

describe('parseEntry', () => {
  const stored = { name: 'Ada', level: 3, xp: 340, weekKey: THIS_WEEK, weekXp: 40, instrument: 'guitar', updatedAt: {} };

  it('reads a good row, leaving the time out', () => {
    expect(parseEntry('u1', stored)).toEqual({ uid: 'u1', name: 'Ada', level: 3, xp: 340, weekKey: THIS_WEEK, weekXp: 40, instrument: 'guitar' });
  });

  it('refuses anything a hand edit could have left behind', () => {
    for (const bad of [
      null,
      'text',
      {},
      { ...stored, name: 'x' },
      { ...stored, name: 'ada@example.com' },
      { ...stored, name: 7 },
      { ...stored, level: 0 },
      { ...stored, xp: -1 },
      { ...stored, xp: 1.5 },
      { ...stored, weekXp: '40' },
      { ...stored, weekKey: 'this week' },
      { ...stored, instrument: 'piano' },
    ]) {
      expect(parseEntry('u1', bad)).toBeNull();
    }
  });
});
