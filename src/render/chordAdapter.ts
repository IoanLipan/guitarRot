import type { ChordShape } from '@/music';
import type { FretMarker } from './Fretboard';

export type ChordFretboardProps = {
  markers: FretMarker[];
  mutedStrings: number[];
  openStrings: number[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  fretRange: [number, number];
};

const DIAGRAM_FRETS = 4;

/** Splits a ChordShape into the props the Fretboard component understands. */
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
      label: finger === null || finger === undefined ? undefined : String(finger),
      tone: 'accent',
    });
  });

  const frettedFrets = markers.map((m) => m.fret);
  const lowest = frettedFrets.length === 0 ? 1 : Math.min(...frettedFrets);
  const start = lowest <= 1 ? 0 : lowest;
  const end = (start === 0 ? 1 : start) + DIAGRAM_FRETS - 1;

  return {
    markers,
    mutedStrings,
    openStrings,
    barre: shape.barre,
    fretRange: [start, end],
  };
}
