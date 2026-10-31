import { melodyRiff } from './melody';
import { songToRiff, type Song, type StrumPattern } from './songs';
import type { Riff, TabEvent, Technique } from './types';

/*
 * The ukulele's feed riffs: short pieces written for guitarRot, for the four
 * strings G C E A (string index 0 is the high G, the bottom line of the tab).
 * They do what the ukulele does best rather than copying a guitar riff: pick
 * across the re-entrant strings so notes ring into each other (campanella),
 * strum and chop in the island style, and run scales in first position.
 *
 * Every one is an original, so none carries an attribution. Chords are given
 * as the four frets on G C E A, the same digits as the chord library's.
 */

type Frets = readonly [g: number, c: number, e: number, a: number];

const C: Frets = [0, 0, 0, 3];
const AM: Frets = [2, 0, 0, 0];
const F: Frets = [2, 0, 1, 0];
const G7: Frets = [0, 2, 1, 2];

function note(
  stringIndex: number,
  fret: number,
  beat: number,
  duration: number,
  technique?: Technique,
): TabEvent {
  return technique === undefined
    ? { stringIndex, fret, beat, duration }
    : { stringIndex, fret, beat, duration, technique };
}

function fretOn(frets: Frets, stringIndex: number): number {
  const fret = frets[stringIndex];
  if (fret === undefined) throw new Error(`no string ${stringIndex}`);
  return fret;
}

/**
 * One bar of picked notes, one string per slot. A note rings until its string
 * is picked again, the bar ends, or `ring` beats have passed, whichever is
 * first, so a string never sounds twice at once.
 */
function pickBar(
  frets: Frets,
  pattern: readonly number[],
  barStart: number,
  { step = 0.5, ring = 2, perBar = 4 }: { step?: number; ring?: number; perBar?: number } = {},
): TabEvent[] {
  const barEnd = barStart + perBar;
  return pattern.map((stringIndex, slot) => {
    const beat = barStart + slot * step;
    const nextSlot = pattern.findIndex((other, later) => later > slot && other === stringIndex);
    const until = nextSlot === -1 ? barEnd : barStart + nextSlot * step;
    return note(stringIndex, fretOn(frets, stringIndex), beat, Math.min(ring, until - beat));
  });
}

/** Strings struck one after another, a hair apart: a down-strum from the high G, an up-strum back. */
const STRUM_SPREAD = 0.02;

function strum(frets: Frets, beat: number, duration: number, limit: number, up = false): TabEvent[] {
  const order = up ? [3, 2, 1, 0] : [0, 1, 2, 3];
  return order.map((stringIndex, i) => {
    const at = beat + i * STRUM_SPREAD;
    // Every string ends where the stroke nominally does, so the next stroke finds it quiet.
    const length = Math.min(duration - i * STRUM_SPREAD, limit - at);
    return note(stringIndex, fretOn(frets, stringIndex), at, Math.max(0.05, length));
  });
}

/**
 * A line of single notes whose strings ring into each other. Each note is held
 * for `ring` beats, but only until its own string is picked again (or the riff
 * ends), so no string sounds two notes at once.
 */
function ringLine(
  line: readonly { stringIndex: number; fret: number; beat: number }[],
  ring: number,
  end: number,
): TabEvent[] {
  return line.map((entry, i) => {
    const again = line.find((other, j) => j > i && other.stringIndex === entry.stringIndex);
    return note(entry.stringIndex, entry.fret, entry.beat, Math.min(ring, (again?.beat ?? end) - entry.beat));
  });
}

/** A riff strummed from a chord chart, exactly the way the Songs tab strums it. */
function strumRiff(spec: {
  id: string;
  title: string;
  style: string;
  level: Riff['level'];
  bpm: number;
  pattern: StrumPattern;
  /** Space-separated chord names, one per bar. */
  bars: string;
  tags: string[];
}): Riff {
  const bars = spec.bars.split(' ');
  const song: Song = {
    id: spec.id,
    instrument: 'ukulele',
    title: spec.title,
    artist: 'guitarRot',
    difficulty: 'easy',
    style: spec.style,
    key: bars[0] ?? '',
    bpm: spec.bpm,
    source: 'original',
    tags: spec.tags,
    about: spec.title,
    chart: { pattern: spec.pattern, timeSignature: [4, 4], sections: [{ label: 'Riff', bars }] },
  };
  return { ...songToRiff(song, 'ukulele'), id: spec.id, level: spec.level };
}

