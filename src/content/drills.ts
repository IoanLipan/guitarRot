import { melodyRiff } from './melody';
import { RIFFS } from './riffs';
import { songToRiff, type Song, type StrumPattern } from './songs';
import type { Riff, TabEvent, Technique } from './types';

/**
 * Practice material for the course. Every drill is written for this app, and
 * none of them is in the Feed: a feed card should be something you'd want to
 * play for its own sake, a drill is something you do because it works.
 */

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

/** A single-note drill written as pitch names; see `melodyEvents`. */
function melodyDrill(spec: {
  id: string;
  title: string;
  level: Riff['level'];
  bpm: number;
  tags: string[];
  notes: string;
  onString?: number;
}): Riff {
  const { onString, ...rest } = spec;
  return melodyRiff({
    ...rest,
    style: 'Drill',
    source: 'original',
    ...(onString === undefined ? {} : { onString }),
  });
}

// ---------------------------------------------------------------------------
// Finding your way around the neck.
// ---------------------------------------------------------------------------

/** Names the six strings: low E up to high e, then back down. */
const openStringsWalk: Riff = {
  id: 'open-strings-walk',
  title: 'Open strings, up and back',
  style: 'Drill',
  level: 1,
  bpm: 70,
  timeSignature: [4, 4],
  bars: 3,
  source: 'original',
  tags: ['open-strings', 'string-names', 'quarter-notes'],
  events: [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0].map((stringIndex, beat) =>
    note(stringIndex, 0, beat, 1),
  ),
};

/** The three notes of the high E string a beginner meets first. */
const miFaSol = melodyDrill({
  id: 'mi-fa-sol',
  title: 'Mi Fa Sol on the high E',
  level: 1,
  bpm: 70,
  tags: ['single-notes', 'first-position', 'high-E-string', 'solfege'],
  notes: 'E4:1 F4:1 G4:1 F4:1 | E4:1 F4:1 G4:2 | G4:1 F4:1 E4:1 F4:1 | E4:4',
});

/** The natural notes up the low E string, with the landmark frets in the middle. */
const lowELandmarks = melodyDrill({
  id: 'low-e-landmarks',
  title: 'Low E string landmarks',
  level: 1,
  bpm: 70,
  tags: ['single-notes', 'low-E-string', 'fret-landmarks', 'natural-notes'],
  notes: 'E2:1 G2:1 A2:1 B2:1 | C3:1 D3:1 E3:2 | E3:1 D3:1 C3:1 B2:1 | A2:1 G2:1 E2:2',
  onString: 0,
});

/** The same walk on the A string, where the landmarks sit two frets further on. */
const aStringLandmarks = melodyDrill({
  id: 'a-string-landmarks',
  title: 'A string landmarks',
  level: 1,
  bpm: 70,
  tags: ['single-notes', 'A-string', 'fret-landmarks', 'natural-notes'],
  notes: 'A2:1 B2:1 C3:1 D3:1 | E3:1 F3:1 G3:1 A3:1 | A3:1 G3:1 F3:1 E3:1 | D3:1 C3:1 B2:1 A2:1',
  onString: 1,
});

/**
 * Every note here has a partner exactly one octave away: two strings over and
 * two frets up. Written as explicit frets because the shape is the lesson.
 */
const octaveHop: Riff = {
  id: 'octave-hop',
  title: 'Octave hop',
  style: 'Drill',
  level: 2,
  bpm: 70,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['octaves', 'shapes', 'fretboard-map'],
  events: [
    // G, then the G above it.
    note(0, 3, 0, 2),
    note(2, 5, 2, 2),
    // C and its octave.
    note(1, 3, 4, 2),
    note(3, 5, 6, 2),
    // A and its octave.
    note(0, 5, 8, 2),
    note(2, 7, 10, 2),
    // D and its octave.
    note(1, 5, 12, 2),
    note(3, 7, 14, 2),
  ],
};

const cMajorScale = melodyDrill({
  id: 'c-major-scale',
  title: 'C major scale, Do to Do',
  level: 2,
  bpm: 80,
  tags: ['scale', 'C major', 'first-position', 'solfege'],
  notes: 'C3:1 D3:1 E3:1 F3:1 | G3:1 A3:1 B3:1 C4:1 | C4:1 B3:1 A3:1 G3:1 | F3:1 E3:1 D3:1 C3:1',
});

// ---------------------------------------------------------------------------
// Rhythm and technique.
// ---------------------------------------------------------------------------

/** One open string, then the beat cut in half, again, and again. */
const rhythmLadder = melodyDrill({
  id: 'rhythm-ladder',
  title: 'Rhythm ladder',
  level: 1,
  bpm: 70,
  tags: ['rhythm', 'subdivision', 'picking-hand', 'open-G'],
  notes: `G3:4 | G3:2 G3:2 | G3:1 G3:1 G3:1 G3:1 | ${'G3:0.5 '.repeat(8)}`,
});

/**
 * Hammer-ons and pull-offs on the G and B strings. A hammer-on lands a
 * finger on a higher fret without picking again; a pull-off flicks the
 * finger away so a lower note (here the open string) sounds. The first note
 * of every pair is the only one the pick touches.
 */
