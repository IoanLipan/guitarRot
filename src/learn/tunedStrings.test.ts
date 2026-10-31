import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING } from '@/music';
import { allStringsTuned, openStringOf, withTuned } from './tunedStrings';

describe('openStringOf', () => {
  it.each(STANDARD_TUNING.map((midi, index) => [midi, index] as const))(
    'knows midi %i as open string %i',
    (midi, index) => {
      expect(openStringOf(midi, STANDARD_TUNING)).toBe(index);
    },
  );

  it('knows no string for a note that is not an open string', () => {
    expect(openStringOf(47, STANDARD_TUNING)).toBeNull(); // B2: a fret on the A string, not a string
    expect(openStringOf(52, STANDARD_TUNING)).toBeNull(); // E3: the low E an octave up
    expect(openStringOf(0, STANDARD_TUNING)).toBeNull();
  });
});

describe('withTuned and allStringsTuned', () => {
  it('collects strings, each counted once, and is complete only at all six', () => {
    let tuned: ReadonlySet<number> = new Set();
    for (const index of [0, 1, 2, 3, 4]) tuned = withTuned(tuned, index);
    expect(allStringsTuned(tuned, 6)).toBe(false);

    tuned = withTuned(tuned, 4);
    expect(tuned.size).toBe(5);
    expect(allStringsTuned(tuned, 6)).toBe(false);

    tuned = withTuned(tuned, 5);
    expect(allStringsTuned(tuned, 6)).toBe(true);
  });

  it('does not change the set it was given', () => {
    const before: ReadonlySet<number> = new Set([0]);
    withTuned(before, 1);
    expect([...before]).toEqual([0]);
  });

  it('hands the same set back for a string already in it', () => {
    const before: ReadonlySet<number> = new Set([2]);
    expect(withTuned(before, 2)).toBe(before);
  });
});
