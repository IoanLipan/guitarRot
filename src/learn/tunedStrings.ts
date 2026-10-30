import { STANDARD_TUNING, STRING_COUNT, type Midi, type Tuning } from '@/music';

/**
 * The string an in-tune reading is tuning: the one whose open pitch it is. Any
 * other note, however steady, is null. The tuner calls a reading "in tune" when
 * it is close to the nearest note, which says nothing about whether that note
 * is one a string should sound: B2 held perfectly is not the A string tuned.
 */
export function openStringOf(midi: Midi, tuning: Tuning = STANDARD_TUNING): number | null {
  const index = tuning.indexOf(midi);
  return index === -1 ? null : index;
}

/** The strings heard in tune so far, plus this one. The same set back if it was already in. */
export function withTuned(tuned: ReadonlySet<number>, stringIndex: number): ReadonlySet<number> {
  return tuned.has(stringIndex) ? tuned : new Set([...tuned, stringIndex]);
}

export function allStringsTuned(tuned: ReadonlySet<number>): boolean {
  return tuned.size >= STRING_COUNT;
}
