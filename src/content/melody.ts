import {
  STANDARD_TUNING,
  STRING_COUNT,
  findPositions,
  parseNoteName,
  type FretPosition,
} from '@/music';
import { beatsPerBar, type Riff, type TabEvent, type TimeSignature } from './types';

/**
 * Single-note melodies are tabbed in first position (open strings up to the
 * twelfth fret). It is where a beginner's hand lives, and keeping the search
 * window small is what makes "the lowest fret" mean "the obvious fret".
 */
const FIRST_POSITION: readonly [number, number] = [0, 12];

/**
 * `E4:1`, `F#3:0.5`, `Bb2:2`, or `r:1` for a rest. Uppercase letter, optional
 * accidental, and an *explicit* octave: a silently defaulted octave would
 * teach the wrong pitch, which is exactly what this module exists to prevent.
 */
const TOKEN = /^(?:(?<note>[A-G][#b]?-?\d+)|r):(?<duration>\d+(?:\.\d+)?)$/;

type Step = { label: string; midi: number | null; duration: number };

function parseStep(token: string): Step {
  const match = TOKEN.exec(token);
  const durationText = match?.groups?.duration;
  if (match === null || durationText === undefined) {
    throw new Error(`Bad melody token "${token}": expected NOTE:BEATS like "E4:1" or "r:1"`);
  }

  const duration = Number(durationText);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Bad melody token "${token}": duration must be greater than zero`);
  }

  const note = match.groups?.note;
  return { label: note ?? 'r', midi: note === undefined ? null : parseNoteName(note), duration };
}

/** The lowest-fret place to play `step`, or its fret on `onString` when pinned. */
function chooseFret(label: string, midi: number, onString: number | undefined): FretPosition {
  let lowest: FretPosition | undefined;
  for (const position of findPositions(STANDARD_TUNING, midi, FIRST_POSITION)) {
    if (onString !== undefined && position.stringIndex !== onString) continue;
    if (lowest === undefined || position.fret < lowest.fret) lowest = position;
  }
  if (lowest === undefined) {
    const where = onString === undefined ? '' : ` on string index ${onString}`;
    throw new Error(
      `${label} cannot be played${where} within frets ${FIRST_POSITION[0]}-${FIRST_POSITION[1]}`,
    );
  }
  return lowest;
}

function parseMelody(
  notes: string,
  onString: number | undefined,
): { events: TabEvent[]; totalBeats: number } {
  if (
    onString !== undefined &&
    (!Number.isInteger(onString) || onString < 0 || onString >= STRING_COUNT)
  ) {
    throw new Error(`onString must be a string index from 0 to ${STRING_COUNT - 1}, got ${onString}`);
  }

  const events: TabEvent[] = [];
  let beat = 0;
  for (const token of notes.split(/[\s|]+/).filter((part) => part !== '')) {
    const step = parseStep(token);
    if (step.midi !== null) {
      const { stringIndex, fret } = chooseFret(step.label, step.midi, onString);
      events.push({ stringIndex, fret, beat, duration: step.duration });
    }
    beat += step.duration;
  }

  if (events.length === 0) throw new Error('A melody needs at least one note');
  return { events, totalBeats: beat };
}

/**
 * Turns a melody written as text into tab events.
 *
 * `'E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1'` — each token is a note name
 * with an octave, a colon, and its length in quarter notes. `r:1` is a rest.
 * `|` marks a bar line for the human reading the source; it carries no
 * meaning here, so bar lengths are the author's job (the content tests check
 * them).
 *
 * Writing pitches rather than frets is the point: pitch names can be checked
 * against the tune, fret numbers cannot. Each note takes the lowest fret in
 * first position (so open strings win), or sits on `onString` when the
 * melody should stay on one string — which is how the landmark drills teach
 * a single string's notes.
 */
export function melodyEvents(notes: string, opts: { onString?: number } = {}): TabEvent[] {
  return parseMelody(notes, opts.onString).events;
}

/** Everything about a riff except what `melodyRiff` works out from the notes. */
export type MelodyRiffSpec = Omit<Riff, 'events' | 'bars' | 'timeSignature'> & {
  /** The melody text, as `melodyEvents` reads it. */
  notes: string;
  onString?: number;
  timeSignature?: TimeSignature;
};

/**
 * A melody as a playable riff. The bar count is however many bars the notes
 * and rests fill, trailing rests included.
 */
export function melodyRiff(spec: MelodyRiffSpec): Riff {
  const { notes, onString, timeSignature = [4, 4], ...rest } = spec;
  const { events, totalBeats } = parseMelody(notes, onString);
  return {
    ...rest,
    timeSignature,
    bars: Math.max(1, Math.ceil(totalBeats / beatsPerBar(timeSignature))),
    events,
  };
}
