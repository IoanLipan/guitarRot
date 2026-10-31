import { instrumentIdOf, type ChordShape, type InstrumentId } from '@/music';
import { UKULELE_CHORDS } from './ukuleleChords';

/** Standard open/barre voicings for the beginner guitar chord library. */
export const GUITAR_CHORDS: readonly ChordShape[] = [
  {
    id: 'E-open',
    name: 'E',
    root: 4,
    quality: 'maj',
    baseFret: 1,
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
    difficulty: 1,
  },
  {
    id: 'Am-open',
    name: 'Am',
    root: 9,
    quality: 'min',
    baseFret: 1,
    frets: [null, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
    difficulty: 1,
  },
  {
    id: 'D-open',
    name: 'D',
    root: 2,
    quality: 'maj',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
    difficulty: 1,
  },
  {
    id: 'G-open',
    name: 'G',
    root: 7,
    quality: 'maj',
    baseFret: 1,
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [3, 2, null, null, null, 4],
    difficulty: 2,
  },
  {
    id: 'C-open',
    name: 'C',
    root: 0,
    quality: 'maj',
    baseFret: 1,
    frets: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
    difficulty: 2,
  },
  {
    id: 'Em-open',
    name: 'Em',
    root: 4,
    quality: 'min',
    baseFret: 1,
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
    difficulty: 1,
  },
  {
    id: 'A-open',
    name: 'A',
    root: 9,
    quality: 'maj',
    baseFret: 1,
    frets: [null, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
    difficulty: 1,
  },
  {
    id: 'Dm-open',
    name: 'Dm',
    root: 2,
    quality: 'min',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
    difficulty: 1,
  },
  {
    id: 'F-barre',
    name: 'F',
    root: 5,
    quality: 'maj',
    baseFret: 1,
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: { fret: 1, fromStringIndex: 0, toStringIndex: 5 },
    difficulty: 3,
  },

  // --- Dominant sevenths ----------------------------------------------------
  // The open-position sevenths every folk, blues and country song reaches for.
  // (No C7: the common x32310 omits the fifth, which validateChordShape
  // rightly refuses to certify.)
  {
    id: 'A7-open',
    name: 'A7',
    root: 9,
    quality: 'dom7',
    baseFret: 1,
    frets: [null, 0, 2, 0, 2, 0],
    fingers: [null, null, 1, null, 2, null],
    difficulty: 1,
  },
  {
    id: 'B7-open',
    name: 'B7',
    root: 11,
    quality: 'dom7',
    baseFret: 1,
    frets: [null, 2, 1, 2, 0, 2],
    fingers: [null, 2, 1, 3, null, 4],
    difficulty: 3,
  },
  {
    id: 'D7-open',
    name: 'D7',
    root: 2,
    quality: 'dom7',
    baseFret: 1,
    frets: [null, null, 0, 2, 1, 2],
    fingers: [null, null, null, 2, 1, 3],
    difficulty: 1,
  },
  {
    id: 'E7-open',
    name: 'E7',
    root: 4,
    quality: 'dom7',
    baseFret: 1,
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [null, 2, null, 1, null, null],
    difficulty: 1,
  },
  {
    id: 'G7-open',
    name: 'G7',
    root: 7,
    quality: 'dom7',
    baseFret: 1,
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, null, null, null, 1],
    difficulty: 2,
  },

  // --- Minor and major sevenths -------------------------------------------
  {
    id: 'Am7-open',
    name: 'Am7',
    root: 9,
    quality: 'min7',
    baseFret: 1,
    frets: [null, 0, 2, 0, 1, 0],
    fingers: [null, null, 2, null, 1, null],
    difficulty: 1,
  },
  {
    id: 'Em7-open',
    name: 'Em7',
    root: 4,
    quality: 'min7',
    baseFret: 1,
    frets: [0, 2, 0, 0, 0, 0],
    fingers: [null, 2, null, null, null, null],
    difficulty: 1,
  },
  {
    id: 'Dm7-open',
    name: 'Dm7',
    root: 2,
    quality: 'min7',
    baseFret: 1,
    frets: [null, null, 0, 2, 1, 1],
    fingers: [null, null, null, 2, 1, 1],
    barre: { fret: 1, fromStringIndex: 4, toStringIndex: 5 },
    difficulty: 2,
  },
  {
    id: 'Cmaj7-open',
    name: 'Cmaj7',
    root: 0,
    quality: 'maj7',
    baseFret: 1,
    frets: [null, 3, 2, 0, 0, 0],
    fingers: [null, 3, 2, null, null, null],
    difficulty: 1,
  },
  {
    id: 'Fmaj7-open',
    name: 'Fmaj7',
    root: 5,
    quality: 'maj7',
    baseFret: 1,
    frets: [null, null, 3, 2, 1, 0],
    fingers: [null, null, 3, 2, 1, null],
    difficulty: 2,
  },

  // --- Suspended chords ---------------------------------------------------
  {
    id: 'Asus2-open',
    name: 'Asus2',
    root: 9,
    quality: 'sus2',
    baseFret: 1,
    frets: [null, 0, 2, 2, 0, 0],
    fingers: [null, null, 1, 2, null, null],
    difficulty: 1,
  },
  {
    id: 'Asus4-open',
    name: 'Asus4',
    root: 9,
    quality: 'sus4',
    baseFret: 1,
    frets: [null, 0, 2, 2, 3, 0],
    fingers: [null, null, 1, 2, 3, null],
    difficulty: 1,
  },
  {
    id: 'Dsus2-open',
    name: 'Dsus2',
    root: 2,
    quality: 'sus2',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 0],
    fingers: [null, null, null, 1, 2, null],
    difficulty: 1,
  },
  {
    id: 'Dsus4-open',
    name: 'Dsus4',
    root: 2,
    quality: 'sus4',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 3],
    fingers: [null, null, null, 1, 3, 4],
    difficulty: 1,
  },

  // --- Barre minors ---------------------------------------------------------
  // Ids avoid '#': a chord id travels in a share link (?p=chord:<id>) and a
  // '#' would end the query string.
  {
    id: 'Bm-barre',
    name: 'Bm',
    root: 11,
    quality: 'min',
    baseFret: 2,
    frets: [null, 2, 4, 4, 3, 2],
    fingers: [null, 1, 3, 4, 2, 1],
    barre: { fret: 2, fromStringIndex: 1, toStringIndex: 5 },
    difficulty: 3,
  },
  {
    id: 'Fsharpm-barre',
    name: 'F#m',
    root: 6,
    quality: 'min',
    baseFret: 2,
    frets: [2, 4, 4, 2, 2, 2],
    fingers: [1, 3, 4, 1, 1, 1],
    barre: { fret: 2, fromStringIndex: 0, toStringIndex: 5 },
    difficulty: 3,
  },

  // --- Power chords ---------------------------------------------------------
  // Root and fifth only; the first step into rock rhythm playing.
  {
    id: 'E5-power',
    name: 'E5',
    root: 4,
    quality: 'power',
    baseFret: 1,
    frets: [0, 2, 2, null, null, null],
    fingers: [null, 1, 2, null, null, null],
    difficulty: 1,
  },
  {
    id: 'A5-power',
    name: 'A5',
    root: 9,
    quality: 'power',
    baseFret: 1,
    frets: [null, 0, 2, 2, null, null],
    fingers: [null, null, 1, 2, null, null],
    difficulty: 1,
  },
  {
    id: 'D5-power',
    name: 'D5',
    root: 2,
    quality: 'power',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, null],
    fingers: [null, null, null, 1, 2, null],
    difficulty: 1,
  },
  {
    id: 'G5-power',
    name: 'G5',
    root: 7,
    quality: 'power',
    baseFret: 3,
    frets: [3, 5, 5, null, null, null],
    fingers: [1, 3, 4, null, null, null],
    difficulty: 2,
  },
];

/**
 * The guitar library, under its old name. Anything that lists chords for a
 * player wants `chordsFor(instrument)` instead; this stays for code and tests
 * that mean the guitar specifically.
 */
export const CHORDS: readonly ChordShape[] = GUITAR_CHORDS;

/** Every shape in every instrument's library. Ids are unique across all of it. */
export const ALL_CHORDS: readonly ChordShape[] = [...GUITAR_CHORDS, ...UKULELE_CHORDS];

/** The chord library of one instrument. */
export function chordsFor(instrument: InstrumentId): readonly ChordShape[] {
  return instrument === 'guitar' ? GUITAR_CHORDS : ALL_CHORDS.filter((chord) => instrumentIdOf(chord) === instrument);
}

/** A chord by id, from any instrument's library: an id names its instrument. */
export function getChord(id: string): ChordShape | undefined {
  return ALL_CHORDS.find((chord) => chord.id === id);
}
