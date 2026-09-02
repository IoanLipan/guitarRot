import { describe, expect, it } from 'vitest';
import { SCALES, degreeOf, scalePitchClasses, scalePositions } from './scales';
import { STANDARD_TUNING } from './tuning';
import { fretToMidi } from './fretboard';
import { midiToPitchClass } from './notes';

describe('scalePitchClasses', () => {
  it('spells C major with no accidentals', () => {
    expect(scalePitchClasses(0, SCALES.major)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('spells E minor pentatonic', () => {
    expect(scalePitchClasses(4, SCALES.minorPentatonic)).toEqual([2, 4, 7, 9, 11]);
  });

  it('gives A natural minor the same notes as C major', () => {
    expect(scalePitchClasses(9, SCALES.naturalMinor)).toEqual(
      scalePitchClasses(0, SCALES.major),
    );
  });

  it('adds one note to the pentatonic for the blues scale', () => {
    expect(scalePitchClasses(4, SCALES.blues)).toHaveLength(6);
  });

  it('spells the major pentatonic as root, 2nd, 3rd, 5th, 6th', () => {
    expect(scalePitchClasses(0, SCALES.majorPentatonic)).toEqual([0, 2, 4, 7, 9]);
  });

  it('spells the blues scale as the minor pentatonic plus the flat fifth', () => {
    expect(scalePitchClasses(0, SCALES.blues)).toEqual([0, 3, 5, 6, 7, 10]);
  });
});

describe('scalePositions', () => {
  it('returns only positions whose pitch is in the scale', () => {
    const inScale = new Set(scalePitchClasses(4, SCALES.minorPentatonic));
    for (const p of scalePositions(STANDARD_TUNING, 4, SCALES.minorPentatonic, [0, 5])) {
      expect(inScale.has(midiToPitchClass(fretToMidi(STANDARD_TUNING, p.stringIndex, p.fret)))).toBe(true);
    }
  });

  it('includes the open low E for E minor pentatonic', () => {
    expect(scalePositions(STANDARD_TUNING, 4, SCALES.minorPentatonic, [0, 5]))
      .toContainEqual({ stringIndex: 0, fret: 0 });
  });

  it('stays inside the requested fret range', () => {
    for (const p of scalePositions(STANDARD_TUNING, 0, SCALES.major, [5, 8])) {
      expect(p.fret).toBeGreaterThanOrEqual(5);
      expect(p.fret).toBeLessThanOrEqual(8);
    }
  });

  it('agrees on a range that starts below zero: does not throw, and returns no negative frets', () => {
    // Mirrors the fretboard clamping test: a window around a known position
    // like [p.fret - 2, p.fret + 2] goes negative near the nut. scalePositions
    // must clamp the same way findPositions/findPitchClassPositions do.
    expect(() => scalePositions(STANDARD_TUNING, 4, SCALES.minorPentatonic, [-2, 3])).not.toThrow();
    const positions = scalePositions(STANDARD_TUNING, 4, SCALES.minorPentatonic, [-2, 3]);
    expect(positions.length).toBeGreaterThan(0);
    for (const p of positions) {
      expect(p.fret).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('degreeOf', () => {
  it('numbers the root as 1', () => {
    expect(degreeOf(0, SCALES.major, 0)).toBe(1);
  });

  it('numbers the fifth as 5', () => {
    expect(degreeOf(0, SCALES.major, 7)).toBe(5);
  });

  it('returns null for a note outside the scale', () => {
    expect(degreeOf(0, SCALES.major, 1)).toBeNull();
  });
});
