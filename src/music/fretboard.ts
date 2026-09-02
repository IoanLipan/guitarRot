import { midiToPitchClass, type Midi, type PitchClass } from './notes';
import { MAX_FRET, STRING_COUNT, type Tuning } from './tuning';

export type FretPosition = { stringIndex: number; fret: number };

export const DEFAULT_FRET_RANGE: [number, number] = [0, 12];

function assertStringIndex(stringIndex: number): void {
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex >= STRING_COUNT) {
    throw new Error(`String index out of range: ${stringIndex}`);
  }
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
  fretRange: [number, number] = DEFAULT_FRET_RANGE,
): FretPosition[] {
  const [lowFret, highFret] = fretRange;
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = midi - openStringMidi(tuning, stringIndex);
    if (fret >= lowFret && fret <= highFret && fret <= MAX_FRET) {
      found.push({ stringIndex, fret });
    }
  }
  return found;
}

/** Every position producing this pitch class in any octave, ordered low string to high. */
export function findPitchClassPositions(
  tuning: Tuning,
  pc: PitchClass,
  fretRange: [number, number] = DEFAULT_FRET_RANGE,
): FretPosition[] {
  const [lowFret, highFret] = fretRange;
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    for (let fret = lowFret; fret <= Math.min(highFret, MAX_FRET); fret += 1) {
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
