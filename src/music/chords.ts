import { enharmonics, midiToPitchClass, pitchClassName, type Midi, type PitchClass } from './notes';
import { fretToMidi } from './fretboard';
import { MAX_FRET, STRING_COUNT, type Tuning } from './tuning';

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

/** Sounding pitches, in string order from the low E string upward, skipping muted strings. */
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

/**
 * The chord's tones spelled from its root upward, e.g. Am -> ["A", "C", "E"].
 *
 * `chordPitchClasses` sorts numerically from C, which spells Am as
 * "C, E, A" — correct as a set, but useless for teaching, where the root
 * has to lead.
 */
export function chordToneNames(
  shape: ChordShape,
  tuning: Tuning,
  opts: { preferFlat?: boolean } = {},
): string[] {
  const root = midiToPitchClass(shape.root);
  const fromRoot = (pc: PitchClass): number => (((pc - root) % 12) + 12) % 12;
  return [...chordPitchClasses(shape, tuning)]
    .sort((a, b) => fromRoot(a) - fromRoot(b))
    .map((pc) => pitchClassName(pc, opts));
}

export function expectedPitchClasses(root: PitchClass, quality: ChordQuality): PitchClass[] {
  const set = new Set(
    QUALITY_INTERVALS[quality].map((step) => midiToPitchClass(root + step)),
  );
  return [...set].sort((a, b) => a - b);
}

/**
 * True when `name` begins with an accepted spelling of `root` (e.g. both
 * "C#m" and "Dbm" are accepted for pitch class 1). Spellings are checked
 * longest first, and a match is rejected if the character right after it
 * is itself an accidental — otherwise "C" would falsely match the start
 * of "C#m", which actually names a different pitch class.
 */
function nameMatchesRoot(name: string, root: PitchClass): boolean {
  const spellings = [...enharmonics(root)].sort((a, b) => b.length - a.length);
  return spellings.some((spelling) => {
    if (!name.startsWith(spelling)) return false;
    const next = name.charAt(spelling.length);
    return next !== '#' && next !== 'b';
  });
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

  if (!nameMatchesRoot(shape.name, shape.root)) {
    errors.push(
      `${shape.id}: name "${shape.name}" does not start with a valid spelling of root ` +
        `pitch class ${shape.root} (${enharmonics(shape.root).join('/')})`,
    );
  }

  // Tracks whether any fret fell outside the playable neck, or wasn't an
  // integer. Either way it cannot be resolved to a pitch, so we must bail
  // out before chordVoicing (and the fretToMidi calls inside it) run —
  // fretToMidi throws for exactly these inputs, which would turn an
  // authoring mistake into an uncaught exception instead of a reported one.
  let hasFretRangeError = false;

  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = shape.frets[stringIndex];
    const finger = shape.fingers[stringIndex];

    if (
      fret !== null &&
      fret !== undefined &&
      (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET)
    ) {
      errors.push(`${shape.id}: fret ${fret} on string ${stringIndex} is out of range`);
      hasFretRangeError = true;
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
    if (
      fret !== null &&
      fret !== undefined &&
      Number.isInteger(fret) &&
      fret !== 0 &&
      (fret < shape.baseFret || fret > shape.baseFret + 4)
    ) {
      errors.push(
        `${shape.id}: fret ${fret} on string ${stringIndex} is outside the baseFret box ` +
          `[${shape.baseFret}, ${shape.baseFret + 4}]`,
      );
    }
  }
  if (hasFretRangeError) return errors;

  const voicing = chordVoicing(shape, tuning);
  if (voicing.length === 0) {
    errors.push(`${shape.id}: has no sounding strings`);
    return errors;
  }

  // Deliberate: this is exact set equality, not a superset/subset check. A
  // shell voicing that omits a chord tone (e.g. a fifth-omitted Cmaj7 shape
  // sounding only {0, 4, 11}) is rejected rather than silently accepted.
  // For a beginner shape library, refusing to certify is the correct
  // failure direction — loosening this comparison would gut the module's
  // whole purpose. Shell voicings, if ever wanted, need an explicit
  // `omits` field on ChordShape, not a relaxed check here.
  const actual = chordPitchClasses(shape, tuning).join(',');
  const expected = expectedPitchClasses(shape.root, shape.quality).join(',');
  if (actual !== expected) {
    errors.push(
      `${shape.id}: sounds pitch classes [${actual}] but ${shape.name} requires [${expected}]`,
    );
  }

  if (shape.barre !== undefined) {
    const { fret, fromStringIndex, toStringIndex } = shape.barre;
    const isValidStringIndex = (i: number): boolean =>
      Number.isInteger(i) && i >= 0 && i <= STRING_COUNT - 1;

    if (!isValidStringIndex(fromStringIndex) || !isValidStringIndex(toStringIndex)) {
      errors.push(
        `${shape.id}: barre string indices must be integers in [0, ${STRING_COUNT - 1}]`,
      );
    } else {
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
  }

  return errors;
}
