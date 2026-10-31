import { STANDARD_TUNING, fretToMidi, noteName, type ChordShape } from '@/music';
import type { FretMarker } from './Fretboard';
import { noteColor } from './noteColors';

export type ChordFretboardProps = {
  markers: FretMarker[];
  mutedStrings: number[];
  openStrings: number[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  fretRange: [number, number];
};

const DIAGRAM_FRETS = 5;

/**
 * Splits a ChordShape into the props the Fretboard component understands. The
 * dots are coloured by note (chord shapes are for the standard tuning). A
 * board that asks "which chord is this?" strips those colours: the question
 * dot is not a note.
 */
export function chordShapeToFretboard(shape: ChordShape): ChordFretboardProps {
  const markers: FretMarker[] = [];
  const mutedStrings: number[] = [];
  const openStrings: number[] = [];

  shape.frets.forEach((fret, stringIndex) => {
    if (fret === null || fret === undefined) {
      mutedStrings.push(stringIndex);
      return;
    }
    if (fret === 0) {
      openStrings.push(stringIndex);
      return;
    }
    const finger = shape.fingers[stringIndex];
    markers.push({
      stringIndex,
      fret,
      // The number inside the dot is the finger; the dot is the note, so it
      // wears that note's colour like every other note on every other board.
      label: finger === null || finger === undefined ? undefined : String(finger),
      tone: 'root',
      color: noteColor(noteName(fretToMidi(STANDARD_TUNING, stringIndex, fret))),
    });
  });

  // The window is anchored on the shape's own baseFret (the "leftmost fret
  // of the diagram box"), matching the 5-fret span validateChordShape
  // already enforces: [baseFret, baseFret + 4]. A valid ChordShape always
  // has an integer baseFret >= 1; the fallback to the lowest fretted note
  // only guards a malformed shape slipping through.
  //
  // Open shapes (baseFret === 1) are a deliberate exception: fret 0 is
  // where open strings and the nut live, and every conventional open-chord
  // diagram shows it. Starting at 0 instead of 1 keeps that nut line and
  // the open-string circles visible, at the cost of not reaching fret 5
  // (baseFret + 4) — no open-position chord shipped or planned here uses
  // a fret that high, so this trade is deliberate, not an oversight.
  const frettedFrets = markers.map((m) => m.fret);
  const hasValidBaseFret = Number.isInteger(shape.baseFret) && shape.baseFret >= 1;
  const start = hasValidBaseFret
    ? shape.baseFret === 1
      ? 0
      : shape.baseFret
    : frettedFrets.length === 0
      ? 1
      : Math.min(...frettedFrets);
  const end = start + DIAGRAM_FRETS - 1;

  return {
    markers,
    mutedStrings,
    openStrings,
    barre: shape.barre,
    fretRange: [start, end],
  };
}
