import {
  QUALITY_INTERVALS,
  QUALITY_LABELS,
  STANDARD_TUNING,
  chordSolfegeName,
  expectedPitchClasses,
  fretToMidi,
  midiToPitchClass,
  solfegeName,
  type ChordQuality,
  type ChordShape,
  type FretPosition,
  type PitchClass,
} from '@/music';

/**
 * Names the chord a handful of notes spell, from theory rather than from a
 * list: every root, every quality the app knows. A bar of a tab is not
 * obliged to be one of nine beginner shapes, and "Gm" is as real in Bach as
 * "Am" is in a folk song.
 */

/** A chord, named: its root and quality, the symbol a chart would print, and the same in solfège. */
export type NamedChord = {
  root: PitchClass;
  quality: ChordQuality;
  /** "Gm", "Bb", "A7", "Dm7", "Asus2", "E5": the symbol the rest of the app prints. */
  name: string;
  /** "Sol minor": the chord in fixed-do, as `chordSolfegeName` writes it. */
  solfege: string;
};

/** How well a set of notes matches the chord it was named for. */
export type ShapeMatch =
  /** The notes are exactly the chord's tones. */
  | 'exact'
  /** The chord's tones are all there, plus one more note: the tune on top. */
  | 'with-melody'
  /** No chord fits. */
  | 'none';

export type ShapeName = {
  match: ShapeMatch;
  chord?: NamedChord;
  /** Pitch classes sounding beyond the chord's own tones. Empty unless `match` is 'with-melody'. */
  extras: PitchClass[];
};

/** What follows the root in a chord symbol. */
export const QUALITY_SYMBOLS: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  sus2: 'sus2',
  sus4: 'sus4',
  dim: 'dim',
  aug: 'aug',
  power: '5',
};

/**
 * How guitarists spell the five black-key roots. Majors and sevenths lean
 * flat (Bb, Eb, Ab, Db, F#), minors lean sharp (C#m, F#m, G#m) apart from the
 * Eb and Bb that nobody writes as D#m and A#m in a flat key.
 */
const MAJOR_ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const MINOR_ROOT_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] as const;
const MINOR_LIKE: readonly ChordQuality[] = ['min', 'min7', 'dim'];

export function describeChord(root: PitchClass, quality: ChordQuality): NamedChord {
  const pc = midiToPitchClass(root);
  const names = MINOR_LIKE.includes(quality) ? MINOR_ROOT_NAMES : MAJOR_ROOT_NAMES;
  const name = `${names[pc] ?? 'C'}${QUALITY_SYMBOLS[quality]}`;
  const preferFlat = name.charAt(1) === 'b';
  return { root: pc, quality, name, solfege: `${solfegeName(pc, { preferFlat })} ${QUALITY_LABELS[quality]}` };
}

/** A library chord, as a named chord: the name it already has, in the same words. */
export function namedFromShape(shape: ChordShape): NamedChord {
  return { root: midiToPitchClass(shape.root), quality: shape.quality, name: shape.name, solfege: chordSolfegeName(shape) };
}

/** Qualities with a full chord's worth of tones. A power chord is a fallback, never a first choice. */
const FULL_QUALITIES = (Object.keys(QUALITY_INTERVALS) as ChordQuality[]).filter(
  (quality) => quality !== 'power',
);

/** Which spelling to prefer when one set of notes is several chords: plain triads before sevenths before sus and the rest. */
const QUALITY_PREFERENCE: Record<ChordQuality, number> = {
  maj: 9,
  min: 8,
  dom7: 7,
  min7: 6,
  maj7: 5,
  sus4: 4,
  sus2: 3,
  dim: 2,
  aug: 1,
  power: 0,
};

/** Most extra notes a named shape may carry: one tune note on top of a chord. */
const MAX_EXTRA_NOTES = 1;

/** Fewest tones a chord needs before an extra note can be called "a melody on it". */
const MIN_TONES_FOR_MELODY = 3;

function midiOfPosition(position: FretPosition): number {
  return fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret);
}

/** The distinct pitch classes of a set of positions, in ascending order. */
export function pitchClassesOfPositions(positions: readonly FretPosition[]): PitchClass[] {
  return [...new Set(positions.map((p) => midiToPitchClass(midiOfPosition(p))))].sort((a, b) => a - b);
}

type Candidate = { root: PitchClass; quality: ChordQuality; extras: PitchClass[] };

/**
 * Names the chord a set of positions spells.
 *
 * Every pitch class is tried as a root against every quality, using
 * `expectedPitchClasses`. In order of preference:
 *
 * 1. **Exact**: the notes are precisely a chord's tones.
 * 2. **Chord with melody**: a chord of three or more tones is all there, plus
 *    one other note. The picture is still the chord; the extra note is the
 *    tune walking over it.
 * 3. **Power chord**: just a root and its fifth ("G5").
 *
 * Anything else is left unnamed. Where several chords fit, the one built on
 * the lowest note wins, because the bass is what an ear hears as the chord:
 * A, C and E with a walking F over an A bass is "Am + melody", not a bare
 * Fmaj7 with the A in the middle. Then an exact match beats one with an extra
 * note, then the fuller chord, then the plainer quality (major, minor,
 * seventh, ...), then the lower root, so the answer never depends on
 * iteration luck.
 */
export function nameShape(positions: readonly FretPosition[]): ShapeName {
  if (positions.length === 0) return { match: 'none', extras: [] };

  const sounding = pitchClassesOfPositions(positions);
  const bass = midiToPitchClass(Math.min(...positions.map(midiOfPosition)));

  const candidates: Candidate[] = [];
  for (let root = 0; root < 12; root += 1) {
    for (const quality of FULL_QUALITIES) {
      const tones = expectedPitchClasses(root, quality);
      if (!tones.every((tone) => sounding.includes(tone))) continue;
      const extras = sounding.filter((pc) => !tones.includes(pc));
      if (extras.length === 0) candidates.push({ root, quality, extras });
      else if (tones.length >= MIN_TONES_FOR_MELODY && extras.length <= MAX_EXTRA_NOTES) {
        candidates.push({ root, quality, extras });
      }
    }
  }

  const score = ({ root, quality, extras }: Candidate): number =>
    (root === bass ? 1000 : 0) +
    (extras.length === 0 ? 200 : 0) +
    QUALITY_INTERVALS[quality].length * 10 +
    QUALITY_PREFERENCE[quality] -
    root / 100;

  const best = [...candidates].sort((a, b) => score(b) - score(a))[0];
  if (best !== undefined) {
    return {
      match: best.extras.length === 0 ? 'exact' : 'with-melody',
      chord: describeChord(best.root, best.quality),
      extras: best.extras,
    };
  }

  // A root and its fifth, nothing else. Either note may be the root: the bass
  // decides when it can ("G5" and "C5" are not the same two notes, but E and B
  // are E5 whichever is lower).
  const [first, second, ...rest] = sounding;
  if (first !== undefined && second !== undefined && rest.length === 0) {
    const roots = [first, second].filter((root) => {
      const tones = expectedPitchClasses(root, 'power');
      return tones.length === 2 && sounding.every((pc) => tones.includes(pc));
    });
    const root = roots.find((candidate) => candidate === bass) ?? roots[0];
    if (root !== undefined) return { match: 'exact', chord: describeChord(root, 'power'), extras: [] };
  }

  return { match: 'none', extras: [] };
}