/** A single-note tune written as pitch names, tabbed on the ukulele. */
function tune(spec: {
  id: string;
  title: string;
  style: string;
  level: Riff['level'];
  bpm: number;
  tags: string[];
  notes: string;
}): Riff {
  return melodyRiff({ ...spec, instrument: 'ukulele', source: 'original' });
}

// ---------------------------------------------------------------------------
// Level 1: the open strings and the first frets.
// ---------------------------------------------------------------------------

/** G C E A up as quarters, back down, then eighths up and over, and the four strings strummed together to finish. */
const openStringRoll: Riff = {
  id: 'uke-open-string-roll',
  instrument: 'ukulele',
  title: 'Open string roll',
  style: 'Fingerpicking',
  level: 1,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['open-strings', 'string-names', 'campanella', 'fingerpicking'],
  events: [
    ...[0, 1, 2, 3].map((s, i) => note(s, 0, i, 1)),
    ...[3, 2, 1, 0].map((s, i) => note(s, 0, 4 + i, 1)),
    ...[0, 1, 2, 3, 3, 2, 1, 0].map((s, i) => note(s, 0, 8 + i * 0.5, 0.5)),
    // The open strings together are a C6 chord; let it ring for the whole last bar.
    ...[0, 1, 2, 3].map((s, i) => note(s, 0, 12 + i * STRUM_SPREAD, 4 - i * STRUM_SPREAD)),
  ],
};

const cPickBasic: Riff = {
  id: 'uke-c-pick-basic',
  instrument: 'ukulele',
  title: 'Picking a C chord',
  style: 'Fingerpicking',
  level: 1,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['fingerpicking', 'C', 'Am', 'one-finger', 'pattern'],
  events: [C, C, AM, AM].flatMap((chord, bar) => pickBar(chord, [1, 2, 3, 2, 1, 2, 3, 2], bar * 4)),
};

/** Four notes up each string, one finger to a fret. */
const fretWalk: Riff = {
  id: 'uke-fret-walk',
  instrument: 'ukulele',
  title: 'One finger per fret',
  style: 'Warm-up',
  level: 1,
  bpm: 70,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['warm-up', 'first-position', 'one-finger-per-fret'],
  events: [0, 1, 2, 3].flatMap((stringIndex) =>
    [1, 2, 3, 4].map((fret, i) => note(stringIndex, fret, stringIndex * 2 + i * 0.5, 0.5)),
  ),
};

const sunriseTune = tune({
  id: 'uke-sunrise-tune',
  title: 'Sunrise on the A string',
  style: 'Melody',
  level: 1,
  bpm: 84,
  tags: ['melody', 'single-notes', 'pentatonic', 'C major', 'first-position'],
  notes:
    'G4:1 E4:1 A4:1 G4:1 | C5:2 A4:1 G4:1 | E4:1 G4:1 A4:1 C5:1 | A4:2 G4:2 | ' +
    'E4:1 E4:1 G4:1 A4:1 | G4:1 E4:1 C4:2',
});

// ---------------------------------------------------------------------------
// Level 2: scales, a strum, a waltz and the first hammer-ons.
// ---------------------------------------------------------------------------

const cMajorScale = tune({
  id: 'uke-c-major-scale',
  title: 'C major scale, Do to Do',
  style: 'Scale',
  level: 2,
  bpm: 80,
  tags: ['scale', 'C major', 'first-position', 'solfege'],
  notes: 'C4:1 D4:1 E4:1 F4:1 | G4:1 A4:1 B4:1 C5:1 | C5:1 B4:1 A4:1 G4:1 | F4:1 E4:1 D4:1 C4:1',
});

