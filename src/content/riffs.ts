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

export const RIFFS: readonly Riff[] = [chromaticWarmup, emPentatonicBox1, powerChordDrive];

export function getRiff(id: string): Riff | undefined {
  return RIFFS.find((riff) => riff.id === id);
}
