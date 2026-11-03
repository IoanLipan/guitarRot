import type { TabRow } from './classicalTabs';

/*
 * Tab for the three Italian-set songs that are played as tab (the rest of the
 * set is chord charts). Unlike movieTabs.ts and classicalTabs.ts this is not
 * machine-generated from an edition: every note is placed by hand, as a
 * [string, fret] pair, by the small builders below, and italianSongs.test.ts
 * pins the pitches of the opening bars so a slip cannot change the music.
 *
 * A row is [start, stringIndex, fret, length]: start and length are in
 * 1/24 of a quarter note (so 24 is one beat), stringIndex 0 is the low E.
 *
 * Fingering rules, the same ones the other tabs keep: nothing above the 15th
 * fret, no string asked to sound two notes at once, and every fretted note
 * that rings together fits a 5-fret reach.
 */

/** A place on the neck: string index (0 = low E) and fret. */
type Pos = readonly [string: number, fret: number];

const BEAT = 24;
const EIGHTH = 12;
const TRIPLET = 8;

// Names for the places the three pieces use. The octave is the sounding one
// (middle C is C4); the guitar's open strings are E2 A2 D3 G3 B3 E4.
const P: Record<string, Pos> = {
  E2: [0, 0], G2: [0, 3], B2low: [0, 7], A2: [1, 0], B2: [1, 2], C3: [1, 3],
  D3: [2, 0], 'D#3': [2, 1], E3: [2, 2], F2: [0, 1],
  G3: [3, 0], 'G#3': [3, 1], A3: [3, 2], C4low: [3, 5], 'D#4low': [3, 8],
  B3: [4, 0], C4: [4, 1], D4: [4, 3], E4mid: [4, 5], 'F#4mid': [4, 7], 'C#4': [4, 2],
  E4: [5, 0], F4: [5, 1], 'F#4': [5, 2], G4: [5, 3], 'G#4': [5, 4], A4: [5, 5],
  B4: [5, 7], C5: [5, 8], D5: [5, 10], 'D#5': [5, 11], E5: [5, 12],
};

function pos(name: string): Pos {
  const place = P[name];
  if (place === undefined) throw new Error(`italianTabs: no place named ${name}`);
  return place;
}

function row(start: number, place: Pos, length: number): TabRow {
  return [start, place[0], place[1], length];
}

// ---------------------------------------------------------------------------
// Spanish Romance, the first section (the E minor part), 16 bars of 3/4.
//
// Every beat is the same shape: the tune on the first string, then two
// plucks of the open or near-open strings underneath it, as a triplet. The
// thumb plays the bass under the whole bar. What is below is the melody and
// the bass as the tune has been passed down; the fingering is guitarRot's.
// ---------------------------------------------------------------------------

type RomanceBar = {
  bass: readonly (readonly [place: string, beats: number])[];
  tune: readonly [string, string, string];
  /** The two notes plucked after each tune note, the higher string first. */
  inner: readonly [string, string];
};

const EM_INNER = ['B3', 'G3'] as const;
const AM_INNER = ['E4mid', 'C4low'] as const;
const B7_INNER = ['F#4mid', 'D#4low'] as const;
const B7_LOW_INNER = ['B3', 'A3'] as const;

