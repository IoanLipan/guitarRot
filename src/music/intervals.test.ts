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
