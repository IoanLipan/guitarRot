import { midiToPitchClass, type Midi, type PitchClass } from './notes';
import { fretToMidi } from './fretboard';
import { STRING_COUNT, type Tuning } from './tuning';

export type ChordQuality =
  | 'maj' | 'min' | 'dom7' | 'maj7' | 'min7'
  | 'sus2' | 'sus4' | 'dim' | 'aug' | 'power';

/** Semitones above the root that each quality contains. */
export const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  power: [0, 7],
};

export const QUALITY_LABELS: Record<ChordQuality, string> = {
  maj: 'major',
  min: 'minor',
  dom7: 'dominant seventh',
  maj7: 'major seventh',
  min7: 'minor seventh',
  sus2: 'suspended second',
  sus4: 'suspended fourth',
  dim: 'diminished',
  aug: 'augmented',
  power: 'power chord',
};

export type ChordShape = {
  id: string;
  /** Display name, e.g. "Am" or "G7". */
  name: string;
  root: PitchClass;
  quality: ChordQuality;
  /** Leftmost fret of the diagram box. 1 for open shapes. */
  baseFret: number;
  /** Six entries, index 0 = low E. `null` means muted, `0` means open. */
  frets: (number | null)[];
  /** Six entries. 1-4 are fingers; `null` means open or muted. */
  fingers: (number | null)[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  difficulty: 1 | 2 | 3;
};

/** Sounding pitches, low to high, skipping muted strings. */
export function chordVoicing(shape: ChordShape, tuning: Tuning): Midi[] {
  const voicing: Midi[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = shape.frets[stringIndex];
    if (fret === null || fret === undefined) continue;
    voicing.push(fretToMidi(tuning, stringIndex, fret));
  }
  return voicing;
}

export function chordPitchClasses(shape: ChordShape, tuning: Tuning): PitchClass[] {
  const set = new Set(chordVoicing(shape, tuning).map(midiToPitchClass));
  return [...set].sort((a, b) => a - b);
}

export function expectedPitchClasses(root: PitchClass, quality: ChordQuality): PitchClass[] {
  const set = new Set(
    QUALITY_INTERVALS[quality].map((step) => midiToPitchClass(root + step)),
  );
  return [...set].sort((a, b) => a - b);
}

/**
 * Returns a list of human-readable problems with a shape. An empty array
 * means the shape is valid. Content tests assert this is empty for every
 * shipped chord, which is what stops an authoring typo teaching a wrong shape.
 */
export function validateChordShape(shape: ChordShape, tuning: Tuning): string[] {
  const errors: string[] = [];

  if (shape.frets.length !== STRING_COUNT) {
    errors.push(`${shape.id}: frets must have 6 entries, has ${shape.frets.length}`);
  }
  if (shape.fingers.length !== STRING_COUNT) {
    errors.push(`${shape.id}: fingers must have 6 entries, has ${shape.fingers.length}`);
  }
  if (errors.length > 0) return errors;

  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = shape.frets[stringIndex];
    const finger = shape.fingers[stringIndex];

    if (fret !== null && fret !== undefined && (fret < 0 || fret > 24)) {
      errors.push(`${shape.id}: fret ${fret} on string ${stringIndex} is out of range`);
    }
    if ((fret === null || fret === undefined) && finger !== null && finger !== undefined) {
      errors.push(`${shape.id}: string ${stringIndex} is muted but has a finger assigned`);
    }
    if (fret === 0 && finger !== null && finger !== undefined) {
      errors.push(`${shape.id}: string ${stringIndex} is open but has a finger assigned`);
    }
    if (finger !== null && finger !== undefined && (finger < 1 || finger > 4)) {
      errors.push(`${shape.id}: finger ${finger} on string ${stringIndex} is not 1-4`);
    }
  }

  const voicing = chordVoicing(shape, tuning);
  if (voicing.length === 0) {
    errors.push(`${shape.id}: has no sounding strings`);
    return errors;
  }

  const actual = chordPitchClasses(shape, tuning).join(',');
  const expected = expectedPitchClasses(shape.root, shape.quality).join(',');
  if (actual !== expected) {
    errors.push(
      `${shape.id}: sounds pitch classes [${actual}] but ${shape.name} requires [${expected}]`,
    );
  }

  if (shape.barre !== undefined) {
    const { fret, fromStringIndex, toStringIndex } = shape.barre;
    if (fromStringIndex >= toStringIndex) {
      errors.push(`${shape.id}: barre must span from a lower to a higher string index`);
    }
    for (let i = fromStringIndex; i <= toStringIndex; i += 1) {
      const fretAt = shape.frets[i];
      if (fretAt !== null && fretAt !== undefined && fretAt < fret) {
        errors.push(`${shape.id}: string ${i} is fretted below its barre at fret ${fret}`);
      }
    }
  }

  return errors;
}
