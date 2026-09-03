import type { Riff, TabEvent } from './types';

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
];

export function getRiff(id: string): Riff | undefined {
  return RIFFS.find((riff) => riff.id === id);
}
