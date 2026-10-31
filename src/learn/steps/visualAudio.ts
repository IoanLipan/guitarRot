import {
  GUITAR,
  fretToMidi,
  lowestOpenMidi,
  noteName,
  parseNoteName,
  solfegeName,
  type Instrument,
  type Midi,
} from '@/music';
import type { NeckDot } from '@/content';

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
 * and dropping an octave if that would climb into shrill territory. So on the
 * guitar A B C D E F G rises from A3, and E A D G B E lands on the six open
 * strings; on the ukulele, whose lowest string is the C a step under its high
 * G, the same row starts at A4. A row climbs, and the ukulele's open strings
 * do not (the high G is above the C, E and A beside it), so G C E A rises from
 * G4 through C5 and E5 to A5 rather than landing on the strings.
 *
 * "Starting at the lowest open string" is by pitch, not by string index: the
 * ukulele's first string is a high one.
 */
export function notesToMidi(notes: readonly string[], instrument: Instrument = GUITAR): Midi[] {
  const { low, high: top } = instrument.rowRange;
  const rising = risingFrom(notes, low);
  return Math.max(...rising) > top ? risingFrom(notes, lowestOpenMidi(instrument.tuning)) : rising;
}

/** The letter a bubble shows: the spelling without its octave. */
export function noteLetter(note: string): string {
  return note.trim().replace(HAS_OCTAVE, '');
}

/** What a neck dot says inside itself, from the card's `label` setting. */
export function neckDotText(dot: NeckDot, instrument: Instrument = GUITAR): string {
  const label = dot.label ?? 'note';
  if (label === 'none') return '';
  const midi = fretToMidi(instrument.tuning, dot.stringIndex, dot.fret);
  if (label === 'note') return noteName(midi);
  if (label === 'solfege') return solfegeName(midi);
  return label;
}