const ROMANCE_BARS: readonly RomanceBar[] = [
  { bass: [['E2', 3]], tune: ['B4', 'B4', 'B4'], inner: EM_INNER },
  { bass: [['E2', 3]], tune: ['B4', 'A4', 'G4'], inner: EM_INNER },
  { bass: [['E2', 3]], tune: ['G4', 'F#4', 'E4'], inner: EM_INNER },
  { bass: [['E2', 3]], tune: ['E4', 'G4', 'B4'], inner: EM_INNER },
  { bass: [['E2', 3]], tune: ['E5', 'E5', 'E5'], inner: EM_INNER },
  { bass: [['E2', 3]], tune: ['E5', 'D5', 'C5'], inner: EM_INNER },
  { bass: [['A2', 3]], tune: ['C5', 'B4', 'A4'], inner: AM_INNER },
  { bass: [['A2', 3]], tune: ['A4', 'B4', 'C5'], inner: AM_INNER },
  { bass: [['B2low', 3]], tune: ['B4', 'C5', 'B4'], inner: B7_INNER },
  { bass: [['B2low', 3]], tune: ['D#5', 'C5', 'B4'], inner: B7_INNER },
  { bass: [['E2', 3]], tune: ['B4', 'A4', 'G4'], inner: EM_INNER },
  { bass: [['E2', 3]], tune: ['G4', 'F#4', 'E4'], inner: EM_INNER },
  { bass: [['B2', 3]], tune: ['F#4', 'F#4', 'F#4'], inner: B7_LOW_INNER },
  { bass: [['D#3', 3]], tune: ['F#4', 'G4', 'F#4'], inner: B7_LOW_INNER },
  { bass: [['E3', 1], ['B2', 1], ['G2', 1]], tune: ['E4', 'E4', 'E4'], inner: EM_INNER },
  { bass: [['E2', 2]], tune: ['E4', 'E4', 'E4'], inner: EM_INNER },
];

function romanceRows(): TabRow[] {
  const rows: TabRow[] = [];
  ROMANCE_BARS.forEach((bar, index) => {
    const start = index * 3 * BEAT;
    let at = start;
    for (const [place, beats] of bar.bass) {
      rows.push(row(at, pos(place), beats * BEAT));
      at += beats * BEAT;
    }
    // The last bar is the tune coming to rest: one held note, no triplets.
    if (index === ROMANCE_BARS.length - 1) {
      rows.push(row(start, pos('E4'), 2 * BEAT));
      return;
    }
    bar.tune.forEach((note, beat) => {
      const at = start + beat * BEAT;
      rows.push(row(at, pos(note), BEAT));
      rows.push(row(at + TRIPLET, pos(bar.inner[0]), TRIPLET));
      rows.push(row(at + TRIPLET * 2, pos(bar.inner[1]), TRIPLET));
    });
  });
  return rows;
}

/** Spanish Romance (anonymous), first section, bars 1-16, 3/4. */
export const SPANISH_ROMANCE_ROWS: readonly TabRow[] = romanceRows();

// ---------------------------------------------------------------------------
// Rooftops of Florence (original): a slow lute-like arpeggio in A minor.
//
// Each half bar is the same shape: a bass note, then the two inner strings
// plucked low-high-low, with the tune above on the first string. The bass
// walks down A, G, F, E under it, and the last chord turns to A major.
// ---------------------------------------------------------------------------

type ArpChord = {
  /** The bass at the start of the half bar, and the one a fifth up/down that opens the second half. */
  bass: readonly [string, string];
  /** The lower and the higher inner string. */
  inner: readonly [string, string];
};

const CHORDS: Record<string, ArpChord> = {
  Am: { bass: ['A2', 'E3'], inner: ['A3', 'C4'] },
  G: { bass: ['G2', 'D3'], inner: ['G3', 'B3'] },
  F: { bass: ['F2', 'C3'], inner: ['A3', 'C4'] },
  E: { bass: ['E2', 'B2'], inner: ['G#3', 'B3'] },
  Dm: { bass: ['D3', 'A2'], inner: ['A3', 'D4'] },
};

/** A bar of eight eighths; `chords` has one chord per half bar. */
type ArpBar = {
  chords: readonly [string, string];
  /** [eighth it starts on, note, length in eighths] */
  tune: readonly (readonly [number, string, number])[];
};

