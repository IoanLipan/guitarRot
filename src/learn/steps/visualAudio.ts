import { fretToMidi, noteName, parseNoteName, solfegeName, STANDARD_TUNING, type Midi } from '@/music';
import type { NeckDot } from '@/content';

/** The lowest note a guitar in standard tuning can play: the open low E. */
const LOWEST = 40;
/** Above this a row of notes sounds thin and shrill, so a rising row that would reach it starts lower. */
const COMFORTABLE_TOP = 72;

const HAS_OCTAVE = /-?\d+$/;

function risingFrom(notes: readonly string[], floor: Midi): Midi[] {
  const out: Midi[] = [];
  let previous = floor - 1;
  for (const note of notes) {
    if (HAS_OCTAVE.test(note.trim())) {
      const midi = parseNoteName(note);
      out.push(midi);
      previous = midi;
      continue;
    }
    const pitchClass = ((parseNoteName(note) % 12) + 12) % 12;
    let midi = previous + 1;
    while (((midi % 12) + 12) % 12 !== pitchClass) midi += 1;
    out.push(midi);
    previous = midi;
  }
  return out;
}

/**
 * Which pitches a row of note bubbles plays. A note written with an octave
 * ("E2") keeps it. The rest are placed so the row climbs the way an alphabet,
 * a scale or a chord is played: each one the next time its letter comes round
 * above the one before, starting in the octave of middle C's neighbour (C3 up)
 * and dropping an octave if that would climb into shrill territory. So
 * A B C D E F G rises from A3, and E A D G B E lands on the six open strings.
 */
export function notesToMidi(notes: readonly string[]): Midi[] {
  const high = risingFrom(notes, 48);
  return Math.max(...high) > COMFORTABLE_TOP ? risingFrom(notes, LOWEST) : high;
}

/** The letter a bubble shows: the spelling without its octave. */
export function noteLetter(note: string): string {
  return note.trim().replace(HAS_OCTAVE, '');
}

/** What a neck dot says inside itself, from the card's `label` setting. */
export function neckDotText(dot: NeckDot): string {
  const label = dot.label ?? 'note';
  if (label === 'none') return '';
  const midi = fretToMidi(STANDARD_TUNING, dot.stringIndex, dot.fret);
  if (label === 'note') return noteName(midi);
  if (label === 'solfege') return solfegeName(midi);
  return label;
}