const cPentatonicRun = tune({
  id: 'uke-c-pentatonic-run',
  title: 'C major pentatonic run',
  style: 'Scale',
  level: 2,
  bpm: 90,
  tags: ['scale', 'pentatonic', 'C major', 'first-position', 'eighth-notes'],
  notes:
    'C4:0.5 D4:0.5 E4:0.5 G4:0.5 A4:0.5 C5:0.5 D5:0.5 C5:0.5 | A4:0.5 G4:0.5 E4:0.5 D4:0.5 C4:2 | ' +
    'G4:0.5 A4:0.5 C5:0.5 D5:0.5 C5:0.5 A4:0.5 G4:0.5 E4:0.5 | D4:1 E4:1 C4:2',
});

const islandStrum = strumRiff({
  id: 'uke-island-strum',
  title: 'Island strum',
  style: 'Island strum',
  level: 2,
  bpm: 90,
  pattern: 'folk',
  bars: 'C C F F G7 G7 C C',
  tags: ['strumming', 'island', 'down-down-up-up-down-up', 'C', 'F', 'G7'],
});

/** A bass note, then two pairs of chord tones: one-two-three, one-two-three. */
function waltzBar(frets: Frets, bassString: number, barStart: number): TabEvent[] {
  return [
    note(bassString, fretOn(frets, bassString), barStart, 1),
    note(2, fretOn(frets, 2), barStart + 1, 0.5),
    note(3, fretOn(frets, 3), barStart + 1.5, 0.5),
    note(2, fretOn(frets, 2), barStart + 2, 0.5),
    note(3, fretOn(frets, 3), barStart + 2.5, 0.5),
  ];
}

const lullabyWaltz: Riff = {
  id: 'uke-lullaby-waltz',
  instrument: 'ukulele',
  title: 'Lullaby waltz',
  style: 'Fingerpicking',
  level: 2,
  bpm: 84,
  timeSignature: [3, 4],
  bars: 4,
  source: 'original',
  tags: ['waltz', '3/4', 'fingerpicking', 'C', 'Am', 'F', 'G7'],
  events: [
    ...waltzBar(C, 1, 0),
    ...waltzBar(AM, 1, 3),
    ...waltzBar(F, 1, 6),
    ...waltzBar(G7, 0, 9),
  ],
};

const amFPick: Riff = {
  id: 'uke-am-f-pick',
  instrument: 'ukulele',
  title: 'Am and F, picked',
  style: 'Fingerpicking',
  level: 2,
  bpm: 86,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['fingerpicking', 'Am', 'F', 'arpeggio', 'minor'],
  events: [AM, F, AM, F].flatMap((chord, bar) => pickBar(chord, [1, 3, 2, 3, 0, 3, 2, 3], bar * 4, { ring: 1.5 })),
};

