import { chordStrings } from '@/music';
import { getChord } from '../chords';
import type { NeckDot, Visual } from '../lessons';

/** Dots at several frets of one string, all labelled the same way (the note, by default). */
export const onString = (stringIndex: number, frets: readonly number[], label?: NeckDot['label']): NeckDot[] =>
  frets.map((fret) => (label === undefined ? { stringIndex, fret } : { stringIndex, fret, label }));

/**
 * A neck picture of a library chord: one dot per fretted note, labelled with
 * the finger that plays it, with the strings the chord sounds drawn bright.
 * Built from the chord library, never typed, so the picture cannot disagree
 * with the chord diagram the learner meets a moment later.
 */
export function gripNeck(chordId: string, fretRange: [number, number]): Visual {
  const chord = getChord(chordId);
  if (chord === undefined) throw new Error(`no chord ${chordId}`);
  const dots: NeckDot[] = [];
  chord.frets.forEach((fret, stringIndex) => {
    const finger = chord.fingers[stringIndex];
    if (fret !== null && fret > 0 && finger !== null && finger !== undefined) {
      dots.push({ stringIndex, fret, label: String(finger) });
    }
  });
  return { kind: 'neck', fretRange, dots, highlightStrings: chordStrings(chord) };
}
