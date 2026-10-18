import { describe, expect, it } from 'vitest';
import { STRUM_JITTER_MS, STRUM_TAPER, planStrum, strumLevels, strumOffsets } from './strum';

describe('strumOffsets', () => {
  it('returns one offset per string in the voicing', () => {
    expect(strumOffsets(5, 40, 'down')).toHaveLength(5);
  });

  it('starts a downstroke at the lowest string', () => {
    const offsets = strumOffsets(4, 30, 'down');
    expect(offsets[0]).toBe(0);
  });

  it('starts an upstroke at the highest string', () => {
    const offsets = strumOffsets(4, 30, 'up');
    expect(offsets[offsets.length - 1]).toBe(0);
  });

  it('spreads a downstroke across the requested time, in seconds', () => {
    const offsets = strumOffsets(5, 40, 'down');
    expect(offsets[4]).toBeCloseTo(0.04);
  });

  it('increases monotonically for a downstroke', () => {
    const offsets = strumOffsets(6, 50, 'down');
    for (let i = 1; i < offsets.length; i += 1) {
      const previous = offsets[i - 1];
      const current = offsets[i];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (previous === undefined || current === undefined) return;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it('mirrors a downstroke for an upstroke', () => {
    expect(strumOffsets(4, 30, 'up')).toEqual([...strumOffsets(4, 30, 'down')].reverse());
  });

  it('plays a single note immediately', () => {
    expect(strumOffsets(1, 40, 'down')).toEqual([0]);
  });

  it('plays every string together when there is no spread', () => {
    expect(strumOffsets(6, 0, 'down')).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('returns nothing for an empty voicing', () => {
    expect(strumOffsets(0, 40, 'down')).toEqual([]);
  });
});

describe('strumLevels', () => {
  it('starts a downstroke at full level and tapers to 0.85 on the last string', () => {
    const levels = strumLevels(6, 'down');
    expect(levels[0]).toBe(1);
    expect(levels[5]).toBeCloseTo(STRUM_TAPER);
    expect(STRUM_TAPER).toBe(0.85);
  });

  it('tapers in the order the strings are hit, so an upstroke starts on the high string', () => {
    const levels = strumLevels(6, 'up');
    expect(levels[5]).toBe(1);
    expect(levels[0]).toBeCloseTo(STRUM_TAPER);
  });

  it('never rises along a stroke', () => {
    const levels = strumLevels(5, 'down');
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]!).toBeLessThan(levels[i - 1]!);
    }
  });

  it('plays a single note at full level', () => {
    expect(strumLevels(1, 'down')).toEqual([1]);
    expect(strumLevels(0, 'down')).toEqual([]);
  });
});

describe('planStrum', () => {
  it('is the even spread and the taper when nothing is random', () => {
    const plan = planStrum(6, 50, 'down', () => 0);
    expect(plan.map((hit) => hit.offset)).toEqual(strumOffsets(6, 50, 'down'));
    expect(plan.map((hit) => hit.level)).toEqual(strumLevels(6, 'down'));
  });

  it('delays each string by up to 4ms and no more', () => {
    const none = planStrum(4, 30, 'down', () => 0);
    const most = planStrum(4, 30, 'down', () => 0.999999);
    most.forEach((hit, i) => {
      const lateBy = hit.offset - (none[i]?.offset ?? 0);
      expect(lateBy).toBeGreaterThan(0.0039);
      expect(lateBy).toBeLessThan(STRUM_JITTER_MS / 1000);
    });
    expect(STRUM_JITTER_MS).toBe(4);
  });

  it('gives every string its own jitter', () => {
    const draws = [0.1, 0.9, 0.4, 0.7];
    let next = 0;
    const plan = planStrum(4, 0, 'down', () => draws[next++] ?? 0);
    expect(new Set(plan.map((hit) => hit.offset)).size).toBe(4);
  });

  it('plans nothing for an empty voicing', () => {
    expect(planStrum(0, 30, 'down')).toEqual([]);
  });
});