/** Hammer-ons and pull-offs on the A and E strings: only the first note of each pair is picked. */
const firstHammers: Riff = {
  id: 'uke-first-hammers',
  instrument: 'ukulele',
  title: 'First hammer-ons',
  style: 'Technique',
  level: 2,
  bpm: 72,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['hammer-on', 'pull-off', 'legato', 'A-string', 'E-string'],
  events: [
    // Bar 1: pick the open A string, hammer on to the second fret, then the third.
    note(3, 0, 0, 0.5),
    note(3, 2, 0.5, 0.5, 'hammer'),
    note(3, 0, 1, 0.5),
    note(3, 2, 1.5, 0.5, 'hammer'),
    note(3, 0, 2, 0.5),
    note(3, 3, 2.5, 0.5, 'hammer'),
    note(3, 0, 3, 0.5),
    note(3, 3, 3.5, 0.5, 'hammer'),
    // Bar 2: the other way. Pick the fretted note, pull off to the open string.
    note(3, 2, 4, 0.5),
    note(3, 0, 4.5, 0.5, 'pull'),
    note(3, 2, 5, 0.5),
    note(3, 0, 5.5, 0.5, 'pull'),
    note(3, 3, 6, 0.5),
    note(3, 0, 6.5, 0.5, 'pull'),
    note(3, 3, 7, 0.5),
    note(3, 0, 7.5, 0.5, 'pull'),
    // Bar 3: a trill on the E string. One pick, then the finger does the rest.
    note(2, 0, 8, 0.5),
    note(2, 1, 8.5, 0.5, 'hammer'),
    note(2, 0, 9, 0.5, 'pull'),
    note(2, 1, 9.5, 0.5, 'hammer'),
    note(2, 0, 10, 0.5, 'pull'),
    note(2, 1, 10.5, 0.5, 'hammer'),
    note(2, 0, 11, 0.5, 'pull'),
    note(2, 1, 11.5, 0.5, 'hammer'),
    // Bar 4: both together on the A string, ending on the open note.
    note(3, 0, 12, 0.5),
    note(3, 2, 12.5, 0.5, 'hammer'),
    note(3, 0, 13, 0.5, 'pull'),
    note(3, 3, 13.5, 0.5, 'hammer'),
    note(3, 0, 14, 0.5, 'pull'),
    note(3, 2, 14.5, 0.5, 'hammer'),
    note(3, 0, 15, 1, 'pull'),
  ],
};

/** The C chord's notes with a blue one passing through: a walking line that stays in the first frets. */
const openWalkC = tune({
  id: 'uke-open-walk-c',
  title: 'Open-string walk in C',
  style: 'Blues',
  level: 2,
  bpm: 100,
  tags: ['blues', 'walking-line', 'C', 'open-strings', 'eighth-notes'],
  notes:
    'C4:0.5 E4:0.5 G4:0.5 A4:0.5 A#4:0.5 A4:0.5 G4:0.5 E4:0.5 | ' +
    'C4:0.5 E4:0.5 G4:0.5 A4:0.5 A#4:0.5 A4:0.5 G4:0.5 E4:0.5 | ' +
    'F4:0.5 A4:0.5 C5:0.5 A4:0.5 F4:0.5 A4:0.5 C5:0.5 A4:0.5 | ' +
    'G4:0.5 B4:0.5 D5:0.5 B4:0.5 G4:0.5 E4:0.5 C4:1',
});

// ---------------------------------------------------------------------------
// Level 3: patterns with two things going on.
// ---------------------------------------------------------------------------

/** Reggae: a bass note on the one, then nothing on the beat and a short upstroke chop on every off-beat. */
function chopBar(frets: Frets, barStart: number): TabEvent[] {
  return [
    note(1, fretOn(frets, 1), barStart, 0.5),
    ...[0.5, 1.5, 2.5, 3.5].flatMap((offset) => strum(frets, barStart + offset, 0.25, barStart + 4, true)),
  ];
}

const offBeatChop: Riff = {
  id: 'uke-off-beat-chop',
  instrument: 'ukulele',
  title: 'Off-beat chop',
  style: 'Reggae',
  level: 3,
  bpm: 76,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['reggae', 'chop', 'off-beat', 'upstrokes', 'C', 'F', 'G7'],
  events: [C, F, G7, C].flatMap((chord, bar) => chopBar(chord, bar * 4)),
};

/** The open C chord's notes in a falling ring, one per string: top A, high G, E, C, twice a bar. */
const fallingBells: Riff = {
  id: 'uke-falling-bells',
  instrument: 'ukulele',
  title: 'Falling bells',
  style: 'Campanella',
  level: 3,
  bpm: 72,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['campanella', 're-entrant', 'ringing-notes', 'arpeggio', 'C', 'Am', 'F', 'G7'],
  events: [C, AM, F, G7].flatMap((chord, bar) => pickBar(chord, [3, 0, 2, 1, 3, 0, 2, 1], bar * 4, { ring: 2 })),
};

