import { describe, expect, it } from 'vitest';
import { intervalBetween, intervalFromSemitones } from './intervals';

describe('intervalFromSemitones', () => {
  it('names a unison', () => {
    expect(intervalFromSemitones(0)).toMatchObject({ shortName: 'P1', longName: 'unison' });
  });

  it('names a perfect fifth', () => {
    expect(intervalFromSemitones(7)).toMatchObject({ shortName: 'P5', longName: 'perfect fifth' });
  });

  it('names a minor third', () => {
    expect(intervalFromSemitones(3)).toMatchObject({ shortName: 'm3', longName: 'minor third' });
  });

  it('names an octave rather than a unison', () => {
    expect(intervalFromSemitones(12)).toMatchObject({ shortName: 'P8', longName: 'octave' });
  });

  it('names a compound interval by its simple form', () => {
    expect(intervalFromSemitones(19)).toMatchObject({ shortName: 'P5', longName: 'perfect fifth' });
  });

  it('preserves the true distance', () => {
    expect(intervalFromSemitones(19).semitones).toBe(19);
  });

  it('rejects a negative distance', () => {
    expect(() => intervalFromSemitones(-1)).toThrow();
  });
});

describe('SIMPLE_INTERVALS', () => {
  // Independently verified against standard Western interval theory (equal
  // temperament, diatonic naming), not copied from the SIMPLE_INTERVALS
  // table itself -- pinning every one of its 12 entries, not just a sample,
  // so a wrong entry (which would still be the right length) cannot pass.
  const expected = [
    { semitones: 0, shortName: 'P1', longName: 'unison' },
    { semitones: 1, shortName: 'm2', longName: 'minor second' },
    { semitones: 2, shortName: 'M2', longName: 'major second' },
    { semitones: 3, shortName: 'm3', longName: 'minor third' },
    { semitones: 4, shortName: 'M3', longName: 'major third' },
    { semitones: 5, shortName: 'P4', longName: 'perfect fourth' },
    { semitones: 6, shortName: 'TT', longName: 'tritone' },
    { semitones: 7, shortName: 'P5', longName: 'perfect fifth' },
    { semitones: 8, shortName: 'm6', longName: 'minor sixth' },
    { semitones: 9, shortName: 'M6', longName: 'major sixth' },
    { semitones: 10, shortName: 'm7', longName: 'minor seventh' },
    { semitones: 11, shortName: 'M7', longName: 'major seventh' },
  ];

  it.each(expected)(
    'names $semitones semitones as $shortName ($longName)',
    ({ semitones, shortName, longName }) => {
      expect(intervalFromSemitones(semitones)).toMatchObject({ shortName, longName });
    },
  );
});

describe('intervalBetween', () => {
  it('is direction-independent', () => {
    expect(intervalBetween(60, 67)).toEqual(intervalBetween(67, 60));
  });

  it('measures the low E to A string gap as a perfect fourth', () => {
    expect(intervalBetween(40, 45).shortName).toBe('P4');
  });

  it('measures the G to B string gap as a major third', () => {
    expect(intervalBetween(55, 59).shortName).toBe('M3');
  });
});
