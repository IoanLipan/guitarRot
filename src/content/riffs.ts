import { instrumentIdOf, type InstrumentId } from '@/music';
import type { Riff, TabEvent, Technique } from './types';
import { UKULELE_RIFFS } from './ukuleleRiffs';

/** Ascending run of four consecutive frets on one string, in eighth notes. */
function chromaticRun(stringIndex: number, startBeat: number): TabEvent[] {
  return [1, 2, 3, 4].map((fret, i) => ({
    stringIndex,
    fret,
    beat: startBeat + i * 0.5,
    duration: 0.5,
  }));
}

/** Two notes a fifth apart, struck together as a power chord. */
function powerChord(
  stringIndex: number,
  rootFret: number,
  beat: number,
  duration: number,
): TabEvent[] {
  return [
    { stringIndex, fret: rootFret, beat, duration, technique: 'palmMute' },
    { stringIndex: stringIndex + 1, fret: rootFret + 2, beat, duration, technique: 'palmMute' },
  ];
}

const chromaticWarmup: Riff = {
  id: 'chromatic-warmup',
  title: 'Chromatic warm-up',
  style: 'Warm-up',
  level: 1,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['warm-up', 'first-position', 'one-finger-per-fret'],
  events: [
    ...chromaticRun(0, 0),
    ...chromaticRun(1, 2),
    ...chromaticRun(2, 4),
    ...chromaticRun(3, 6),
  ],
};

const emPentatonicBox1: Riff = {
  id: 'em-pentatonic-box1',
  title: 'E minor pentatonic, box one',
  style: 'Scale',
  level: 2,
  bpm: 90,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['pentatonic', 'E minor', 'open-position'],
  events: [
    { stringIndex: 0, fret: 0, beat: 0, duration: 0.5 },
    { stringIndex: 0, fret: 3, beat: 0.5, duration: 0.5 },
    { stringIndex: 1, fret: 0, beat: 1, duration: 0.5 },
    { stringIndex: 1, fret: 2, beat: 1.5, duration: 0.5 },
    { stringIndex: 2, fret: 0, beat: 2, duration: 0.5 },
    { stringIndex: 2, fret: 2, beat: 2.5, duration: 0.5 },
    { stringIndex: 3, fret: 0, beat: 3, duration: 0.5 },
    { stringIndex: 3, fret: 2, beat: 3.5, duration: 0.5 },
    { stringIndex: 4, fret: 0, beat: 4, duration: 0.5 },
    { stringIndex: 4, fret: 3, beat: 4.5, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 5, duration: 0.5 },
    // The final note is held for the rest of the bar so the loop breathes.
    { stringIndex: 5, fret: 3, beat: 5.5, duration: 2.5 },
  ],
};

const powerChordDrive: Riff = {
  id: 'power-chord-drive',
  title: 'Power chord drive',
  style: 'Rock',
  level: 2,
  bpm: 120,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['power-chords', 'palm-muting', 'downstrokes'],
  events: [
    // Bar 1: E5 on the low E and A strings.
    ...[0, 1, 2, 3].flatMap((beat) => powerChord(0, 0, beat, 1)),
    // Bar 2: G5.
    ...[4, 5, 6, 7].flatMap((beat) => powerChord(0, 3, beat, 1)),
    // Bar 3: A5.
    ...[8, 9, 10, 11].flatMap((beat) => powerChord(0, 5, beat, 1)),
    // Bar 4: back to E5.
    ...[12, 13, 14, 15].flatMap((beat) => powerChord(0, 0, beat, 1)),
  ],
};

/**
 * Boogie oscillation: a root drone with a partner note stepping between the
 * fifth and the sixth on the string above it, two to a beat.
 */
function boogieBar(
  rootString: number,
  rootFret: number,
  startBeat: number,
  fifthFret: number,
  sixthFret: number,
): TabEvent[] {
  return [0, 1, 2, 3].flatMap((offset) => {
    const beat = startBeat + offset;
    return [
      { stringIndex: rootString, fret: rootFret, beat, duration: 0.5 },
      { stringIndex: rootString + 1, fret: fifthFret, beat, duration: 0.5 },
      { stringIndex: rootString, fret: rootFret, beat: beat + 0.5, duration: 0.5 },
      { stringIndex: rootString + 1, fret: sixthFret, beat: beat + 0.5, duration: 0.5 },
    ];
  });
}