/** Root and fifth in the bass on beats one and three, the top two strings answering between. */
function alternatingBar(frets: Frets, bassA: number, bassB: number, barStart: number): TabEvent[] {
  return [
    note(bassA, fretOn(frets, bassA), barStart, 1),
    note(2, fretOn(frets, 2), barStart + 1, 1),
    note(3, fretOn(frets, 3), barStart + 1, 1),
    note(bassB, fretOn(frets, bassB), barStart + 2, 1),
    note(2, fretOn(frets, 2), barStart + 3, 1),
    note(3, fretOn(frets, 3), barStart + 3, 1),
  ];
}

const folkAlternatingBass: Riff = {
  id: 'uke-folk-alternating-bass',
  instrument: 'ukulele',
  title: 'Alternating bass, folk style',
  style: 'Folk',
  level: 3,
  bpm: 92,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['folk', 'alternating-bass', 'pinch', 'fingerpicking', 'C', 'F', 'G7'],
  events: [
    ...alternatingBar(C, 1, 0, 0),
    ...alternatingBar(F, 1, 0, 4),
    ...alternatingBar(C, 1, 0, 8),
    ...alternatingBar(G7, 0, 1, 12),
  ],
};

const gMajorRun = tune({
  id: 'uke-g-major-run',
  title: 'G major run, up and back',
  style: 'Scale',
  level: 3,
  bpm: 96,
  tags: ['scale', 'G major', 'first-position', 'eighth-notes'],
  notes:
    'D4:0.5 E4:0.5 F#4:0.5 G4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:0.5 | ' +
    'D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 E4:0.5 D4:0.5 | ' +
    'G4:0.5 A4:0.5 B4:0.5 D5:0.5 B4:0.5 A4:0.5 G4:1 | G4:4',
});

/** The three lower strings as a chord, with a tune on the A string above it. */
function chordMelody(
  lower: readonly [g: number, c: number, e: number],
  tuneFrets: readonly [number, number, number, number],
  barStart: number,
): TabEvent[] {
  return [
    ...[0, 2].flatMap((beat) => lower.map((fret, stringIndex) => note(stringIndex, fret, barStart + beat, 2))),
    ...tuneFrets.map((fret, i) => note(3, fret, barStart + i, 1)),
  ];
}

const chordMelodyC: Riff = {
  id: 'uke-chord-melody-c',
  instrument: 'ukulele',
  title: 'Chord-melody in C',
  style: 'Chord-melody',
  level: 3,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['chord-melody', 'A-string', 'C', 'Am', 'F', 'G7', 'melody-on-top'],
  events: [
    // C: the tune climbs C D E and turns back to D.
    ...chordMelody([0, 0, 0], [3, 5, 7, 5], 0),
    // Am: C B A B.
    ...chordMelody([2, 0, 0], [3, 2, 0, 2], 4),
    // F: A C D C.
    ...chordMelody([2, 0, 1], [0, 3, 5, 3], 8),
    // G7: D, B, then the whole C chord to land on.
    ...[0, 2, 1].map((fret, i) => note(i, fret, 12, 2)),
    note(3, 5, 12, 1),
    note(3, 2, 13, 1),
    ...strum(C, 14, 2, 16),
  ],
};

/** A pinch (two strings at once) on the beat, then the strings in between. */
function pinchBar(frets: Frets, barStart: number): TabEvent[] {
  return [
    note(0, fretOn(frets, 0), barStart, 2.5),
    note(3, fretOn(frets, 3), barStart, 2.5),
    note(2, fretOn(frets, 2), barStart + 1, 1),
    note(1, fretOn(frets, 1), barStart + 1.5, 2.5),
    note(2, fretOn(frets, 2), barStart + 2, 1),
    note(0, fretOn(frets, 0), barStart + 2.5, 1.5),
    note(3, fretOn(frets, 3), barStart + 2.5, 1.5),
    note(2, fretOn(frets, 2), barStart + 3, 1),
  ];
}

