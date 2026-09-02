import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, validateChordShape } from '@/music';
import { CHORDS, getChord } from './chords';

describe('CHORDS', () => {
  it('has 9 shapes with unique ids', () => {
    expect(CHORDS).toHaveLength(9);
    expect(new Set(CHORDS.map((c) => c.id)).size).toBe(9);
  });

  it.each(CHORDS.map((c) => [c.id, c] as const))('%s is a valid shape', (_id, chord) => {
    expect(validateChordShape(chord, STANDARD_TUNING)).toEqual([]);
  });

  it('finds a chord by id', () => {
    expect(getChord('Am-open')?.name).toBe('Am');
  });

  it('returns undefined for an unknown id', () => {
    expect(getChord('nope')).toBeUndefined();
  });
});