const bluesShuffleE: Riff = {
  id: 'blues-shuffle-e',
  title: 'Blues shuffle in E',
  style: 'Blues',
  level: 2,
  bpm: 100,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['blues', 'shuffle', 'E', 'open-position'],
  events: [
    // Two bars on E, one on A, back to E — the shape of a twelve-bar, folded
    // into four so the loop stays short enough to play along with.
    ...boogieBar(0, 0, 0, 2, 4),
    ...boogieBar(0, 0, 4, 2, 4),
    ...boogieBar(1, 0, 8, 2, 4),
    ...boogieBar(0, 0, 12, 2, 4),
  ],
};

const emPentatonicLick: Riff = {
  id: 'em-pentatonic-lick',
  title: 'E minor pentatonic lick',
  style: 'Solo',
  level: 3,
  bpm: 96,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['solo', 'pentatonic', 'E minor', 'twelfth-position', 'bends'],
  events: [
    { stringIndex: 5, fret: 15, beat: 0, duration: 0.5 },
    { stringIndex: 5, fret: 12, beat: 0.5, duration: 0.5, technique: 'pull' },
    { stringIndex: 4, fret: 15, beat: 1, duration: 0.5 },
    { stringIndex: 4, fret: 12, beat: 1.5, duration: 0.5, technique: 'pull' },
    { stringIndex: 3, fret: 14, beat: 2, duration: 0.5 },
    { stringIndex: 3, fret: 12, beat: 2.5, duration: 0.5, technique: 'pull' },
    { stringIndex: 4, fret: 12, beat: 3, duration: 0.5 },
    { stringIndex: 4, fret: 15, beat: 3.5, duration: 0.5, technique: 'hammer' },
    { stringIndex: 5, fret: 12, beat: 4, duration: 0.5 },
    { stringIndex: 5, fret: 15, beat: 4.5, duration: 1, technique: 'bend' },
    { stringIndex: 4, fret: 15, beat: 5.5, duration: 0.5 },
    { stringIndex: 5, fret: 12, beat: 6, duration: 2 },
  ],
};

const countryOpenCascade: Riff = {
  id: 'country-open-cascade',
  title: 'Country open-string cascade',
  style: 'Country',
  level: 3,
  bpm: 110,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['country', 'open-strings', 'G major pentatonic', 'cascade'],
  events: [
    // Every open string belongs to G major pentatonic, which is exactly why
    // this cascade works: fretted note, open string, down the neck.
    { stringIndex: 5, fret: 7, beat: 0, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 0.5, duration: 0.5 },
    { stringIndex: 4, fret: 8, beat: 1, duration: 0.5 },
    { stringIndex: 4, fret: 0, beat: 1.5, duration: 0.5 },
    { stringIndex: 3, fret: 9, beat: 2, duration: 0.5 },
    { stringIndex: 3, fret: 0, beat: 2.5, duration: 0.5 },
    { stringIndex: 2, fret: 9, beat: 3, duration: 0.5 },
    { stringIndex: 2, fret: 0, beat: 3.5, duration: 0.5 },
    { stringIndex: 1, fret: 10, beat: 4, duration: 0.5 },
    { stringIndex: 1, fret: 0, beat: 4.5, duration: 0.5 },
    { stringIndex: 0, fret: 7, beat: 5, duration: 0.5 },
    { stringIndex: 0, fret: 0, beat: 5.5, duration: 0.5 },
    { stringIndex: 2, fret: 5, beat: 6, duration: 2 },
  ],
};

