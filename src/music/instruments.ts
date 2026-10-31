import type { Midi } from './notes';
import { STANDARD_TUNING, UKULELE_TUNING, type Tuning } from './tuning';

export type InstrumentId = 'guitar' | 'ukulele';

/**
 * Everything the app needs to know about an instrument that the tuning alone
 * does not say. Every string-count, name column, fret limit and default sound
 * in the app comes from here, never from a literal six.
 */
export type Instrument = {
  id: InstrumentId;
  /** Capitalised, as a heading: "Guitar". */
  name: string;
  /** Open-string pitches in string-index order (see `Tuning`). */
  tuning: Tuning;
  /** The name of each string as a tab writes it, in string-index order: E A D G B e, or G C E A. */
  stringNames: readonly string[];
  /** The highest fret content may use. */
  maxFret: number;
  /** The frets a full board shows (the explorer, the quizzes' widest window): the open string and this many frets. */
  boardFrets: number;
  /** The tone (an id from the audio module's tone list) this instrument starts on. */
  defaultToneId: string;
  /** Stroke width, in board units, of each string as drawn, in string-index order. */
  stringWidths: readonly number[];
  /**
   * The range a row of named notes (an alphabet, a scale) is played in: it
   * starts at `low` and, if that would climb past `high`, starts at the
   * lowest open string instead.
   */
  rowRange: { low: Midi; high: Midi };
};

export const GUITAR: Instrument = {
  id: 'guitar',
  name: 'Guitar',
  tuning: STANDARD_TUNING,
  stringNames: ['E', 'A', 'D', 'G', 'B', 'e'],
  maxFret: 24,
  boardFrets: 12,
  defaultToneId: 'acoustic',
  // Low E is the thickest.
  stringWidths: [3.2, 2.8, 2.4, 1.9, 1.5, 1.2],
  rowRange: { low: 48, high: 72 },
};

export const UKULELE: Instrument = {
  id: 'ukulele',
  name: 'Ukulele',
  tuning: UKULELE_TUNING,
  stringNames: ['G', 'C', 'E', 'A'],
  maxFret: 15,
  boardFrets: 12,
  defaultToneId: 'ukulele',
  // Nylon all round; the C string is the thickest, the high G a hair thinner than the A.
  stringWidths: [2, 2.6, 2.3, 2],
  rowRange: { low: 60, high: 81 },
};

export const INSTRUMENTS: readonly Instrument[] = [GUITAR, UKULELE];

export const DEFAULT_INSTRUMENT_ID: InstrumentId = 'guitar';

export function isInstrumentId(value: unknown): value is InstrumentId {
  return value === 'guitar' || value === 'ukulele';
}

export function getInstrument(id: InstrumentId): Instrument {
  return id === 'ukulele' ? UKULELE : GUITAR;
}

/** Anything authored for an instrument names it with an optional `instrument`; absent means the guitar. */
export function instrumentIdOf(content: { instrument?: InstrumentId | undefined }): InstrumentId {
  return content.instrument ?? DEFAULT_INSTRUMENT_ID;
}

export function instrumentOf(content: { instrument?: InstrumentId | undefined }): Instrument {
  return getInstrument(instrumentIdOf(content));
}

export function stringCountOf(instrument: Instrument): number {
  return instrument.tuning.length;
}

/**
 * The number a player calls a string: the top line of the tab is string 1, so
 * it counts down as the index goes up. A guitar's index 0 is string 6, a
 * ukulele's is string 4. Display only.
 */
export function stringNumber(stringIndex: number, instrument: Instrument): number {
  return stringCountOf(instrument) - stringIndex;
}

export function stringIndexFromNumber(n: number, instrument: Instrument): number {
  return stringCountOf(instrument) - n;
}

function extremeString(tuning: Tuning, beats: (candidate: Midi, best: Midi) => boolean): number {
  let best = 0;
  tuning.forEach((open, index) => {
    const incumbent = tuning[best];
    if (incumbent !== undefined && beats(open, incumbent)) best = index;
  });
  return best;
}

/**
 * The index of the string whose open pitch is lowest. On the guitar that is
 * string 0, the low E; on a re-entrant ukulele it is string 1, the C, and the
 * string with index 0 is a high one. Code that wants "the bass string" or "the
 * lowest note the instrument can play" must ask this, never assume index 0.
 */
export function lowestPitchString(tuning: Tuning): number {
  return extremeString(tuning, (candidate, best) => candidate < best);
}

/** The index of the string whose open pitch is highest. */
export function highestPitchString(tuning: Tuning): number {
  return extremeString(tuning, (candidate, best) => candidate > best);
}

/** The lowest note the open strings can sound. */
export function lowestOpenMidi(tuning: Tuning): Midi {
  return tuning[lowestPitchString(tuning)] ?? 0;
}

/** True when pitch does not rise with the string index (a ukulele's high G). */
export function isReentrant(tuning: Tuning): boolean {
  return tuning.some((open, index) => index > 0 && open < (tuning[index - 1] ?? open));
}
