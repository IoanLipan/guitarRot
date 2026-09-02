import { describe, expect, it } from 'vitest';
import {
  findPitchClassPositions,
  findPositions,
  fretToMidi,
  openStringMidi,
  positionKey,
} from './fretboard';
import {
  STANDARD_TUNING,
  STRING_COUNT,
  stringIndexFromNumber,
  stringNumber,
} from './tuning';
import { noteName } from './notes';

describe('string index convention', () => {
  it('treats index 0 as the low E, which guitarists call string 6', () => {
    expect(stringNumber(0)).toBe(6);
    expect(stringNumber(5)).toBe(1);
  });

  it('round-trips index and number', () => {
    for (let i = 0; i < STRING_COUNT; i += 1) {
      expect(stringIndexFromNumber(stringNumber(i))).toBe(i);
    }
  });

  it('puts the lowest pitch at index 0', () => {
    expect(STANDARD_TUNING[0]).toBeLessThan(STANDARD_TUNING[5]);
  });
});

describe('openStringMidi', () => {
  it('returns the tuning entry', () => {
    expect(openStringMidi(STANDARD_TUNING, 2)).toBe(50);
  });

  it('throws on an out-of-range string index', () => {
    expect(() => openStringMidi(STANDARD_TUNING, 6)).toThrow();
  });
});

describe('fretToMidi', () => {
  it('returns the open string at fret 0', () => {
    expect(fretToMidi(STANDARD_TUNING, 0, 0)).toBe(40);
  });

  it('raises pitch one semitone per fret', () => {
    expect(fretToMidi(STANDARD_TUNING, 0, 5)).toBe(45);
  });

  it('makes the fifth fret of a string match the next open string, except G to B', () => {
    // The B string is tuned a major third above G, so the trick uses fret 4 there.
    for (const stringIndex of [0, 1, 2]) {
      expect(fretToMidi(STANDARD_TUNING, stringIndex, 5)).toBe(
        openStringMidi(STANDARD_TUNING, stringIndex + 1),
      );
    }
    expect(fretToMidi(STANDARD_TUNING, 3, 4)).toBe(openStringMidi(STANDARD_TUNING, 4));
    expect(fretToMidi(STANDARD_TUNING, 4, 5)).toBe(openStringMidi(STANDARD_TUNING, 5));
  });

  it('puts the twelfth fret an octave above the open string', () => {
    for (let i = 0; i < STRING_COUNT; i += 1) {
      expect(fretToMidi(STANDARD_TUNING, i, 12)).toBe(openStringMidi(STANDARD_TUNING, i) + 12);
    }
  });

  it('names the third fret of the low E as G2', () => {
    expect(noteName(fretToMidi(STANDARD_TUNING, 0, 3), { withOctave: true })).toBe('G2');
  });

  it('rejects a negative fret', () => {
    expect(() => fretToMidi(STANDARD_TUNING, 0, -1)).toThrow();
  });
});