const rockPowerRun: Riff = {
  id: 'rock-power-run',
  title: 'Rock run in A minor',
  style: 'Solo',
  level: 4,
  bpm: 132,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['solo', 'rock', 'A minor pentatonic', 'sixteenths', 'fifth-position'],
  events: [
    { stringIndex: 2, fret: 5, beat: 0, duration: 0.25 },
    { stringIndex: 2, fret: 7, beat: 0.25, duration: 0.25 },
    { stringIndex: 3, fret: 5, beat: 0.5, duration: 0.25 },
    { stringIndex: 3, fret: 7, beat: 0.75, duration: 0.25 },
    { stringIndex: 4, fret: 5, beat: 1, duration: 0.25 },
    { stringIndex: 4, fret: 8, beat: 1.25, duration: 0.25 },
    { stringIndex: 5, fret: 5, beat: 1.5, duration: 0.25 },
    { stringIndex: 5, fret: 8, beat: 1.75, duration: 0.25 },
    { stringIndex: 5, fret: 5, beat: 2, duration: 0.5, technique: 'slide' },
    { stringIndex: 4, fret: 8, beat: 2.5, duration: 0.5 },
    { stringIndex: 4, fret: 5, beat: 3, duration: 0.5, technique: 'pull' },
    { stringIndex: 3, fret: 7, beat: 3.5, duration: 0.5 },
    { stringIndex: 3, fret: 5, beat: 4, duration: 0.5, technique: 'pull' },
    { stringIndex: 2, fret: 7, beat: 4.5, duration: 0.5 },
    { stringIndex: 2, fret: 5, beat: 5, duration: 1 },
    { stringIndex: 5, fret: 8, beat: 6, duration: 2, technique: 'bend' },
  ],
};

const bluesTurnaroundA: Riff = {
  id: 'blues-turnaround-a',
  title: 'Blues turnaround in A',
  style: 'Blues',
  level: 3,
  bpm: 84,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['blues', 'turnaround', 'A', 'chromatic'],
  events: [
    // A line walking down chromatically against a ringing open E above it.
    { stringIndex: 3, fret: 5, beat: 0, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 0.5, duration: 0.5 },
    { stringIndex: 3, fret: 4, beat: 1, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 1.5, duration: 0.5 },
    { stringIndex: 3, fret: 3, beat: 2, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 2.5, duration: 0.5 },
    { stringIndex: 3, fret: 2, beat: 3, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 3.5, duration: 0.5 },
    { stringIndex: 2, fret: 2, beat: 4, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 4.5, duration: 0.5 },
    { stringIndex: 1, fret: 0, beat: 5, duration: 1 },
    { stringIndex: 0, fret: 5, beat: 6, duration: 2 },
  ],
};

const folkAlternatingBass: Riff = {
  id: 'folk-alternating-bass',
  title: 'Alternating-bass picking',
  style: 'Fingerstyle',
  level: 3,
  bpm: 92,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['fingerstyle', 'alternating-bass', 'C major', 'independence'],
  events: [
    // Thumb keeps the bass on the beat, fingers answer on the offbeat: the
    // hand-independence drill every fingerpicker starts with.
    ...[0, 2, 4, 6].map((beat) => ({ stringIndex: 1, fret: 3, beat, duration: 0.5 })),
    ...[1, 3, 5].map((beat) => ({ stringIndex: 2, fret: 2, beat, duration: 0.5 })),
    { stringIndex: 2, fret: 2, beat: 7, duration: 1 },
    ...[0.5, 2.5, 4.5, 6.5].map((beat) => ({ stringIndex: 4, fret: 1, beat, duration: 0.5 })),
    ...[1.5, 3.5, 5.5, 7.5].map((beat) => ({ stringIndex: 5, fret: 0, beat, duration: 0.5 })),
  ],
};

const emPentatonicBox2: Riff = {
  id: 'em-pentatonic-box2',
  title: 'E minor pentatonic, box two',
  style: 'Scale',
  level: 3,
  bpm: 96,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['pentatonic', 'E minor', 'box-two', 'solo'],
  events: [
    // Same shape as box one, three frets up the neck: the same five notes
    // live in a different spot, which is the whole point of learning more
    // than one box.
    { stringIndex: 0, fret: 3, beat: 0, duration: 0.5 },
    { stringIndex: 0, fret: 5, beat: 0.5, duration: 0.5 },
    { stringIndex: 1, fret: 5, beat: 1, duration: 0.5 },
    { stringIndex: 2, fret: 5, beat: 1.5, duration: 0.5 },
    { stringIndex: 3, fret: 4, beat: 2, duration: 0.5 },
    { stringIndex: 4, fret: 3, beat: 2.5, duration: 0.5 },
    { stringIndex: 4, fret: 5, beat: 3, duration: 0.5 },
    { stringIndex: 5, fret: 3, beat: 3.5, duration: 0.5 },
    // The climb ends on the box's top note, held through the rest of the phrase.
    { stringIndex: 5, fret: 5, beat: 4, duration: 4 },
  ],
};

