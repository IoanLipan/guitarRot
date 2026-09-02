import type { Midi } from './notes';

export const STRING_COUNT = 6;
export const MAX_FRET = 24;

/** Six open-string pitches, low to high. Index 0 is the low E (string 6). */
export type Tuning = readonly [Midi, Midi, Midi, Midi, Midi, Midi];

/** E2 A2 D3 G3 B3 E4 */
export const STANDARD_TUNING: Tuning = [40, 45, 50, 55, 59, 64];

/** Array index 0 is the low E, which guitarists call string 6. Display only. */
export function stringNumber(stringIndex: number): number {
  return STRING_COUNT - stringIndex;
}

export function stringIndexFromNumber(n: number): number {
  return STRING_COUNT - n;
}
