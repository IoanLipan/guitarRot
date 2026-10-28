import type { Song } from './songs';
import type { Riff, TabEvent } from './types';
import {
  BWV999_ROWS,
  CARCASSI_OP60_3_ROWS,
  CARCASSI_OP60_7_ROWS,
  MERTZ_ETUDE_ROWS,
  SOR_OP35_14_ROWS,
  rowsToEvents,
  type TabRow,
} from './classicalTabs';

/*
 * Eight hard songs: five public-domain classical guitar pieces and three
 * technique studies written for guitarRot.
 *
 * LICENSING. The classical pieces come from the Mutopia Project
 * (mutopiaproject.org), whose editions of these pieces are released into the
 * public domain by their typesetters — each piece's own page was checked and
 * its licence is recorded in the attribution below. The notes, rhythms and
 * tempi are the editions'; the string-and-fret choices are ours. The three
 * studies are original.
 */

const MUTOPIA_PIECE = 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=';

function mutopia(opts: {
  composer: string;
  dates: string;
  work: string;
  id: number;
  typesetter: string;
  excerpt: string;
}): string {
  return (
    `${opts.composer} (${opts.dates}), ${opts.work}. ` +
    `Mutopia Project edition by ${opts.typesetter}, Public Domain (${MUTOPIA_PIECE}${opts.id}). ` +
    `${opts.excerpt} Fingered for guitar by guitarRot.`
  );
}

type ClassicalSpec = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  bars: number;
  timeSignature: readonly [number, number];
  rows: readonly TabRow[];
  attribution: string;
  tags: readonly string[];
  about: string;
  style?: string;
};

function classical(spec: ClassicalSpec): Song {
  const style = spec.style ?? 'Classical guitar';
  const riff: Riff = {
    id: `piece-${spec.id}`,
    title: spec.title,
    style,
    level: 5,
    bpm: spec.bpm,
    timeSignature: [spec.timeSignature[0], spec.timeSignature[1]],
    bars: spec.bars,
    events: rowsToEvents(spec.rows),
    tags: [...spec.tags],
    source: 'public-domain',
    attribution: spec.attribution,
  };
  return {
    id: spec.id,
    title: spec.title,
    artist: spec.artist,
    difficulty: 'hard',
    style,
    key: spec.key,
    bpm: spec.bpm,
    source: 'public-domain',
    attribution: spec.attribution,
    tags: spec.tags,
    about: spec.about,
    riff,
  };
}

const CLASSICAL_TAGS = ['classical', 'fingerstyle', 'public-domain', 'polyphonic'];

export const bachPreludeBwv999: Song = classical({
  id: 'bach-prelude-bwv999',
  title: 'Prelude in D minor (BWV 999)',
  artist: 'Johann Sebastian Bach',
  style: 'Baroque',
  key: 'Dm',
  bpm: 80,
  bars: 16,
  timeSignature: [3, 4],
  rows: BWV999_ROWS,
  attribution: mutopia({
    composer: 'Johann Sebastian Bach',
    dates: '1685–1750',
    work: 'Prelude in D minor, BWV 999 (lute prelude, as played on guitar)',
    id: 60,
    typesetter: 'Jakob Bagterp',
    excerpt: 'Bars 1–16.',
  }),
  tags: [...CLASSICAL_TAGS, 'baroque', 'arpeggio', 'D minor'],
  about:
    'The bass note rings under a ripple of sixteenths: thumb on the bass, three fingers on the top strings. Keep the hand in third position and let every bass note sing.',
});

export const carcassiEtude7: Song = classical({
  id: 'carcassi-etude-op60-7',
  title: 'Étude No. 7 (Op. 60)',
  artist: 'Matteo Carcassi',
  key: 'Am',
  bpm: 110,
  bars: 16,
  timeSignature: [4, 4],
  rows: CARCASSI_OP60_7_ROWS,
  attribution: mutopia({
    composer: 'Matteo Carcassi',
    dates: '1792–1853',
    work: 'Étude No. 7 from 25 Études mélodiques progressives, Op. 60',
    id: 300,
    typesetter: 'Jeff Covey',
    excerpt: 'Bars 1–16.',
  }),
  tags: [...CLASSICAL_TAGS, 'etude', 'thumb-bass', 'A minor'],
  about:
    'A walking thumb on the bass with a repeated A above it. The fingers stay almost still while the thumb travels, which is harder than it sounds.',
});