const pinchPickAm: Riff = {
  id: 'uke-pinch-pick-am',
  instrument: 'ukulele',
  title: 'Pinch pattern in A minor',
  style: 'Fingerpicking',
  level: 3,
  bpm: 84,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['fingerpicking', 'pinch', 'Am', 'F', 'C', 'G7', 'syncopation'],
  events: [AM, F, C, G7].flatMap((chord, bar) => pinchBar(chord, bar * 4)),
};

/** A bass note picked on the beat, then the island strum: down, down-up, up, down-up. */
function pickStrumBar(frets: Frets, bassString: number, barStart: number): TabEvent[] {
  const limit = barStart + 4;
  return [
    note(bassString, fretOn(frets, bassString), barStart, 1),
    ...strum(frets, barStart + 1, 0.5, limit),
    ...strum(frets, barStart + 1.5, 0.5, limit, true),
    ...strum(frets, barStart + 2.5, 0.5, limit, true),
    ...strum(frets, barStart + 3, 0.5, limit),
    ...strum(frets, barStart + 3.5, 0.5, limit, true),
  ];
}

const islandPickStrum: Riff = {
  id: 'uke-island-pick-strum',
  instrument: 'ukulele',
  title: 'Pick and strum',
  style: 'Island strum',
  level: 3,
  bpm: 88,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['island', 'strumming', 'pick-and-strum', 'bass-note', 'Am', 'F', 'C', 'G7'],
  events: [
    ...pickStrumBar(AM, 1, 0),
    ...pickStrumBar(F, 1, 4),
    ...pickStrumBar(C, 1, 8),
    ...pickStrumBar(G7, 0, 12),
  ],
};

// ---------------------------------------------------------------------------
// Level 4: reaching up the neck, and patterns that keep both hands busy.
// ---------------------------------------------------------------------------

/**
 * A scale that alternates the high G and the A string, so each note rings over
 * the next: G4 on the G string, A4 open, B4 on the G string's fourth fret, and
 * so on. The same pitches sit on one string, but the hand never has to let go.
 */
const BELL_UP_G: readonly (readonly [string: number, fret: number])[] = [[0, 0], [3, 0], [0, 4], [3, 3], [0, 7], [3, 7]]; // G4 A4 B4 C5 D5 E5

/** Six notes of a bell line at `start`, each a half beat after the last. */
function bellRun(run: readonly (readonly [number, number])[], start: number) {
  return run.map(([stringIndex, fret], i) => ({ stringIndex, fret, beat: start + i * 0.5 }));
}

const bellScaleG: Riff = {
  id: 'uke-bell-scale-g',
  instrument: 'ukulele',
  title: 'Bell scale in G',
  style: 'Campanella',
  level: 4,
  bpm: 76,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['campanella', 're-entrant', 'scale', 'G major', 'ringing-notes', 'two-strings'],
  events: ringLine(
    [
      ...bellRun(BELL_UP_G, 0),
      ...bellRun([...BELL_UP_G].reverse(), 4),
      ...bellRun(BELL_UP_G, 8),
      ...bellRun([...BELL_UP_G].reverse(), 12),
    ],
    2,
    16,
  ),
};

/** The A minor pentatonic scale on the A string alone, with slides up the neck. */
const amPentatonicLick: Riff = {
  id: 'uke-am-pentatonic-lick',
  instrument: 'ukulele',
  title: 'A minor pentatonic lick',
  style: 'Solo',
  level: 4,
  bpm: 92,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['pentatonic', 'A minor', 'slide', 'A-string', 'up-the-neck'],
  events: [
    // A4 C5 D5, then up the string to E5 with a slide from the fifth fret.
    note(3, 0, 0, 0.5),
    note(3, 3, 0.5, 0.5),
    note(3, 5, 1, 0.5),
    note(3, 5, 1.5, 0.5),
    note(3, 7, 2, 1, 'slide'),
    note(3, 5, 3, 0.5),
    note(3, 3, 3.5, 0.5),
    // The answer: down from G5, then G5 again and a slide to A5, and home to the open A.
    note(3, 10, 4, 0.5),
    note(3, 7, 4.5, 0.5),
    note(3, 5, 5, 0.5),
    note(3, 3, 5.5, 0.5),
    note(3, 10, 6, 0.5),
    note(3, 12, 6.5, 0.5, 'slide'),
    note(3, 0, 7, 1),
  ],
};

