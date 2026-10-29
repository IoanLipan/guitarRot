import { beatsPerBar, type Riff, type Song, type TabEvent } from '@/content';
import {
  MAX_FRET,
  STANDARD_TUNING,
  fretToMidi,
  noteLabel,
  stringNumber,
  type FretPosition,
} from '@/music';

/**
 * What the Fretboard view of a song shows, worked out from its tab: which
 * frets the board covers, which notes each bar plays, and which one is
 * sounding at a given beat.
 *
 * Everything here is pure, so the rules can be tested without a screen.
 */

/** Does this song have a left hand worth drawing? A song that is only strummed does not. */
export function hasFretboard(song: Song): boolean {
  return song.riff !== undefined || song.chart?.pattern === 'arpeggio';
}

// ---------------------------------------------------------------------------
// The window of frets.
// ---------------------------------------------------------------------------

/** A board narrower than this makes a handful of notes into huge dots. */
export const MIN_WINDOW_FRETS = 5;
/** A board wider than this shrinks its dots too small to read on a phone; past it, the board follows the bars. */
export const MAX_WINDOW_FRETS = 8;
/** Up to this fret the nut stays in view: the top of the neck is where beginners live. */
export const NUT_FRET_LIMIT = 4;

/** The `fretRange` a `Fretboard` takes: [0, n] draws the nut, [n, m] starts at fret n. */
export type FretWindow = [number, number];

/** How many frets (cells) a window draws. */
export function windowFrets([from, to]: FretWindow): number {
  return to - Math.max(1, from) + 1;
}

/**
 * The frets to draw for some notes. The nut is shown when the lowest fretted
 * note is at fret 4 or below; otherwise the board starts one fret under it, so
 * the hand has a fret of context on the near side. It is at least five frets
 * wide, and wider when the notes reach further. Open strings need no fret.
 */
export function fretWindow(positions: readonly FretPosition[]): FretWindow {
  const fretted = positions.map((position) => position.fret).filter((fret) => fret > 0);
  if (fretted.length === 0) return [0, MIN_WINDOW_FRETS];

  const lowest = Math.min(...fretted);
  const highest = Math.max(...fretted);
  // A board never starts so high that five frets would run off the neck.
  const start = lowest <= NUT_FRET_LIMIT ? 0 : Math.min(lowest - 1, MAX_FRET - MIN_WINDOW_FRETS + 1);
  const end = Math.max(highest, Math.max(1, start) + MIN_WINDOW_FRETS - 1);
  return [start, Math.min(end, MAX_FRET)];
}

// ---------------------------------------------------------------------------
// Notes, bar by bar.
// ---------------------------------------------------------------------------

/** Notes struck at one instant: a single note, or a chord, which lights together. */
export type NoteGroup = {
  /** Quarter notes from the start of the song. */
  beat: number;
  /** How long the longest of them rings, in quarter notes. */
  duration: number;
  /** Ordered low string first. */
  positions: FretPosition[];
};

export type BarPlan = {
  /** 0-based. */
  bar: number;
  startBeat: number;
  endBeat: number;
  /** The notes that start in the bar, in time order. */
  groups: NoteGroup[];
  /** Every distinct position played in the bar, ordered by string then fret. */
  positions: FretPosition[];
  /** The frets the board shows while this bar plays. */
  fretRange: FretWindow;
};

export type FretboardPlan = {
  barLength: number;
  bars: BarPlan[];
};

const EPSILON = 1e-6;

const positionKey = (position: FretPosition): string => `${position.stringIndex}:${position.fret}`;

/** The distinct positions among `positions`, ordered by string then fret. */
function distinct(positions: readonly FretPosition[]): FretPosition[] {
  const seen = new Set<string>();
  const unique: FretPosition[] = [];
  for (const position of positions) {
    const key = positionKey(position);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ stringIndex: position.stringIndex, fret: position.fret });
  }
  return unique.sort((a, b) => a.stringIndex - b.stringIndex || a.fret - b.fret);
}

/** Cuts a bar's events (already in time order) into the notes struck at the same instant. */
function groupNotes(events: readonly TabEvent[]): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last !== undefined && Math.abs(event.beat - last.beat) < EPSILON) {
      last.positions.push({ stringIndex: event.stringIndex, fret: event.fret });
      last.duration = Math.max(last.duration, event.duration);
    } else {
      groups.push({
        beat: event.beat,
        duration: event.duration,
        positions: [{ stringIndex: event.stringIndex, fret: event.fret }],
      });
    }
  }
  for (const group of groups) group.positions.sort((a, b) => a.stringIndex - b.stringIndex);
  return groups;
}

