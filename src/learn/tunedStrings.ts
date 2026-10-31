import type { Midi, Tuning } from '@/music';

/**
 * The string an in-tune reading is tuning: the one whose open pitch it is. Any
 * other note, however steady, is null. The tuner calls a reading "in tune" when
 * it is close to the nearest note, which says nothing about whether that note
 * is one a string should sound: B2 held perfectly is not the A string tuned.
 *
 * Which string that is depends on the instrument's tuning, and only the open
 * pitch decides it: on the re-entrant ukulele the string with index 0 is the
 * high G, so the answer is never "the lowest string that fits".
 */
export function openStringOf(midi: Midi, tuning: Tuning): number | null {
  const index = tuning.indexOf(midi);
  return index === -1 ? null : index;
}

/** The strings heard in tune so far, plus this one. The same set back if it was already in. */
export function withTuned(tuned: ReadonlySet<number>, stringIndex: number): ReadonlySet<number> {
  return tuned.has(stringIndex) ? tuned : new Set([...tuned, stringIndex]);
}

/** Every string of the instrument has been heard in tune. */
export function allStringsTuned(tuned: ReadonlySet<number>, stringCount: number): boolean {
  return tuned.size >= stringCount;
}