/** The boogie oscillation: a root drone with a partner note stepping from the fifth to the sixth. */
function boogieBar(
  rootString: number,
  rootFret: number,
  partnerString: number,
  fifthFret: number,
  sixthFret: number,
  startBeat: number,
): TabEvent[] {
  return [0, 1, 2, 3].flatMap((offset) => {
    const beat = startBeat + offset;
    return [
      note(rootString, rootFret, beat, 0.5),
      note(partnerString, fifthFret, beat, 0.5),
      note(rootString, rootFret, beat + 0.5, 0.5),
      note(partnerString, sixthFret, beat + 0.5, 0.5),
    ];
  });
}

const boogieC: Riff = {
  id: 'uke-boogie-c',
  instrument: 'ukulele',
  title: 'Boogie in C',
  style: 'Blues',
  level: 4,
  bpm: 100,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['blues', 'boogie', 'shuffle', 'C', 'F', 'G', 'up-the-neck'],
  events: [
    // C: the C string's open root with the fifth and sixth on the E string.
    ...boogieBar(1, 0, 2, 3, 5, 0),
    // F: the C string's fifth fret, the fifth and sixth up on the A string.
    ...boogieBar(1, 5, 3, 3, 5, 4),
    ...boogieBar(1, 0, 2, 3, 5, 8),
    // G: the C string's seventh fret, with the A string above it.
    ...boogieBar(1, 7, 3, 5, 7, 12),
  ],
};

/** A trill between two frets with one pick, then the same shape a step higher, then a slide up. */
function trill(stringIndex: number, low: number, high: number, start: number, notes: number): TabEvent[] {
  return Array.from({ length: notes }, (_, i) =>
    i === 0
      ? note(stringIndex, low, start, 0.25)
      : note(stringIndex, i % 2 === 1 ? high : low, start + i * 0.25, 0.25, i % 2 === 1 ? 'hammer' : 'pull'),
  );
}

const trillAndTurn: Riff = {
  id: 'uke-trill-and-turn',
  instrument: 'ukulele',
  title: 'Trill and turn',
  style: 'Technique',
  level: 4,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['trill', 'hammer-on', 'pull-off', 'sixteenths', 'A-string', 'legato'],
  events: [
    // Bar 1: a two-beat trill on the third and fifth frets, a pause, and a turn down to the open string.
    ...trill(3, 3, 5, 0, 8),
    note(3, 3, 2, 0.5),
    note(3, 2, 2.5, 0.5),
    note(3, 0, 3, 1),
    // Bar 2: the same trill a step higher, then a slide to land on the seventh fret.
    ...trill(3, 5, 7, 4, 8),
    note(3, 5, 6, 0.5),
    note(3, 5, 6.5, 0.5),
    note(3, 7, 7, 1, 'slide'),
    // Bar 3: trill on the E string and back down the C string.
    ...trill(2, 3, 5, 8, 8),
    note(2, 3, 10, 0.5),
    note(2, 0, 10.5, 0.5),
    note(1, 2, 11, 0.5),
    note(1, 0, 11.5, 0.5),
    // Bar 4: the first trill once more and a long open A to finish.
    ...trill(3, 3, 5, 12, 8),
    note(3, 0, 14, 2),
  ],
};

/** The thumb alternates the C and G strings, the fingers play E and A between. */
function travisBar(frets: Frets, barStart: number): TabEvent[] {
  return pickBar(frets, [1, 3, 0, 2, 1, 3, 0, 2], barStart, { ring: 1.5 });
}

const travisPickCG7: Riff = {
  id: 'uke-travis-pick-c-g7',
  instrument: 'ukulele',
  title: 'Travis pick on the ukulele',
  style: 'Fingerpicking',
  level: 4,
  bpm: 100,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['travis-picking', 'alternating-bass', 'fingerpicking', 'C', 'Am', 'F', 'G7'],
  events: [C, AM, F, G7].flatMap((chord, bar) => travisBar(chord, bar * 4)),
};