/**
 * The board's plan for a riff: each bar's notes and the frets to show.
 *
 * One window covers the whole song when its notes fit in eight frets, so the
 * board never moves. A song that reaches further gets a window per bar by the
 * same rule: the board only shifts at a bar line, never in the middle of one.
 * A bar with no notes in it keeps the window of the bar before it (or, at the
 * start of the song, the one after), so a rest is not a jump.
 */
export function planFretboard(riff: Riff): FretboardPlan {
  const barLength = beatsPerBar(riff.timeSignature);
  const events = [...riff.events].sort((a, b) => a.beat - b.beat);

  const bars: BarPlan[] = Array.from({ length: riff.bars }, (_, bar) => {
    const startBeat = bar * barLength;
    const endBeat = startBeat + barLength;
    const inBar = events.filter((event) => event.beat >= startBeat - EPSILON && event.beat < endBeat - EPSILON);
    const groups = groupNotes(inBar);
    const positions = distinct(groups.flatMap((group) => group.positions));
    return { bar, startBeat, endBeat, groups, positions, fretRange: fretWindow(positions) };
  });

  const whole = fretWindow(distinct(bars.flatMap((bar) => bar.positions)));
  if (windowFrets(whole) <= MAX_WINDOW_FRETS) {
    for (const bar of bars) bar.fretRange = whole;
    return { barLength, bars };
  }

  // Per bar: an empty bar borrows its neighbour's window instead of jumping to the nut.
  let carried: FretWindow | undefined;
  for (const bar of bars) {
    if (bar.positions.length > 0) carried = bar.fretRange;
    else if (carried !== undefined) bar.fretRange = carried;
  }
  const firstWithNotes = bars.find((bar) => bar.positions.length > 0);
  if (firstWithNotes !== undefined) {
    for (const bar of bars) {
      if (bar === firstWithNotes) break;
      bar.fretRange = firstWithNotes.fretRange;
    }
  }
  return { barLength, bars };
}

// ---------------------------------------------------------------------------
// Following playback.
// ---------------------------------------------------------------------------

/** Where the song is on the board: the bar, the note sounding now, and the one coming next. */
export type FretboardCursor = {
  bar: number;
  /** The notes struck most recently, while they still ring; undefined in a rest. */
  lit?: NoteGroup;
  /** The next notes in this bar. Undefined after the bar's last note: the next bar has its own board. */
  next?: NoteGroup;
};

/** The index of the bar playing at `beat`, kept within the song. */
export function barAtBeat(plan: FretboardPlan, beat: number): number {
  return Math.min(plan.bars.length - 1, Math.max(0, Math.floor((beat + EPSILON) / plan.barLength)));
}

/**
 * The cursor at `beat`. The note sounding is the latest one struck in the bar,
 * for as long as it lasts: a fresh note takes over from the one before it even
 * when that is still ringing, so the board reads like a finger moving along it.
 */
export function cursorAt(plan: FretboardPlan, beat: number): FretboardCursor {
  const bar = barAtBeat(plan, beat);
  let lit: NoteGroup | undefined;
  let next: NoteGroup | undefined;
  for (const group of plan.bars[bar]?.groups ?? []) {
    if (group.beat <= beat + EPSILON) {
      lit = group;
    } else {
      next = group;
      break;
    }
  }
  if (lit !== undefined && beat >= lit.beat + lit.duration - EPSILON) lit = undefined;
  return { bar, ...(lit === undefined ? {} : { lit }), ...(next === undefined ? {} : { next }) };
}

/** A board with nothing lit, showing `bar`: what a paused song looks like. */
export function restingCursor(plan: FretboardPlan, bar: number): FretboardCursor {
  return { bar: Math.min(plan.bars.length - 1, Math.max(0, bar)) };
}

/** Two cursors with the same key look the same, so a view need only redraw when it changes. */
export function cursorKey(cursor: FretboardCursor): string {
  return `${cursor.bar}/${cursor.lit?.beat ?? ''}/${cursor.next?.beat ?? ''}`;
}

// ---------------------------------------------------------------------------
// Words.
// ---------------------------------------------------------------------------

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];

/** "4th string, open" or "2nd string, fret 1": where a note is played, in plain words. */
function describeWhere({ stringIndex, fret }: FretPosition): string {
  return `${ORDINALS[stringNumber(stringIndex)] ?? ''} string, ${fret === 0 ? 'open' : `fret ${fret}`}`;
}

function labelOf(position: FretPosition): string {
  return noteLabel(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret));
}

/**
 * What the sounding notes are called, and for a single note where it lives:
 * "D (Re) · 4th string, open". A chord just lists its notes, low to high; the
 * board shows where they are.
 */
export function describeNotes(positions: readonly FretPosition[]): string {
  const [only, ...rest] = positions;
  if (only === undefined) return '';
  if (rest.length === 0) return `${labelOf(only)} · ${describeWhere(only)}`;
  return positions.map(labelOf).join(' + ');
}