export const carcassiEtude3: Song = classical({
  id: 'carcassi-etude-op60-3',
  title: 'Étude No. 3 (Op. 60)',
  artist: 'Matteo Carcassi',
  key: 'A',
  bpm: 60,
  bars: 16,
  timeSignature: [4, 4],
  rows: CARCASSI_OP60_3_ROWS,
  attribution: mutopia({
    composer: 'Matteo Carcassi',
    dates: '1792–1853',
    work: 'Étude No. 3 from 25 Études mélodiques progressives, Op. 60',
    id: 14,
    typesetter: 'Jeff Covey',
    excerpt: 'Bars 1–16.',
  }),
  tags: [...CLASSICAL_TAGS, 'etude', 'triplets', 'melody-over-arpeggio', 'A major'],
  about:
    'A melody sung on the top string over rolling triplets: bass, then two inner notes, three times a beat. Pluck the tune a little louder than the ripple.',
});

export const mertzEtude: Song = classical({
  id: 'mertz-etude-a-minor',
  title: 'Étude in A minor',
  artist: 'Johann Kaspar Mertz',
  key: 'Am',
  bpm: 76,
  bars: 16,
  timeSignature: [4, 4],
  rows: MERTZ_ETUDE_ROWS,
  attribution: mutopia({
    composer: 'Johann Kaspar Mertz',
    dates: '1806–1856',
    work: 'Étude in A minor',
    id: 111,
    typesetter: 'Emre Akbas',
    excerpt: 'The whole piece, 16 bars.',
  }),
  tags: [...CLASSICAL_TAGS, 'etude', 'romantic', 'A minor', 'whole-piece'],
  about:
    'A complete little piece: a bass that answers itself, a single E pinned on the top string, and chords that land off the beat. It ends on a held A.',
});

export const sorEtude14: Song = classical({
  id: 'sor-etude-op35-14',
  title: 'Étude No. 14 (Op. 35)',
  artist: 'Fernando Sor',
  key: 'Am',
  bpm: 80,
  bars: 16,
  timeSignature: [4, 4],
  rows: SOR_OP35_14_ROWS,
  attribution: mutopia({
    composer: 'Fernando Sor',
    dates: '1778–1839',
    work: 'Étude, Op. 35 No. 14',
    id: 64,
    typesetter: 'Jakob Bagterp',
    excerpt: 'Bars 1–16; the pick-up at the end leads straight back to bar 1.',
  }),
  tags: [...CLASSICAL_TAGS, 'etude', 'two-voices', 'A minor'],
  about:
    'Two voices at once: a singing top line and a bass that walks beneath it. The long notes in the bass are the point; hold each one down for its full length.',
});

// ---------------------------------------------------------------------------
// Original advanced studies.
// ---------------------------------------------------------------------------

type Pos = readonly [stringIndex: number, fret: number];

/** One sixteenth-note event at `slot` sixteenths from the start. */
function sixteenth([stringIndex, fret]: Pos, slot: number, length = 1): TabEvent {
  return { stringIndex, fret, beat: slot / 4, duration: length / 4 };
}

/**
 * A minor, three notes to a string, fifth position: A2 up to D5. Playing it
 * four notes at a time is the classic alternate-picking ladder — the pick
 * must cross a string every few notes without losing its down-up rhythm.
 */
const A_MINOR_LADDER: readonly Pos[] = [
  [0, 5], [0, 7], [0, 8], // A2 B2 C3
  [1, 5], [1, 7], [1, 8], // D3 E3 F3
  [2, 5], [2, 7], [2, 9], // G3 A3 B3
  [3, 5], [3, 7], [3, 9], // C4 D4 E4
  [4, 6], [4, 8], [4, 10], // F4 G4 A4
  [5, 7], [5, 8], [5, 10], // B4 C5 D5
];

/** Four rungs of the ladder as one beat of sixteenths. */
function cell(indices: readonly number[], beatIndex: number): TabEvent[] {
  return indices.map((rung, i) => {
    const position = A_MINOR_LADDER[rung];
    if (position === undefined) throw new Error(`no ladder rung ${rung}`);
    return sixteenth(position, beatIndex * 4 + i);
  });
}

const ladderUp = (base: number, beatIndex: number) =>
  cell([base, base + 1, base + 2, base + 1], beatIndex);
const ladderDown = (base: number, beatIndex: number) =>
  cell([base + 3, base + 2, base + 1, base], beatIndex);