const ROOFTOPS_BARS: readonly ArpBar[] = [
  // The theme: A G F E under a falling tune.
  { chords: ['Am', 'Am'], tune: [[0, 'A4', 3], [3, 'G4', 1], [4, 'E4', 4]] },
  { chords: ['G', 'G'], tune: [[0, 'G4', 4], [4, 'E4', 2], [6, 'G4', 2]] },
  { chords: ['F', 'F'], tune: [[0, 'A4', 3], [3, 'G4', 1], [4, 'F4', 4]] },
  { chords: ['E', 'E'], tune: [[0, 'G#4', 3], [3, 'A4', 1], [4, 'G#4', 2], [6, 'E4', 2]] },
  // The theme again, a little higher.
  { chords: ['Am', 'Am'], tune: [[0, 'E4', 2], [2, 'A4', 2], [4, 'G4', 2], [6, 'E4', 2]] },
  { chords: ['G', 'G'], tune: [[0, 'B4', 3], [3, 'A4', 1], [4, 'G4', 4]] },
  { chords: ['F', 'F'], tune: [[0, 'A4', 3], [3, 'G4', 1], [4, 'F4', 2], [6, 'E4', 2]] },
  { chords: ['E', 'E'], tune: [[0, 'G#4', 4], [4, 'A4', 2], [6, 'G#4', 2]] },
  // The turn: through D minor, and back.
  { chords: ['Dm', 'Dm'], tune: [[0, 'A4', 2], [2, 'F4', 2], [4, 'A4', 2], [6, 'F4', 2]] },
  { chords: ['Am', 'Am'], tune: [[0, 'A4', 3], [3, 'G4', 1], [4, 'E4', 4]] },
  { chords: ['F', 'F'], tune: [[0, 'A4', 3], [3, 'F4', 1], [4, 'A4', 2], [6, 'G4', 2]] },
  { chords: ['E', 'E'], tune: [[0, 'A4', 2], [2, 'G#4', 2], [4, 'E4', 4]] },
  // Home: A G F E, and a major chord to end on.
  { chords: ['Am', 'Am'], tune: [[0, 'A4', 3], [3, 'G4', 1], [4, 'E4', 4]] },
  { chords: ['G', 'G'], tune: [[0, 'G4', 4], [4, 'F4', 2], [6, 'G4', 2]] },
  { chords: ['F', 'E'], tune: [[0, 'A4', 3], [3, 'F4', 1], [4, 'G#4', 3], [7, 'A4', 1]] },
];

function rooftopsRows(): TabRow[] {
  const rows: TabRow[] = [];
  ROOFTOPS_BARS.forEach((bar, index) => {
    const start = index * 4 * BEAT;
    bar.chords.forEach((name, half) => {
      const chord = CHORDS[name];
      if (chord === undefined) throw new Error(`italianTabs: no chord ${name}`);
      const at = start + half * 4 * EIGHTH;
      // The bass: the root, or on a repeated chord the fifth in the second half.
      const repeated = half === 1 && bar.chords[0] === name;
      rows.push(row(at, pos(chord.bass[repeated ? 1 : 0]), 4 * EIGHTH));
      // Then the two inner strings, low-high-low.
      rows.push(row(at + 1 * EIGHTH, pos(chord.inner[0]), 2 * EIGHTH));
      rows.push(row(at + 2 * EIGHTH, pos(chord.inner[1]), 2 * EIGHTH));
      rows.push(row(at + 3 * EIGHTH, pos(chord.inner[0]), 1 * EIGHTH));
    });
    for (const [eighth, note, length] of bar.tune) {
      rows.push(row(start + eighth * EIGHTH, pos(note), length * EIGHTH));
    }
  });
  // Last bar: an A major chord rolled upward and left to ring.
  const last = ROOFTOPS_BARS.length * 4 * BEAT;
  const roll: readonly (readonly [string, number])[] = [
    ['A2', 0], ['E3', 1], ['A3', 2], ['C#4', 3], ['E4', 4],
  ];
  roll.forEach(([note, eighth]) => {
    rows.push(row(last + eighth * EIGHTH, pos(note), 4 * BEAT - eighth * EIGHTH));
  });
  return rows;
}

