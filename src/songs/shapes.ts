import {
  CHORDS,
  beatsPerBar,
  chartBars,
  chordByName,
  songToRiff,
  type Riff,
  type Song,
  type TabEvent,
} from '@/content';
import {
  STANDARD_TUNING,
  chordSolfegeName,
  chordStrings,
  chordVoicing,
  expectedPitchClasses,
  fretToMidi,
  midiToPitchClass,
  type ChordShape,
  type FretPosition,
  type Midi,
  type PitchClass,
} from '@/music';
import { chordShapeToFretboard, type FretMarker } from '@/render';

/**
 * The left-hand shape of each bar of a song, worked out from its tab.
 *
 * A song that is only strummed is already a list of chords; a riff or an
 * arpeggio is a list of single notes, and what the fretting hand is doing is
 * not on the page. This module finds it: the set of fretted positions in a
 * bar (or in half a bar, when the hand moves part-way through), a chord name
 * when the notes spell a chord the app teaches, and a diagram to draw.
 *
 * Everything here is pure, so the rules can be tested without a screen.
 */

/** How well a set of notes matches a chord from the library. */
export type ShapeMatch =
  /** The notes are exactly the chord's tones. */
  | 'exact'
  /** The chord's tones are all there, plus one more note: the tune on top. */
  | 'with-melody'
  /** Nothing in the library fits. */
  | 'none';

export type ShapeName = {
  match: ShapeMatch;
  chord?: ChordShape;
  /** Pitch classes sounding beyond the chord's own tones. Empty unless `match` is 'with-melody'. */
  extras: PitchClass[];
};

export type SongShape = {
  /** Unique within a song: the bar, plus ".1" or ".2" for the halves of a split bar. */
  key: string;
  /** 0-based bar index. */
  bar: number;
  /** Which part of the bar this is (0-based), and how many parts the bar was cut into (1 or 2). */
  part: number;
  parts: number;
  /** Where the shape begins and ends, in quarter notes from the start of the song. */
  startBeat: number;
  endBeat: number;
  /** Every distinct fret position played in the span, ordered by string then fret. */
  positions: FretPosition[];
  name: ShapeName;
  /** "Am", or "shape" when nothing in the library fits. */
  label: string;
  /** The chord in solfège ("La minor"), when it has a name. */
  solfege?: string;
  /** "+ melody" when a named shape carries an extra note. */
  hint?: string;
  /** A chart song's chord for the bar, so its diagram can use the chord's own finger numbers. */
  chart?: ChordShape;
};

/** The widest fret reach (highest minus lowest fretted fret) that one hand position covers. */
export const MAX_SHAPE_SPAN = 4;

const UNNAMED_LABEL = 'shape';
const MELODY_HINT = '+ melody';

// ---------------------------------------------------------------------------
// Positions and pitch classes.
// ---------------------------------------------------------------------------

/** The distinct (string, fret) positions among `events`, ordered by string then fret. */
export function positionsOf(events: readonly TabEvent[]): FretPosition[] {
  const seen = new Set<string>();
  const positions: FretPosition[] = [];
  for (const { stringIndex, fret } of events) {
    const key = `${stringIndex}:${fret}`;
    if (seen.has(key)) continue;
    seen.add(key);
    positions.push({ stringIndex, fret });
  }
  return positions.sort((a, b) => a.stringIndex - b.stringIndex || a.fret - b.fret);
}

function midiOfPosition(position: FretPosition): Midi {
  return fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret);
}

export function pitchClassesOfPositions(positions: readonly FretPosition[]): PitchClass[] {
  return [...new Set(positions.map((p) => midiToPitchClass(midiOfPosition(p))))].sort((a, b) => a - b);
}

/** How far apart the highest and lowest fretted (not open) notes are; 0 for fewer than two. */
export function fretSpan(positions: readonly FretPosition[]): number {
  const fretted = positions.map((p) => p.fret).filter((fret) => fret > 0);
  if (fretted.length < 2) return 0;
  return Math.max(...fretted) - Math.min(...fretted);
}

