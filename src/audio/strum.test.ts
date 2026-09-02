import { describe, expect, it } from 'vitest';
import { strumOffsets } from './strum';

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