const emPentatonicBox3: Riff = {
  id: 'em-pentatonic-box3',
  title: 'E minor pentatonic, box three',
  style: 'Scale',
  level: 3,
  bpm: 100,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['pentatonic', 'E minor', 'box-three', 'solo'],
  events: [
    // Up the box, then straight back down it — the shape most solos actually
    // use: arrive somewhere, then leave the way you came.
    { stringIndex: 0, fret: 7, beat: 0, duration: 0.5 },
    { stringIndex: 1, fret: 7, beat: 0.5, duration: 0.5 },
    { stringIndex: 2, fret: 7, beat: 1, duration: 0.5 },
    { stringIndex: 2, fret: 9, beat: 1.5, duration: 0.5 },
    { stringIndex: 3, fret: 7, beat: 2, duration: 0.5 },
    { stringIndex: 3, fret: 9, beat: 2.5, duration: 0.5 },
    { stringIndex: 4, fret: 8, beat: 3, duration: 0.5 },
    { stringIndex: 5, fret: 7, beat: 3.5, duration: 0.5 },
    { stringIndex: 4, fret: 8, beat: 4, duration: 0.5 },
    { stringIndex: 3, fret: 9, beat: 4.5, duration: 0.5 },
    { stringIndex: 3, fret: 7, beat: 5, duration: 0.5 },
    { stringIndex: 2, fret: 9, beat: 5.5, duration: 0.5 },
    { stringIndex: 2, fret: 7, beat: 6, duration: 0.5 },
    { stringIndex: 1, fret: 7, beat: 6.5, duration: 0.5 },
    { stringIndex: 0, fret: 7, beat: 7, duration: 1 },
  ],
};

const emPentatonicHighClimb: Riff = {
  id: 'em-pentatonic-high-climb',
  title: 'High-neck climb',
  style: 'Lead',
  level: 5,
  bpm: 84,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['pentatonic', 'E minor', 'high-position', 'bend', 'solo'],
  events: [
    // One box, near the top of the neck, all six strings, no repeats: the
    // longest single run in the library, ending on a bend instead of a pluck.
    { stringIndex: 0, fret: 10, beat: 0, duration: 0.5 },
    { stringIndex: 0, fret: 12, beat: 0.5, duration: 0.5 },
    { stringIndex: 1, fret: 10, beat: 1, duration: 0.5 },
    { stringIndex: 1, fret: 12, beat: 1.5, duration: 0.5 },
    { stringIndex: 2, fret: 9, beat: 2, duration: 0.5 },
    { stringIndex: 2, fret: 12, beat: 2.5, duration: 0.5 },
    { stringIndex: 3, fret: 9, beat: 3, duration: 0.5 },
    { stringIndex: 3, fret: 12, beat: 3.5, duration: 0.5 },
    { stringIndex: 4, fret: 10, beat: 4, duration: 0.5 },
    { stringIndex: 4, fret: 12, beat: 4.5, duration: 0.5 },
    { stringIndex: 5, fret: 10, beat: 5, duration: 0.5 },
    { stringIndex: 5, fret: 12, beat: 5.5, duration: 2.5, technique: 'bend' },
  ],
};