// ---------------------------------------------------------------------------
// Naming a shape.
// ---------------------------------------------------------------------------

type LibraryChord = { chord: ChordShape; tones: readonly PitchClass[]; index: number };

const LIBRARY: readonly LibraryChord[] = CHORDS.map(
  (chord, index) => ({
    chord,
    // The tones the chord is *supposed* to have; validateChordShape guarantees
    // the library's own voicings sound exactly these.
    tones: expectedPitchClasses(chord.root, chord.quality),
    index,
  }),
);

/** Most extra notes a named shape may carry: one tune note on top of a chord. */
const MAX_EXTRA_NOTES = 1;

/** Fewest tones a chord needs before an extra note can be called "a melody on it". */
const MIN_TONES_FOR_MELODY = 3;

/**
 * Names the chord a set of positions spells.
 *
 * Exact first: a bar whose notes are precisely Am's tones is Am. Failing
 * that, a chord whose tones are all present plus one other note is that chord
 * "with melody" — the picture is still the chord, the extra note is the tune
 * walking over it. When several chords qualify the one built on the lowest
 * note wins (the bass is what an ear hears as the chord), then an exact match
 * over a near one, then the fuller chord, then library order so the answer
 * never depends on iteration luck. So A, C and E with a walking F, over an A
 * bass, is "Am + melody" rather than a bare Fmaj7 with the A in the middle.
 * Power chords are never "with melody": two notes plus one is not a claim
 * worth making.
 */
export function nameShape(positions: readonly FretPosition[]): ShapeName {
  if (positions.length === 0) return { match: 'none', extras: [] };

  const sounding = pitchClassesOfPositions(positions);
  const bass = midiToPitchClass(Math.min(...positions.map(midiOfPosition)));

  type Candidate = { entry: LibraryChord; extras: PitchClass[] };
  const candidates = LIBRARY.flatMap((entry): Candidate[] => {
    if (!entry.tones.every((tone) => sounding.includes(tone))) return [];
    const extras = sounding.filter((pc) => !entry.tones.includes(pc));
    if (extras.length === 0) return [{ entry, extras }];
    const canCarryMelody = entry.tones.length >= MIN_TONES_FOR_MELODY;
    return canCarryMelody && extras.length <= MAX_EXTRA_NOTES ? [{ entry, extras }] : [];
  });

  const score = ({ entry, extras }: Candidate): number =>
    (midiToPitchClass(entry.chord.root) === bass ? 1000 : 0) +
    (extras.length === 0 ? 200 : 0) +
    entry.tones.length * 10 -
    entry.index / 1000;

  const best = [...candidates].sort((a, b) => score(b) - score(a))[0];
  if (best === undefined) return { match: 'none', extras: [] };
  return {
    match: best.extras.length === 0 ? 'exact' : 'with-melody',
    chord: best.entry.chord,
    extras: best.extras,
  };
}

function describe(name: ShapeName): Pick<SongShape, 'label' | 'solfege' | 'hint'> {
  if (name.chord === undefined) return { label: UNNAMED_LABEL };
  return {
    label: name.chord.name,
    solfege: chordSolfegeName(name.chord),
    ...(name.match === 'with-melody' ? { hint: MELODY_HINT } : {}),
  };
}

// ---------------------------------------------------------------------------
// Deriving the shapes of a song.
// ---------------------------------------------------------------------------

function buildShape(opts: {
  bar: number;
  part: number;
  parts: number;
  startBeat: number;
  endBeat: number;
  events: readonly TabEvent[];
}): SongShape {
  const positions = positionsOf(opts.events);
  const name = nameShape(positions);
  return {
    key: opts.parts === 1 ? `${opts.bar}` : `${opts.bar}.${opts.part + 1}`,
    bar: opts.bar,
    part: opts.part,
    parts: opts.parts,
    startBeat: opts.startBeat,
    endBeat: opts.endBeat,
    positions,
    name,
    ...describe(name),
  };
}