const legatoDrill: Riff = {
  id: 'legato-drill',
  title: 'Hammer-ons and pull-offs',
  style: 'Drill',
  level: 2,
  bpm: 70,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['hammer-on', 'pull-off', 'legato', 'G-string', 'B-string'],
  events: [
    // Bar 1: pick the open G, hammer on to the second fret, then the third.
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
    // Bar 3: a trill on the B string. One pick, then the finger does the rest.
    note(4, 0, 8, 0.5),
    note(4, 1, 8.5, 0.5, 'hammer'),
    note(4, 0, 9, 0.5, 'pull'),
    note(4, 1, 9.5, 0.5, 'hammer'),
    note(4, 0, 10, 0.5, 'pull'),
    note(4, 1, 10.5, 0.5, 'hammer'),
    note(4, 0, 11, 0.5, 'pull'),
    note(4, 1, 11.5, 0.5, 'hammer'),
    // Bar 4: both together on the G string, ending on the open note.
    note(3, 0, 12, 0.5),
    note(3, 2, 12.5, 0.5, 'hammer'),
    note(3, 0, 13, 0.5, 'pull'),
    note(3, 3, 13.5, 0.5, 'hammer'),
    note(3, 0, 14, 0.5, 'pull'),
    note(3, 2, 14.5, 0.5, 'hammer'),
    note(3, 0, 15, 1, 'pull'),
  ],
};

/**
 * Slides and bends, every note drawn from E minor pentatonic so the whole
 * drill sounds right over an Em chord. A slide event lands on its fret from
 * two frets below, so each one follows a note exactly two frets lower. A
 * bend event sits on the fret you press; the string is pushed up a whole
 * step from there, so each bend is preceded by its target, the note two
 * frets higher, to match by ear.
 */
const slideAndBend: Riff = {
  id: 'slide-and-bend',
  title: 'Slides and bends',
  style: 'Drill',
  level: 3,
  bpm: 60,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['slide', 'bend', 'pentatonic', 'E minor', 'ear-training'],
  events: [
    // Bar 1: slide up two frets on the G string.
    note(3, 7, 0, 2),
    note(3, 9, 2, 2, 'slide'),
    // Bar 2: the same slide on the B string.
    note(4, 3, 4, 2),
    note(4, 5, 6, 2, 'slide'),
    // Bar 3: hear the target on the B string, then bend up to it.
    note(4, 10, 8, 2),
    note(4, 8, 10, 2, 'bend'),
    // Bar 4: the same on the high E string.
    note(5, 12, 12, 2),
    note(5, 10, 14, 2, 'bend'),
  ],
};

// ---------------------------------------------------------------------------
// Chord changes.
//
// Built from a chart through `songToRiff`, so a drill strums exactly the way
// the Songs tab does. The riff id is the drill's own, not the `song-` one.
// ---------------------------------------------------------------------------

function chartDrill(spec: {
  id: string;
  title: string;
  pattern: StrumPattern;
  /** Space-separated chord names, one per bar. */
  bars: string;
  bpm: number;
  level: Riff['level'];
  tags: string[];
}): Riff {
  const bars = spec.bars.split(' ');
  const song: Song = {
    id: spec.id,
    title: spec.title,
    artist: 'guitarRot',
    difficulty: 'easy',
    style: 'Drill',
    key: bars[0] ?? '',
    bpm: spec.bpm,
    source: 'original',
    tags: spec.tags,
    about: spec.title,
    chart: {
      pattern: spec.pattern,
      timeSignature: [4, 4],
      sections: [{ label: 'Drill', bars }],
    },
  };
  return { ...songToRiff(song), id: spec.id, level: spec.level };
}

const emFourDowns = chartDrill({
  id: 'em-four-downs',
  title: 'Em, four downstrokes',
  pattern: 'downs',
  bars: 'Em Em Em Em',
  bpm: 70,
  level: 1,
  tags: ['strumming', 'downstrokes', 'Em', 'one-chord'],
});

const emAmChange = chartDrill({
  id: 'em-am-change',
  title: 'Em to Am',
  pattern: 'downs',
  bars: 'Em Em Am Am Em Em Am Am',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'Em', 'Am'],
});

const dAChange = chartDrill({
  id: 'd-a-change',
  title: 'D to A',
  pattern: 'downs',
  bars: 'D D A A D D A A',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'D', 'A'],
});

const gCChange = chartDrill({
  id: 'g-c-change',
  title: 'G to C',
  pattern: 'downs',
  bars: 'G G C C G G C C',
  bpm: 70,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'G', 'C'],
});

const gCDQuarters = chartDrill({
  id: 'g-c-d-quarters',
  title: 'G, C, D: a change every bar',
  pattern: 'downs',
  bars: 'G C D G',
  bpm: 80,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'G', 'C', 'D', 'three-chord'],
});

const folkPatternGC = chartDrill({
  id: 'folk-pattern-g-c',
  title: 'Folk strum on G, C and D',
  pattern: 'folk',
  bars: 'G G C C D D G G',
  bpm: 80,
  level: 2,
  tags: ['strumming', 'folk-strum', 'G', 'C', 'D', 'three-chord'],
});

export const DRILLS: readonly Riff[] = [
  openStringsWalk,
  miFaSol,
  lowELandmarks,
  aStringLandmarks,
  octaveHop,
  cMajorScale,
  rhythmLadder,
  legatoDrill,
  slideAndBend,
  emFourDowns,
  emAmChange,
  dAChange,
  gCChange,
  gCDQuarters,
  folkPatternGC,
];

const PRACTICE_RIFFS: readonly Riff[] = [...RIFFS, ...DRILLS];

/** Looks a riff up across the Feed's library and the course's drills. */
export function findRiff(id: string): Riff | undefined {
  return PRACTICE_RIFFS.find((riff) => riff.id === id);
}
