import type { Midi } from './notes';

/**
 * The highest fret any neck here can have: the guitar's 24. It bounds
 * `fretToMidi` and every fret range, whatever the instrument; the frets an
 * instrument really has are its own `maxFret` (see instruments.ts).
 */
export const MAX_FRET = 24;

/**
 * Open-string pitches in string-index order. Index 0 is the bottom line of a
 * tab; the top line is the last index. Pitch does NOT necessarily rise with
 * the index: a re-entrant tuning (the ukulele's high G) turns back on itself.
 */
export type Tuning = readonly Midi[];

/** E2 A2 D3 G3 B3 E4: index 0 is the low E, and pitch rises with every index. */
export const STANDARD_TUNING: Tuning = [40, 45, 50, 55, 59, 64];

/** G4 C4 E4 A4, the re-entrant tuning of a soprano or concert ukulele: index 0 is the high G, a step above the C next to it. */
export const UKULELE_TUNING: Tuning = [67, 60, 64, 69];