const EPSILON = 1e-6;

function startingIn(events: readonly TabEvent[], from: number, to: number): TabEvent[] {
  return events.filter((event) => event.beat >= from - EPSILON && event.beat < to - EPSILON);
}

/**
 * One shape per bar of a riff — or two, when the bar is not one hand position.
 *
 * A bar is split at its middle when its fretted notes reach more than four
 * frets (no single position covers them), or when the whole bar fits no chord
 * but a half does: the hand moved, and showing the two halves says so. A bar
 * with no notes in it has no shape.
 */
export function deriveRiffShapes(riff: Riff): SongShape[] {
  const barLength = beatsPerBar(riff.timeSignature);
  const shapes: SongShape[] = [];

  for (let bar = 0; bar < riff.bars; bar += 1) {
    const start = bar * barLength;
    const end = start + barLength;
    const inBar = startingIn(riff.events, start, end);
    if (inBar.length === 0) continue;

    const whole = buildShape({ bar, part: 0, parts: 1, startBeat: start, endBeat: end, events: inBar });

    const middle = start + barLength / 2;
    const firstHalf = startingIn(inBar, start, middle);
    const secondHalf = startingIn(inBar, middle, end);
    if (firstHalf.length === 0 || secondHalf.length === 0) {
      shapes.push(whole);
      continue;
    }

    const halves = [
      buildShape({ bar, part: 0, parts: 2, startBeat: start, endBeat: middle, events: firstHalf }),
      buildShape({ bar, part: 1, parts: 2, startBeat: middle, endBeat: end, events: secondHalf }),
    ];
    const tooWide = fretSpan(whole.positions) > MAX_SHAPE_SPAN;
    const halvesDiffer =
      halves[0] !== undefined &&
      halves[1] !== undefined &&
      positionsKey(halves[0].positions) !== positionsKey(halves[1].positions);
    const halfIsNamed = halves.some((half) => half.name.match !== 'none');
    const split = tooWide || (whole.name.match === 'none' && halvesDiffer && halfIsNamed);
    shapes.push(...(split ? halves : [whole]));
  }

  return shapes;
}

function positionsKey(positions: readonly FretPosition[]): string {
  return positions.map((p) => `${p.stringIndex}:${p.fret}`).join(',');
}

/** One shape per bar of an arpeggio chart: the chord the chart names, as written. */
export function deriveChartShapes(song: Song): SongShape[] {
  const chart = song.chart;
  if (chart === undefined) return [];
  const barLength = beatsPerBar(chart.timeSignature);

  return chartBars(chart).flatMap((bar) => {
    const chord = chordByName(bar.chordName);
    if (chord === undefined) return [];
    const positions: FretPosition[] = [];
    chord.frets.forEach((fret, stringIndex) => {
      if (fret !== null && fret !== undefined) positions.push({ stringIndex, fret });
    });
    const name: ShapeName = { match: 'exact', chord, extras: [] };
    return [
      {
        key: `${bar.index}`,
        bar: bar.index,
        part: 0,
        parts: 1,
        startBeat: bar.index * barLength,
        endBeat: (bar.index + 1) * barLength,
        positions,
        name,
        ...describe(name),
        chart: chord,
      },
    ];
  });
}

/** Does this song have a left hand worth drawing bar by bar? Plain strumming does not. */
export function hasShapes(song: Song): boolean {
  return song.riff !== undefined || song.chart?.pattern === 'arpeggio';
}

/** The shapes of a song: a chart's own chords, or what the tab's fretting hand does. */
export function songShapes(song: Song): SongShape[] {
  if (song.chart !== undefined) return song.chart.pattern === 'arpeggio' ? deriveChartShapes(song) : [];
  return deriveRiffShapes(songToRiff(song));
}

// ---------------------------------------------------------------------------
// Drawing a shape.
// ---------------------------------------------------------------------------

export type ShapeDiagram = {
  markers: FretMarker[];
  openStrings: number[];
  /** Strings the shape never plays: drawn muted. */
  mutedStrings: number[];
  fretRange: [number, number];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
};