/** Rooftops of Florence (original), 16 bars of 4/4. */
export const ROOFTOPS_ROWS: readonly TabRow[] = rooftopsRows();

// ---------------------------------------------------------------------------
// Tarantella in A minor (original): a fast 6/8 tune over open-string drones.
//
// A bar is six eighths. The thumb plays a drone on the first eighth and the
// fourth (an open A and E under A minor and E, an open D and A under D minor);
// the tune is eighths on the top two strings.
// ---------------------------------------------------------------------------

type TarantellaBar = {
  drone: readonly [string, string];
  /** Six eighths of tune, or a held final note (name:length in eighths). */
  tune: readonly string[];
};

const TARANTELLA_AM = ['A2', 'E2'] as const;
const TARANTELLA_E = ['E2', 'E2'] as const;
const TARANTELLA_DM = ['D3', 'A2'] as const;

const TARANTELLA_BARS: readonly TarantellaBar[] = [
  // First strain.
  { drone: TARANTELLA_AM, tune: ['A4', 'C5', 'B4', 'A4', 'C5', 'B4'] },
  { drone: TARANTELLA_AM, tune: ['A4', 'G#4', 'A4', 'E4', 'A4', 'C5'] },
  { drone: TARANTELLA_E, tune: ['B4', 'G#4', 'E4', 'B4', 'G#4', 'E4'] },
  { drone: TARANTELLA_AM, tune: ['A4', 'G#4', 'A4', 'B4', 'C5', 'A4'] },
  { drone: TARANTELLA_DM, tune: ['A4', 'F4', 'D4', 'A4', 'F4', 'A4'] },
  { drone: TARANTELLA_AM, tune: ['C5', 'B4', 'A4', 'C5', 'B4', 'A4'] },
  { drone: TARANTELLA_E, tune: ['G#4', 'B4', 'G#4', 'E4', 'G#4', 'B4'] },
  { drone: TARANTELLA_AM, tune: ['A4', 'C5', 'B4', 'A4', 'A4', 'E4'] },
  // Second strain, higher.
  { drone: TARANTELLA_AM, tune: ['E5', 'C5', 'B4', 'E5', 'C5', 'B4'] },
  { drone: TARANTELLA_AM, tune: ['C5', 'A4', 'E4', 'C5', 'A4', 'E4'] },
  { drone: TARANTELLA_DM, tune: ['F4', 'A4', 'D5', 'A4', 'F4', 'A4'] },
  { drone: TARANTELLA_AM, tune: ['C5', 'B4', 'A4', 'C5', 'E5', 'C5'] },
  { drone: TARANTELLA_E, tune: ['B4', 'G#4', 'E4', 'G#4', 'B4', 'E5'] },
  { drone: TARANTELLA_E, tune: ['D5', 'B4', 'G#4', 'B4', 'D5', 'B4'] },
  { drone: TARANTELLA_AM, tune: ['A4', 'C5', 'B4', 'E5', 'C5', 'B4'] },
  { drone: TARANTELLA_AM, tune: ['A4:6'] },
];

function tarantellaRows(): TabRow[] {
  const rows: TabRow[] = [];
  TARANTELLA_BARS.forEach((bar, index) => {
    const start = index * 3 * BEAT;
    const isLast = index === TARANTELLA_BARS.length - 1;
    rows.push(row(start, pos(bar.drone[0]), 3 * EIGHTH));
    if (!isLast) rows.push(row(start + 3 * EIGHTH, pos(bar.drone[1]), 3 * EIGHTH));
    bar.tune.forEach((token, eighth) => {
      const [note, length] = token.split(':');
      rows.push(row(start + eighth * EIGHTH, pos(note as string), Number(length ?? 1) * EIGHTH));
    });
  });
  return rows;
}

/** Tarantella in A minor (original), 16 bars of 6/8. */
export const TARANTELLA_ROWS: readonly TabRow[] = tarantellaRows();