const alternatePickingLadder: Riff = {
  id: 'study-alternate-picking-ladder',
  title: 'Alternate Picking Ladder',
  style: 'Shred technique',
  level: 5,
  bpm: 140,
  timeSignature: [4, 4],
  bars: 8,
  source: 'original',
  tags: ['alternate-picking', 'sixteenths', 'A minor', 'speed', 'string-crossing'],
  events: [
    // Bars 1-4: climb the ladder, up-up-up-back in every beat.
    ...Array.from({ length: 16 }, (_, beat) => ladderUp(beat, beat)).flat(),
    // Bars 5-8: come back down in falling fours, the pick never leaving its rhythm.
    ...Array.from({ length: 15 }, (_, beat) => ladderDown(14 - beat, 16 + beat)).flat(),
    // ...and land on the root, held for the last beat.
    { stringIndex: 0, fret: 5, beat: 31, duration: 1 },
  ],
};

/**
 * Five-string sweep shapes, low string to high: A, D, G, B, e. Open-position
 * shapes first, then the same four chords up the neck.
 */
const SWEEP_SHAPES: readonly (readonly [Pos, Pos, Pos, Pos, Pos])[] = [
  // Open position
  [[1, 0], [2, 2], [3, 2], [4, 1], [5, 0]], // Am: A E A C E
  [[1, 3], [2, 3], [3, 2], [4, 1], [5, 1]], // F:  C F A C F
  [[1, 3], [2, 2], [3, 0], [4, 1], [5, 0]], // C:  C E G C E
  [[1, 2], [2, 0], [3, 0], [4, 0], [5, 3]], // G:  B D G B G
  // Up the neck
  [[1, 7], [2, 7], [3, 5], [4, 5], [5, 5]], // Am: E A C E A
  [[1, 8], [2, 10], [3, 10], [4, 10], [5, 8]], // F:  F C F A C
  [[1, 10], [2, 10], [3, 9], [4, 8], [5, 8]], // C:  G C E G C
  [[1, 10], [2, 12], [3, 12], [4, 12], [5, 10]], // G:  G D G B D
];

/** Five up, three back down, twice: sixteen sixteenths, one bar. */
const SWEEP_ORDER = [0, 1, 2, 3, 4, 3, 2, 1] as const;

function sweepBar(shape: readonly [Pos, Pos, Pos, Pos, Pos], bar: number): TabEvent[] {
  return [0, 1].flatMap((half) =>
    SWEEP_ORDER.map((stringInShape, i) => {
      const position = shape[stringInShape];
      if (position === undefined) throw new Error('sweep shape has five strings');
      return sixteenth(position, bar * 16 + half * 8 + i);
    }),
  );
}

const sweepCascade: Riff = {
  id: 'study-sweep-cascade',
  title: 'Sweep Cascade',
  style: 'Neoclassical',
  level: 5,
  bpm: 112,
  timeSignature: [4, 4],
  bars: 8,
  source: 'original',
  tags: ['sweep-picking', 'arpeggio', 'A minor', 'Am-F-C-G', 'economy-picking'],
  events: SWEEP_SHAPES.flatMap((shape, bar) => sweepBar(shape, bar)),
};

/** Eighth-note slot (0-7) in a 4/4 bar, as a beat offset. */
const eighth = (bar: number, slot: number): number => bar * 4 + slot / 2;

type Travis = readonly [slot: number, stringIndex: number, fret: number, technique?: 'hammer'];

/**
 * One bar of Travis picking. A note on the beat is a beat long and one on the
 * offbeat half a beat, but never longer than the time until the same string
 * is struck again, so no string is asked to sound two notes at once.
 */
function travisBar(bar: number, notes: readonly Travis[]): TabEvent[] {
  return notes.map(([slot, stringIndex, fret, technique]) => {
    const next = notes
      .filter(([otherSlot, otherString]) => otherString === stringIndex && otherSlot > slot)
      .map(([otherSlot]) => otherSlot);
    const nextSlot = Math.min(8, ...next);
    const own = slot % 2 === 0 ? 2 : 1;
    return {
      stringIndex,
      fret,
      beat: eighth(bar, slot),
      duration: Math.min(own, nextSlot - slot) / 2,
      ...(technique === undefined ? {} : { technique }),
    };
  });
}

/*
 * The thumb alternates two bass strings on every beat; the fingers answer on
 * the offbeats. Each chord has a couple of melody variants so twelve bars do
 * not read as one bar copied twelve times. Notes at one beat are listed bass
 * first, so a hammer-on always follows the note it climbs from.
 */