const gMajorScaleRun: Riff = {
  id: 'g-major-scale-run',
  title: 'G major scale, up and down',
  style: 'Scale',
  level: 2,
  bpm: 88,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['major', 'G major', 'open-position', 'scale'],
  events: [
    // Every riff up to here is minor or blues; this is the odd one out on
    // purpose. A major scale is a different mood, not just different notes.
    { stringIndex: 3, fret: 0, beat: 0, duration: 0.5 },
    { stringIndex: 3, fret: 2, beat: 0.5, duration: 0.5 },
    { stringIndex: 4, fret: 0, beat: 1, duration: 0.5 },
    { stringIndex: 4, fret: 1, beat: 1.5, duration: 0.5 },
    { stringIndex: 4, fret: 3, beat: 2, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 2.5, duration: 0.5 },
    { stringIndex: 5, fret: 2, beat: 3, duration: 0.5 },
    { stringIndex: 5, fret: 3, beat: 3.5, duration: 0.5 },
    // Straight back down.
    { stringIndex: 5, fret: 2, beat: 4, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 4.5, duration: 0.5 },
    { stringIndex: 4, fret: 3, beat: 5, duration: 0.5 },
    { stringIndex: 4, fret: 1, beat: 5.5, duration: 0.5 },
    { stringIndex: 4, fret: 0, beat: 6, duration: 0.5 },
    { stringIndex: 3, fret: 2, beat: 6.5, duration: 0.5 },
    { stringIndex: 3, fret: 0, beat: 7, duration: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Eight more styles. Each one is an original line in the idiom named, and each
// drills one thing the earlier riffs don't: an off-beat hand, tremolo, a
// thumb that keeps time, rolling arpeggios, a blue note, hybrid picking, a
// chugged rhythm, a sixteenth-note groove.
// ---------------------------------------------------------------------------

/** A fretted note, written as plain arguments so a long line stays readable. */
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

/** A string and fret, for lines built from a list of positions. */
type Spot = readonly [stringIndex: number, fret: number];

/** The top three strings of a chord, as frets for G, B and e. */
type Top = readonly [number, number, number];

/** A three-note chop on the top three strings, struck together and cut short. */
function skank(beat: number, [g, b, e]: Top, duration = 0.25): TabEvent[] {
  return [note(3, g, beat, duration), note(4, b, beat, duration), note(5, e, beat, duration)];
}

/**
 * One bar of reggae guitar: a short low root on the beat (the drop the bass
 * would play), then a chop on the "and" of every count. The beat itself is
 * otherwise empty; that gap is the style.
 */
function reggaeBar(
  startBeat: number,
  [rootString, rootFret]: Spot,
  top: Top,
  lastChop = 0.25,
): TabEvent[] {
  return [
    note(rootString, rootFret, startBeat, 0.5),
    ...[0.5, 1.5, 2.5].flatMap((offset) => skank(startBeat + offset, top)),
    ...skank(startBeat + 3.5, top, lastChop),
  ];
}

// The top three strings of each chord.
const AM_TOP: Top = [2, 1, 0];
const DM_TOP: Top = [2, 3, 1];
const E_TOP: Top = [1, 0, 0];

const reggaeOffbeatSkank: Riff = {
  id: 'reggae-offbeat-skank',
  title: 'Off-beat skank',
  style: 'Reggae',
  level: 2,
  bpm: 76,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['reggae', 'skank', 'off-beat', 'upstrokes', 'triads', 'A minor'],
  events: [
    // Am, Am, Dm, E: the chops sit on the top three strings of each open
    // chord, so the left hand barely moves and the right hand does the work.
    ...reggaeBar(0, [1, 0], AM_TOP),
    ...reggaeBar(4, [1, 0], AM_TOP),
    ...reggaeBar(8, [2, 0], DM_TOP),
    // The last chop is left to ring so the loop closes without a hole.
    ...reggaeBar(12, [0, 0], E_TOP, 0.5),
  ],
};

/** Rapid repeated picking on one note, in sixteenths: the surf-guitar shimmer. */
function tremolo(
  stringIndex: number,
  fret: number,
  startBeat: number,
  beats: number,
  technique?: Technique,
): TabEvent[] {
  return Array.from({ length: beats * 4 }, (_, i) =>
    i === 0
      ? note(stringIndex, fret, startBeat, 0.25, technique)
      : note(stringIndex, fret, startBeat + i * 0.25, 0.25),
  );
}

const surfTremolo: Riff = {
  id: 'surf-tremolo',
  title: 'Surf tremolo',
  style: 'Surf',
  level: 3,
  bpm: 112,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['surf', 'tremolo', 'picking-hand', 'E minor', 'single-string'],
  events: [
    // A melody that never leaves the high E string: every note is picked as
    // fast as you can keep it even, and the melody is carried by which fret
    // the shimmer sits on.
    // Bar 1: up the E minor pentatonic.
    ...tremolo(5, 0, 0, 2),
    ...tremolo(5, 3, 2, 1),
    ...tremolo(5, 5, 3, 1),
    // Bar 2: slide into the top note, then step back down.
    ...tremolo(5, 7, 4, 2, 'slide'),
    ...tremolo(5, 5, 6, 1),
    ...tremolo(5, 3, 7, 1),
    // Bar 3: a lower turn, ending on F-sharp.
    ...tremolo(5, 5, 8, 2),
    ...tremolo(5, 3, 10, 1),
    ...tremolo(5, 2, 11, 1),
    // Bar 4: home to E.
    ...tremolo(5, 3, 12, 1),
    ...tremolo(5, 2, 13, 1),
    ...tremolo(5, 0, 14, 2),
  ],
};

/**
 * One bar of Travis picking. The thumb plays a bass note on every beat and
 * the fingers answer between them, so two different rhythms run at once.
 */
function travisBar(
  startBeat: number,
  bass: readonly [Spot, Spot, Spot, Spot],
  treble: readonly [Spot, Spot, Spot, Spot],
): TabEvent[] {
  return [
    ...bass.map(([stringIndex, fret], i) => note(stringIndex, fret, startBeat + i, 1)),
    ...treble.map(([stringIndex, fret], i) => note(stringIndex, fret, startBeat + i + 0.5, 0.5)),
  ];
}

const travisPickingC: Riff = {
  id: 'travis-picking-c',
  title: 'Travis picking in C',
  style: 'Fingerstyle',
  level: 3,
  bpm: 84,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['fingerstyle', 'travis-picking', 'alternating-bass', 'C major', 'independence'],
  events: [
    // C: bass alternates root and fifth (C3, G2) under the open top strings.
    ...travisBar(0, [[1, 3], [0, 3], [1, 3], [0, 3]], [[4, 1], [5, 0], [3, 0], [5, 0]]),
    // G: root and fifth again (G2, D3).
    ...travisBar(4, [[0, 3], [2, 0], [0, 3], [2, 0]], [[4, 0], [5, 3], [3, 0], [5, 3]]),
    // Am: A2 and E3.
    ...travisBar(8, [[1, 0], [2, 2], [1, 0], [2, 2]], [[4, 1], [5, 0], [3, 2], [5, 0]]),
    // G again, but the last bass note steps up to B so the thumb walks into C.
    ...travisBar(12, [[0, 3], [2, 0], [0, 3], [1, 2]], [[4, 0], [5, 3], [3, 0], [4, 3]]),
  ],
};

/**
 * One bar of rolling arpeggio: eight eighth notes, each left to ring for up
 * to two beats (but never past the bar), the way a fingerpicked chord is.
 */
function arpeggioBar(
  startBeat: number,
  spots: readonly [Spot, Spot, Spot, Spot, Spot, Spot, Spot, Spot],
): TabEvent[] {
  return spots.map(([stringIndex, fret], i) => {
    const beat = startBeat + i * 0.5;
    return note(stringIndex, fret, beat, Math.min(2, startBeat + 4 - beat));
  });
}

const arpeggioAmGFE: Riff = {
  id: 'arpeggio-am-g-f-e',
  title: 'Arpeggios: Am, G, F, E',
  style: 'Arpeggio',
  level: 2,
  bpm: 72,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['arpeggio', 'fingerstyle', 'A minor', 'chord-tones', 'open-position'],
  events: [
    // Each bar rolls up through the chord and back down again.
    // Am (x02210).
    ...arpeggioBar(0, [[1, 0], [2, 2], [3, 2], [4, 1], [5, 0], [4, 1], [3, 2], [2, 2]]),
    // G (320003).
    ...arpeggioBar(4, [[0, 3], [2, 0], [3, 0], [4, 0], [5, 3], [4, 0], [3, 0], [2, 0]]),
    // F, as the four-string Fmaj7 shape (xx3210): no barre needed.
    ...arpeggioBar(8, [[2, 3], [3, 2], [4, 1], [5, 0], [4, 1], [3, 2], [2, 3], [3, 2]]),
    // E (022100), the leading-tone chord that pulls back to Am.
    ...arpeggioBar(12, [[0, 0], [2, 2], [3, 1], [4, 0], [5, 0], [4, 0], [3, 1], [2, 2]]),
  ],
};

const minorBluesLickA: Riff = {
  id: 'minor-blues-lick-a',
  title: 'Minor blues lick in A',
  style: 'Blues',
  level: 3,
  bpm: 88,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['blues', 'A minor', 'blue-note', 'fifth-position', 'hammer-ons', 'pull-offs', 'bend'],
  events: [
    // Bar 1: down the A minor blues scale. The flat fifth (E-flat, fret 6 of
    // the A string) is the blue note: passed through, never rested on.
    note(2, 7, 0, 0.5),
    note(2, 5, 0.5, 0.5, 'pull'),
    note(1, 7, 1, 0.5),
    note(1, 6, 1.5, 0.5, 'pull'),
    note(1, 5, 2, 0.5, 'pull'),
    note(0, 8, 2.5, 0.5),
    note(0, 5, 3, 1, 'pull'),
    // Bar 2: back up through the blue note, then a bend to finish on the fifth.
    note(0, 5, 4, 0.5),
    note(0, 8, 4.5, 0.5, 'hammer'),
    note(1, 5, 5, 0.5),
    note(1, 6, 5.5, 0.5, 'hammer'),
    note(1, 7, 6, 0.5, 'hammer'),
    note(2, 7, 6.5, 0.5),
    // D bent up a whole step lands on E, the fifth of A.
    note(3, 7, 7, 1, 'bend'),
  ],
};

/**
 * One bar of hybrid picking. The pick plays the bass on every beat; the
 * middle and ring fingers pluck a pair of upper strings together on the
 * off-beat. `pairs` limits how many of the four off-beats get plucked, so a
 * bar can end on a fill instead.
 */
function hybridBar(
  startBeat: number,
  bass: readonly [Spot, Spot, Spot, Spot],
  pair: readonly [Spot, Spot],
  pairs = 4,
): TabEvent[] {
  return [
    ...bass.map(([stringIndex, fret], i) => note(stringIndex, fret, startBeat + i, 1)),
    ...Array.from({ length: pairs }, (_, i) =>
      pair.map(([stringIndex, fret]) => note(stringIndex, fret, startBeat + i + 0.5, 0.5)),
    ).flat(),
  ];
}

const countryHybridG: Riff = {
  id: 'country-hybrid-g',
  title: 'Hybrid-picked country in G',
  style: 'Country',
  level: 4,
  bpm: 104,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['country', 'hybrid-picking', 'double-stops', 'G major', 'pick-and-fingers'],
  events: [
    // G: pick the root and fifth in the bass, pluck B and G above.
    ...hybridBar(0, [[0, 3], [2, 0], [0, 3], [2, 0]], [[4, 0], [5, 3]]),
    // C: C3 and G2 in the bass, a C and an E above.
    ...hybridBar(4, [[1, 3], [0, 3], [1, 3], [0, 3]], [[4, 1], [5, 0]]),
    // G again, but the last off-beat becomes a quick hammer-on, B up to D.
    ...hybridBar(8, [[0, 3], [2, 0], [0, 3], [2, 0]], [[4, 0], [5, 3]], 3),
    note(4, 0, 11.5, 0.25),
    note(4, 3, 11.75, 0.25, 'hammer'),
    // D: D3 and A2 in the bass, a D and an F-sharp above.
    ...hybridBar(12, [[2, 0], [1, 0], [2, 0], [1, 0]], [[4, 3], [5, 2]]),
  ],
};

/** A palm-muted chug on the open low E: short, dead, and always a downstroke. */
function chug(beat: number, fret = 0): TabEvent {
  return note(0, fret, beat, 0.25, 'palmMute');
}

/** A power chord left to ring, root on the low E. */
function ringingPower(rootFret: number, beat: number, duration: number): TabEvent[] {
  return [note(0, rootFret, beat, duration), note(1, rootFret + 2, beat, duration)];
}

const metalChugE: Riff = {
  id: 'metal-chug-e',
  title: 'Chug in E',
  style: 'Metal',
  level: 3,
  bpm: 120,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['metal', 'palm-muting', 'chugs', 'syncopation', 'standard-tuning', 'E'],
  events: [
    // No drop tuning needed: the open low E is the chug, and everything
    // that isn't a chug is silence or a ringing power chord.
    // Bar 1: a syncopated chug, then E5 on the fourth beat.
    ...[0, 0.5, 0.75, 1.5, 2, 2.5, 2.75].map((beat) => chug(beat)),
    ...ringingPower(0, 3, 1),
    // Bar 2: the same chug, answered by G5.
    ...[4, 4.5, 4.75, 5.5, 6, 6.5, 6.75].map((beat) => chug(beat)),
    ...ringingPower(3, 7, 1),
    // Bar 3: the chug leans on F, the flat second, for a darker colour.
    chug(8),
    chug(8.5),
    chug(8.75),
    chug(9.5, 1),
    chug(9.75, 1),
    chug(10),
    chug(10.5),
    chug(10.75),
    ...ringingPower(1, 11, 1),
    // Bar 4: two beats of straight sixteenths, a pick-up, and E5 to close.
    ...[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75].map((offset) => chug(12 + offset)),
    chug(14.5),
    chug(14.75),
    ...ringingPower(0, 15, 1),
  ],
};

const funkLineE: Riff = {
  id: 'funk-line-e',
  title: 'Funk line in E',
  style: 'Funk',
  level: 4,
  bpm: 96,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['funk', 'sixteenths', 'syncopation', 'E minor pentatonic', 'ghost-notes', 'single-note'],
  events: [
    // Bar 1: a short question on the D string, an octave jump, and ghost
    // notes (muted, almost unpitched) filling the gaps so the hand keeps
    // moving on sixteenths.
    note(2, 2, 0, 0.25),
    note(2, 5, 0.5, 0.25),
    note(2, 7, 0.75, 0.25, 'hammer'),
    note(2, 5, 1.25, 0.25, 'pull'),
    note(2, 2, 1.5, 0.5),
    note(3, 9, 2, 0.25),
    note(3, 7, 2.5, 0.25, 'pull'),
    note(3, 4, 2.75, 0.25, 'pull'),
    note(2, 5, 3.25, 0.25, 'palmMute'),
    note(2, 2, 3.5, 0.25),
    note(2, 2, 3.75, 0.25, 'palmMute'),
    // Bar 2: the answer climbs one step higher, falls back, and ends on the root.
    note(2, 2, 4, 0.25),
    note(2, 5, 4.5, 0.25),
    note(2, 7, 4.75, 0.25, 'hammer'),
    note(2, 9, 5, 0.25, 'hammer'),
    note(2, 7, 5.5, 0.25, 'pull'),
    note(2, 5, 5.75, 0.25, 'pull'),
    note(2, 2, 6.25, 0.25),
    note(3, 9, 6.5, 0.25),
    note(3, 7, 6.75, 0.25, 'pull'),
    note(2, 5, 7.25, 0.25, 'slide'),
    note(2, 2, 7.5, 0.5),
  ],
};

export const RIFFS: readonly Riff[] = [
  chromaticWarmup,
  emPentatonicBox1,
  powerChordDrive,
  bluesShuffleE,
  emPentatonicLick,
  countryOpenCascade,
  rockPowerRun,
  bluesTurnaroundA,
  folkAlternatingBass,
  emPentatonicBox2,
  emPentatonicBox3,
  emPentatonicHighClimb,
  gMajorScaleRun,
  reggaeOffbeatSkank,
  surfTremolo,
  travisPickingC,
  arpeggioAmGFE,
  minorBluesLickA,
  countryHybridG,
  metalChugE,
  funkLineE,
];

/** Every feed riff of every instrument. `RIFFS` stays the guitar's own, exactly as it was. */
export const ALL_RIFFS: readonly Riff[] = [...RIFFS, ...UKULELE_RIFFS];

export function getRiff(id: string): Riff | undefined {
  return ALL_RIFFS.find((riff) => riff.id === id);
}

/** The feed's riffs for one instrument: the guitar's tabs, or the ukulele's own (see ukuleleRiffs.ts). */
export function riffsFor(instrument: InstrumentId): readonly Riff[] {
  return ALL_RIFFS.filter((riff) => instrumentIdOf(riff) === instrument);
}
