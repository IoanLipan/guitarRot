import { midiToPitchClass, type PitchClass } from './notes';
import { clampFretRange, fretToMidi, type FretPosition } from './fretboard';
import { STRING_COUNT, type Tuning } from './tuning';

export type ScalePattern = {
  id: string;
  name: string;
  /** Semitones above the root, ascending, starting at 0. */
  intervals: readonly number[];
};

export type ScaleId =
  | 'major' | 'naturalMinor' | 'minorPentatonic' | 'majorPentatonic' | 'blues';

export const SCALES: Record<ScaleId, ScalePattern> = {
  major: { id: 'major', name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor: { id: 'naturalMinor', name: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  minorPentatonic: { id: 'minorPentatonic', name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10] },
  majorPentatonic: { id: 'majorPentatonic', name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9] },
  blues: { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
};

export function scalePitchClasses(root: PitchClass, pattern: ScalePattern): PitchClass[] {
  const set = new Set(pattern.intervals.map((step) => midiToPitchClass(root + step)));
  return [...set].sort((a, b) => a - b);
}

export function scalePositions(
  tuning: Tuning,
  root: PitchClass,
  pattern: ScalePattern,
  fretRange: readonly [number, number],
): FretPosition[] {
  const inScale = new Set(scalePitchClasses(root, pattern));
  const [lo, hi] = clampFretRange(fretRange);
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    for (let fret = lo; fret <= hi; fret += 1) {
      if (inScale.has(midiToPitchClass(fretToMidi(tuning, stringIndex, fret)))) {
        found.push({ stringIndex, fret });
      }
    }
  }
  return found;
}

/** 1-based scale degree, or null when the pitch class is outside the scale. */
export function degreeOf(
  root: PitchClass,
  pattern: ScalePattern,
  pc: PitchClass,
): number | null {
  const target = midiToPitchClass(pc);
  const index = pattern.intervals.findIndex(
    (step) => midiToPitchClass(root + step) === target,
  );
  return index === -1 ? null : index + 1;
}