describe('findPositions', () => {
  it('finds every place middle C can be played in the first twelve frets', () => {
    // D string fret 10, G string fret 5, B string fret 1. The E and A
    // strings only reach C above fret 12, and the high E is already past it.
    expect(findPositions(STANDARD_TUNING, 60, [0, 12])).toEqual([
      { stringIndex: 2, fret: 10 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 4, fret: 1 },
    ]);
  });

  it('returns positions ordered by string index', () => {
    const found = findPositions(STANDARD_TUNING, 55, [0, 12]);
    const indices = found.map((p) => p.stringIndex);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('agrees with fretToMidi for everything it returns', () => {
    for (let midi = 40; midi <= 76; midi += 1) {
      for (const p of findPositions(STANDARD_TUNING, midi, [0, 12])) {
        expect(fretToMidi(STANDARD_TUNING, p.stringIndex, p.fret)).toBe(midi);
      }
    }
  });

  it('returns nothing for a pitch below the instrument', () => {
    expect(findPositions(STANDARD_TUNING, 30, [0, 12])).toEqual([]);
  });

  it('returns nothing for a pitch above the instrument', () => {
    expect(findPositions(STANDARD_TUNING, 100, [0, 30])).toEqual([]);
  });

  it('rejects a non-integer midi note', () => {
    expect(() => findPositions(STANDARD_TUNING, 60.5, [0, 12])).toThrow();
    expect(() => findPositions(STANDARD_TUNING, 40.0000001, [0, 12])).toThrow();
  });

  it('accepts a readonly fret range', () => {
    const FIRST_BOX = [0, 5] as const;
    expect(findPositions(STANDARD_TUNING, 45, FIRST_BOX)).toEqual([
      { stringIndex: 0, fret: 5 },
      { stringIndex: 1, fret: 0 },
    ]);
  });
});

describe('findPitchClassPositions', () => {
  it('finds E everywhere it occurs in the first five frets', () => {
    // Verified by hand against fretToMidi:
    //   low E  (40) fret 0  -> 40 = E2
    //   A      (45)          -> E only at fret 7, outside the range
    //   D      (50) fret 2  -> 52 = E3
    //   G      (55)          -> E only at fret 9, outside the range
    //   B      (59) fret 5  -> 64 = E4
    //   high E (64) fret 0  -> 64 = E4
    expect(findPitchClassPositions(STANDARD_TUNING, 4, [0, 5])).toEqual([
      { stringIndex: 0, fret: 0 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 5, fret: 0 },
    ]);
  });

  it('normalizes an out-of-range pitch class the same as its 0-11 equivalent', () => {
    // 16 is "a fifth above A" (9 + 7), the kind of unwrapped arithmetic the chord
    // and scale modules do. It must resolve identically to its mod-12 form, 4 (E).
    expect(findPitchClassPositions(STANDARD_TUNING, 16, [0, 5])).toEqual(
      findPitchClassPositions(STANDARD_TUNING, 4, [0, 5]),
    );
    // A negative pitch class must normalize the same way too.
    expect(findPitchClassPositions(STANDARD_TUNING, -8, [0, 5])).toEqual(
      findPitchClassPositions(STANDARD_TUNING, 4, [0, 5]),
    );
  });
});

describe('fret range clamping', () => {
  it('drops the impossible below-the-nut position instead of emitting a negative fret', () => {
    // Reproduces the exact reported bug: fret -1 must not appear.
    expect(() => findPositions(STANDARD_TUNING, 39, [-2, 12])).not.toThrow();
    expect(() => findPitchClassPositions(STANDARD_TUNING, 4, [-2, 12])).not.toThrow();
    expect(findPositions(STANDARD_TUNING, 39, [-2, 12])).toEqual([]);
  });

  it('agrees on a range that starts below zero: neither throws, neither returns a negative fret', () => {
    // Non-vacuous case: 40 is exactly the open low E, so a real position exists.
    const positions = findPositions(STANDARD_TUNING, 40, [-5, 3]);
    expect(positions.length).toBeGreaterThan(0);
    for (const p of positions) {
      expect(p.fret).toBeGreaterThanOrEqual(0);
    }

    const pcPositions = findPitchClassPositions(STANDARD_TUNING, 4, [-3, 5]);
    expect(pcPositions.length).toBeGreaterThan(0);
    for (const p of pcPositions) {
      expect(p.fret).toBeGreaterThanOrEqual(0);
    }
  });

  it('every position findPositions returns still round-trips through fretToMidi after clamping', () => {
    for (const p of findPositions(STANDARD_TUNING, 40, [-5, 3])) {
      expect(fretToMidi(STANDARD_TUNING, p.stringIndex, p.fret)).toBe(40);
    }
  });
});

describe('positionKey', () => {
  it('produces a stable unique key', () => {
    expect(positionKey({ stringIndex: 0, fret: 3 })).toBe('s0f3');
  });
});