/** E7, with the blue third (G) hammered up to the major third (G#) at the end. */
const E7_A: readonly Travis[] = [
  [0, 0, 0], [0, 5, 0], [1, 4, 0], [2, 1, 2], [3, 5, 0], [4, 0, 0], [4, 4, 0], [5, 5, 0],
  [6, 1, 2], [6, 3, 0], [7, 3, 1, 'hammer'],
];
/** E7, answering with the blue third (G) on the top string. */
const E7_B: readonly Travis[] = [
  [0, 0, 0], [0, 4, 0], [1, 5, 0], [2, 1, 2], [3, 3, 1], [4, 0, 0], [4, 4, 0], [5, 5, 0],
  [6, 1, 2], [6, 3, 1], [7, 5, 3],
];
/** A7, with the flat seventh (G) hammered up to the root (A). */
const A7_A: readonly Travis[] = [
  [0, 1, 0], [0, 5, 0], [1, 4, 2], [2, 2, 2], [3, 3, 0], [4, 1, 0], [4, 5, 0], [5, 4, 2],
  [6, 2, 2], [6, 3, 0], [7, 3, 2, 'hammer'],
];
const A7_B: readonly Travis[] = [
  [0, 1, 0], [0, 4, 2], [1, 5, 0], [2, 2, 2], [3, 3, 0], [4, 1, 0], [4, 5, 0], [5, 4, 2],
  [6, 2, 2], [7, 3, 2],
];
const B7_A: readonly Travis[] = [
  [0, 1, 2], [0, 5, 2], [1, 4, 0], [2, 0, 2], [3, 3, 2], [4, 1, 2], [4, 4, 0], [5, 2, 1],
  [6, 0, 2], [7, 3, 2],
];
/** The turnaround: the thumb walks down B, A, G#, F# and lands back on E. */
const B7_TURN: readonly Travis[] = [
  [0, 1, 2], [0, 5, 2], [1, 4, 4], [2, 1, 0], [3, 4, 0], [4, 0, 4], [4, 5, 0], [5, 4, 0],
  [6, 0, 2], [6, 3, 1], [7, 5, 0],
];

const travisBluesInE: Riff = {
  id: 'study-travis-blues-in-e',
  title: 'Travis Blues in E',
  style: 'Fingerstyle blues',
  level: 5,
  bpm: 96,
  timeSignature: [4, 4],
  bars: 12,
  source: 'original',
  tags: ['travis-picking', 'fingerstyle', 'blues', 'E', 'alternating-bass', 'twelve-bar'],
  events: [
    // E7 x4
    ...travisBar(0, E7_A),
    ...travisBar(1, E7_B),
    ...travisBar(2, E7_A),
    ...travisBar(3, E7_B),
    // A7 x2, E7 x2
    ...travisBar(4, A7_A),
    ...travisBar(5, A7_B),
    ...travisBar(6, E7_A),
    ...travisBar(7, E7_B),
    // B7, A7, E7, B7 turnaround
    ...travisBar(8, B7_A),
    ...travisBar(9, A7_A),
    ...travisBar(10, E7_A),
    ...travisBar(11, B7_TURN),
  ],
};

export const alternatePickingLadderSong: Song = {
  id: 'alternate-picking-ladder',
  title: 'Alternate Picking Ladder',
  artist: 'guitarRot',
  difficulty: 'hard',
  style: 'Shred technique',
  key: 'Am',
  bpm: 140,
  source: 'original',
  tags: ['alternate-picking', 'speed', 'sixteenths', 'lead'],
  about:
    'Eight bars of sixteenths up and down one A minor position. Strict down-up the whole way, and start at 60% on the speed slider.',
  riff: alternatePickingLadder,
};

export const sweepCascadeSong: Song = {
  id: 'sweep-cascade',
  title: 'Sweep Cascade',
  artist: 'guitarRot',
  difficulty: 'hard',
  style: 'Neoclassical',
  key: 'Am',
  bpm: 112,
  source: 'original',
  tags: ['sweep-picking', 'arpeggio', 'Am-F-C-G', 'lead'],
  about:
    'Five strings up, three back down, over Am, F, C and G, first in open position and then up the neck. One smooth pick stroke per direction; the notes should not smear.',
  riff: sweepCascade,
};

export const travisBluesInESong: Song = {
  id: 'travis-blues-in-e',
  title: 'Travis Blues in E',
  artist: 'guitarRot',
  difficulty: 'hard',
  style: 'Fingerstyle blues',
  key: 'E',
  bpm: 96,
  source: 'original',
  tags: ['fingerstyle', 'travis-picking', 'blues', 'twelve-bar'],
  about:
    'A twelve-bar blues with the thumb keeping steady time on two bass strings and the fingers answering between the beats. Play the eighths with a lazy swing.',
  riff: travisBluesInE,
};

export const HARD_SONGS: readonly Song[] = [
  bachPreludeBwv999,
  carcassiEtude7,
  carcassiEtude3,
  mertzEtude,
  sorEtude14,
  alternatePickingLadderSong,
  sweepCascadeSong,
  travisBluesInESong,
];
