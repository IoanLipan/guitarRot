import type { Midi } from './notes';

export type Interval = {
  /** True distance in semitones, which may exceed 12. */
  semitones: number;
  shortName: string;
  longName: string;
};

/** Indexed by semitones within one octave. */
export const SIMPLE_INTERVALS = [
  { shortName: 'P1', longName: 'unison' },
  { shortName: 'm2', longName: 'minor second' },
  { shortName: 'M2', longName: 'major second' },
  { shortName: 'm3', longName: 'minor third' },
  { shortName: 'M3', longName: 'major third' },
  { shortName: 'P4', longName: 'perfect fourth' },
  { shortName: 'TT', longName: 'tritone' },
  { shortName: 'P5', longName: 'perfect fifth' },
  { shortName: 'm6', longName: 'minor sixth' },
  { shortName: 'M6', longName: 'major sixth' },
  { shortName: 'm7', longName: 'minor seventh' },
  { shortName: 'M7', longName: 'major seventh' },
] as const;

const OCTAVE = { shortName: 'P8', longName: 'octave' } as const;

/**
 * Names a distance by its simple (within-octave) form, keeping the true
 * distance in `semitones`. A whole number of octaves is named "octave"
 * rather than "unison".
 */
export function intervalFromSemitones(semitones: number): Interval {
  if (!Number.isInteger(semitones) || semitones < 0) {
    throw new Error(`Interval distance must be a non-negative integer: ${semitones}`);
  }
  const remainder = semitones % 12;
  const named = remainder === 0 && semitones > 0 ? OCTAVE : SIMPLE_INTERVALS[remainder];
  if (named === undefined) throw new Error(`Unnameable interval: ${semitones}`);
  return { semitones, shortName: named.shortName, longName: named.longName };
}

export function intervalBetween(a: Midi, b: Midi): Interval {
  return intervalFromSemitones(Math.abs(b - a));
}