// ---------------------------------------------------------------------------
// Level 5: speed and reach.
// ---------------------------------------------------------------------------

/**
 * C major through two octaves on the A string and its neighbours, C4 up to C6
 * at the fifteenth fret, in sixteenths and back down.
 */
const TWO_OCTAVES: readonly (readonly [string: number, fret: number])[] = [
  [1, 0], // C4
  [1, 2], // D4
  [2, 0], // E4
  [2, 1], // F4
  [0, 0], // G4
  [3, 0], // A4
  [3, 2], // B4
  [3, 3], // C5
  [3, 5], // D5
  [3, 7], // E5
  [3, 8], // F5
  [3, 10], // G5
  [3, 12], // A5
  [3, 14], // B5
  [3, 15], // C6
];

const twoOctaveRun: Riff = {
  id: 'uke-two-octave-run',
  instrument: 'ukulele',
  title: 'Two-octave C major run',
  style: 'Scale',
  level: 5,
  bpm: 84,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['scale', 'C major', 'two-octaves', 'sixteenths', 'up-the-neck', 'speed'],
  events: (() => {
    const climb = [...TWO_OCTAVES, ...[...TWO_OCTAVES].reverse().slice(1)];
    return climb.map(([stringIndex, fret], i) => {
      const last = i === climb.length - 1;
      return note(stringIndex, fret, i * 0.25, last ? 1 : 0.25);
    });
  })(),
};

const sweepArpeggio: Riff = {
  id: 'uke-sweep-arpeggio',
  instrument: 'ukulele',
  title: 'Sweep arpeggio',
  style: 'Arpeggio',
  level: 5,
  bpm: 96,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['arpeggio', 'sweep', 'sixteenths', 'Am', 'F', 'C', 'G7', 'speed'],
  events: [AM, F, C, G7].flatMap((chord, bar) =>
    [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3].map((stringIndex, i) =>
      note(stringIndex, fretOn(chord, stringIndex), bar * 4 + i * 0.25, 0.25),
    ),
  ),
};

/** A4 C5 D5 E5 G5 A5 on the G and A strings in turn: G string 2, A string 3, G 7, A 7, G 12, A 12. */
const BELL_UP_AM: readonly (readonly [string: number, fret: number])[] = [[0, 2], [3, 3], [0, 7], [3, 7], [0, 12], [3, 12]];

/** A minor pentatonic as a bell line: up the G and A strings in turn, and back down, every note ringing into the next. */
const bellCascadeAm: Riff = {
  id: 'uke-bell-cascade-am',
  instrument: 'ukulele',
  title: 'Bell cascade in A minor',
  style: 'Campanella',
  level: 5,
  bpm: 72,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['campanella', 're-entrant', 'pentatonic', 'A minor', 'ringing-notes', 'up-the-neck'],
  events: ringLine(
    [
      ...bellRun(BELL_UP_AM, 0),
      ...bellRun([...BELL_UP_AM].reverse(), 4),
      ...bellRun(BELL_UP_AM, 8),
      ...bellRun([...BELL_UP_AM].reverse(), 12),
    ],
    2,
    16,
  ),
};

/** The ukulele's own feed riffs, easiest first. */
export const UKULELE_RIFFS: readonly Riff[] = [
  openStringRoll,
  cPickBasic,
  fretWalk,
  sunriseTune,
  cMajorScale,
  cPentatonicRun,
  islandStrum,
  lullabyWaltz,
  amFPick,
  firstHammers,
  openWalkC,
  offBeatChop,
  fallingBells,
  folkAlternatingBass,
  gMajorRun,
  chordMelodyC,
  pinchPickAm,
  islandPickStrum,
  bellScaleG,
  amPentatonicLick,
  boogieC,
  trillAndTurn,
  travisPickCG7,
  twoOctaveRun,
  sweepArpeggio,
  bellCascadeAm,
];
