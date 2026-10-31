import type { ChordShape } from '@/music';

/**
 * The ukulele chord library: standard GCEA tuning, open and first-position
 * shapes. Written in the same ChordShape format as the guitar's, with the
 * ukulele's string order: index 0 is the high G (the 4th string), then C, E,
 * A, so a shape reads left to right exactly as the familiar "0003" tab.
 *
 * Ids are `uke-<name>` ('uke-Am', 'uke-Bb'), unique across both libraries
 * because a chord id travels in lessons and share links with no instrument
 * beside it, and a '#' would end a share link's query string, so a sharp is
 * spelled out ('uke-Fsharp').
 *
 * `content/ukuleleChords.test.ts` derives every shape's notes from the tuning
 * and compares them with its name, so a wrong fret cannot ship.
 */
export const UKULELE_CHORDS: readonly ChordShape[] = [
  {
    id: 'uke-C',
    instrument: 'ukulele',
    name: 'C',
    root: 0,
    quality: 'maj',
    baseFret: 1,
    frets: [0, 0, 0, 3],
    fingers: [null, null, null, 3],
    difficulty: 1,
  },
  {
    id: 'uke-Am',
    instrument: 'ukulele',
    name: 'Am',
    root: 9,
    quality: 'min',
    baseFret: 1,
    frets: [2, 0, 0, 0],
    fingers: [2, null, null, null],
    difficulty: 1,
  },
  {
    id: 'uke-F',
    instrument: 'ukulele',
    name: 'F',
    root: 5,
    quality: 'maj',
    baseFret: 1,
    frets: [2, 0, 1, 0],
    fingers: [2, null, 1, null],
    difficulty: 1,
  },
  {
    id: 'uke-G',
    instrument: 'ukulele',
    name: 'G',
    root: 7,
    quality: 'maj',
    baseFret: 1,
    frets: [0, 2, 3, 2],
    fingers: [null, 1, 3, 2],
    difficulty: 2,
  },
  {
    id: 'uke-Em',
    instrument: 'ukulele',
    name: 'Em',
    root: 4,
    quality: 'min',
    baseFret: 1,
    frets: [0, 4, 3, 2],
    fingers: [null, 3, 2, 1],
    difficulty: 2,
  },
  {
    id: 'uke-Dm',
    instrument: 'ukulele',
    name: 'Dm',
    root: 2,
    quality: 'min',
    baseFret: 1,
    frets: [2, 2, 1, 0],
    fingers: [2, 3, 1, null],
    difficulty: 1,
  },
  {
    id: 'uke-D',
    instrument: 'ukulele',
    name: 'D',
    root: 2,
    quality: 'maj',
    baseFret: 1,
    frets: [2, 2, 2, 0],
    fingers: [1, 1, 1, null],
    barre: { fret: 2, fromStringIndex: 0, toStringIndex: 2 },
    difficulty: 2,
  },
  {
    id: 'uke-A',
    instrument: 'ukulele',
    name: 'A',
    root: 9,
    quality: 'maj',
    baseFret: 1,
    frets: [2, 1, 0, 0],
    fingers: [2, 1, null, null],
    difficulty: 1,
  },

  // --- Dominant sevenths ----------------------------------------------------
  {
    id: 'uke-G7',
    instrument: 'ukulele',
    name: 'G7',
    root: 7,
    quality: 'dom7',
    baseFret: 1,
    frets: [0, 2, 1, 2],
    fingers: [null, 2, 1, 3],
    difficulty: 1,
  },
  {
    id: 'uke-C7',
    instrument: 'ukulele',
    name: 'C7',
    root: 0,
    quality: 'dom7',
    baseFret: 1,
    frets: [0, 0, 0, 1],
    fingers: [null, null, null, 1],
    difficulty: 1,
  },
  {
    id: 'uke-A7',
    instrument: 'ukulele',
    name: 'A7',
    root: 9,
    quality: 'dom7',
    baseFret: 1,
    frets: [0, 1, 0, 0],
    fingers: [null, 1, null, null],
    difficulty: 1,
  },
  {
    id: 'uke-E7',
    instrument: 'ukulele',
    name: 'E7',
    root: 4,
    quality: 'dom7',
    baseFret: 1,
    frets: [1, 2, 0, 2],
    fingers: [1, 2, null, 3],
    difficulty: 2,
  },

  // --- Barre ----------------------------------------------------------------
  {
    id: 'uke-Bb',
    instrument: 'ukulele',
    name: 'Bb',
    root: 10,
    quality: 'maj',
    baseFret: 1,
    frets: [3, 2, 1, 1],
    fingers: [3, 2, 1, 1],
    barre: { fret: 1, fromStringIndex: 2, toStringIndex: 3 },
    difficulty: 2,
  },
];