/** Frets drawn below the nut, or from the base fret up. */
const DIAGRAM_CELLS = 4;

/**
 * The picture of a shape: dots for fretted notes, rings for open strings,
 * crosses for strings the shape never touches.
 *
 * A shape that fits in the first four frets is drawn from the nut. Anything
 * higher starts at its lowest fret, so the diagram's fret numbers read as the
 * base fret; a shape wider than four frets keeps all its notes by growing the
 * window rather than dropping one.
 */
export function shapeDiagram(shape: SongShape): ShapeDiagram {
  if (shape.chart !== undefined) return chordShapeToFretboard(shape.chart);

  const fretted = shape.positions.filter((p) => p.fret > 0);
  const highest = fretted.length === 0 ? 0 : Math.max(...fretted.map((p) => p.fret));
  const lowest = fretted.length === 0 ? 0 : Math.min(...fretted.map((p) => p.fret));
  const fretRange: [number, number] =
    highest <= DIAGRAM_CELLS ? [0, DIAGRAM_CELLS] : [lowest, Math.max(lowest + DIAGRAM_CELLS - 1, highest)];

  const played = new Set(shape.positions.map((p) => p.stringIndex));
  const openStrings = [...new Set(shape.positions.filter((p) => p.fret === 0).map((p) => p.stringIndex))];

  return {
    markers: fretted.map((p) => ({ stringIndex: p.stringIndex, fret: p.fret, tone: 'root' as const })),
    openStrings,
    mutedStrings: [0, 1, 2, 3, 4, 5].filter((stringIndex) => !played.has(stringIndex)),
    fretRange,
  };
}

/** The notes to sound when a shape is tapped, low string first, one note per string. */
export function strumVoicing(shape: SongShape): { midis: Midi[]; strings: number[] } {
  if (shape.chart !== undefined) {
    return { midis: chordVoicing(shape.chart, STANDARD_TUNING), strings: chordStrings(shape.chart) };
  }
  const byString = new Map<number, FretPosition>();
  for (const position of shape.positions) {
    const held = byString.get(position.stringIndex);
    // A string can only ring one note; a fretted note is the shape, an open
    // string beside it is just the string it was played on.
    if (held === undefined || (held.fret === 0 && position.fret > 0)) {
      byString.set(position.stringIndex, position);
    }
  }
  const chosen = [...byString.values()].sort((a, b) => a.stringIndex - b.stringIndex);
  return { midis: chosen.map(midiOfPosition), strings: chosen.map((p) => p.stringIndex) };
}

// ---------------------------------------------------------------------------
// Following playback.
// ---------------------------------------------------------------------------

/** The index of the shape playing at `beat`, or -1 when no shape's span holds it. */
export function shapeIndexAtBeat(shapes: readonly SongShape[], beat: number): number {
  let found = -1;
  for (let i = 0; i < shapes.length; i += 1) {
    const shape = shapes[i];
    if (shape === undefined) continue;
    if (beat + EPSILON >= shape.startBeat && beat < shape.endBeat - EPSILON) found = i;
  }
  return found;
}

/** How long a plucked string stays lit, at most, in quarter notes. */
export const PLUCK_LIT_BEATS = 0.5;

/**
 * The positions of the notes being plucked at `beat` within `shape`: a note
 * counts from its first instant for as long as it lasts, up to half a beat,
 * so a long bass note flashes rather than staying lit for four beats.
 */
export function pluckedPositions(
  events: readonly TabEvent[],
  shape: SongShape,
  beat: number,
): FretPosition[] {
  return events
    .filter(
      (event) =>
        event.beat >= shape.startBeat - EPSILON &&
        event.beat < shape.endBeat - EPSILON &&
        beat + EPSILON >= event.beat &&
        beat < event.beat + Math.min(event.duration, PLUCK_LIT_BEATS) - EPSILON,
    )
    .map(({ stringIndex, fret }) => ({ stringIndex, fret }));
}
