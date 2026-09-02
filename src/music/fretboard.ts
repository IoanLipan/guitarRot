import { midiToPitchClass, type Midi, type PitchClass } from './notes';
import { MAX_FRET, STRING_COUNT, type Tuning } from './tuning';

export type FretPosition = { stringIndex: number; fret: number };

export const DEFAULT_FRET_RANGE: readonly [number, number] = [0, 12];

function assertStringIndex(stringIndex: number): void {
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex >= STRING_COUNT) {
    throw new Error(`String index out of range: ${stringIndex}`);
  }
}

/**
 * Clamps a caller-supplied fret range to the playable neck: [0, MAX_FRET].
 * Both findPositions and findPitchClassPositions route through this so the
 * bound is expressed exactly once and the two functions cannot disagree on
 * what a negative or overlong range means.
 */
export function clampFretRange(range: readonly [number, number]): [number, number] {
  const [lowFret, highFret] = range;
  return [Math.max(0, lowFret), Math.min(highFret, MAX_FRET)];
}

export function openStringMidi(tuning: Tuning, stringIndex: number): Midi {
  assertStringIndex(stringIndex);
  const open = tuning[stringIndex];
  if (open === undefined) throw new Error(`Tuning has no string ${stringIndex}`);
  return open;
}

export function fretToMidi(tuning: Tuning, stringIndex: number, fret: number): Midi {
  if (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET) {
    throw new Error(`Fret out of range: ${fret}`);
  }
  return openStringMidi(tuning, stringIndex) + fret;
}

/** Every position producing exactly this pitch, ordered low string to high. */
export function findPositions(
  tuning: Tuning,
  midi: Midi,
  fretRange: readonly [number, number] = DEFAULT_FRET_RANGE,
): FretPosition[] {
  if (!Number.isInteger(midi)) {
    throw new Error(`Midi note must be an integer: ${midi}`);
  }
  const [lo, hi] = clampFretRange(fretRange);
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = midi - openStringMidi(tuning, stringIndex);
    if (fret >= lo && fret <= hi) {
      found.push({ stringIndex, fret });
    }
  }
  return found;
}

/**
 * Every position producing this pitch class in any octave, ordered low string to high.
 *
 * `PitchClass` is an unbranded number, so a caller can hand this an out-of-range
 * value produced by ordinary arithmetic (e.g. `root + 7` for "a fifth above root",
 * which can land above 11 or below 0 — this is the dominant calling pattern from
 * the chord and scale modules). Normalizing both `pc` and the fretted MIDI note
 * through `midiToPitchClass` before comparing is deliberate: it is what makes that
 * unwrapped arithmetic resolve correctly. Do not remove it as "redundant" — without
 * it, an out-of-range pitch class silently returns no positions instead of the
 * correct ones.
 */
export function findPitchClassPositions(
  tuning: Tuning,
  pc: PitchClass,
  fretRange: readonly [number, number] = DEFAULT_FRET_RANGE,
): FretPosition[] {
  const [lo, hi] = clampFretRange(fretRange);
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    for (let fret = lo; fret <= hi; fret += 1) {
      if (midiToPitchClass(fretToMidi(tuning, stringIndex, fret)) === midiToPitchClass(pc)) {
        found.push({ stringIndex, fret });
      }
    }
  }
  return found;
}

export function positionKey(p: FretPosition): string {
  return `s${p.stringIndex}f${p.fret}`;
}
