import { describe, expect, it } from 'vitest';
import { chordShapeToFretboard } from './chordAdapter';
import type { ChordShape } from '@/music';

const aMinorOpen: ChordShape = {
  id: 'Am-open',
  name: 'Am',
  root: 9,
  quality: 'min',
  baseFret: 1,
  frets: [null, 0, 2, 2, 1, 0],
  fingers: [null, null, 2, 3, 1, null],
  difficulty: 1,
};

const fMajorBarre: ChordShape = {
  id: 'F-barre',
  name: 'F',
  root: 5,
  quality: 'maj',
  baseFret: 1,
  frets: [1, 3, 3, 2, 1, 1],
  fingers: [1, 3, 4, 2, 1, 1],
  barre: { fret: 1, fromStringIndex: 0, toStringIndex: 5 },
  difficulty: 3,
};

describe('chordShapeToFretboard', () => {
  it('emits a marker only for fretted strings', () => {
    const { markers } = chordShapeToFretboard(aMinorOpen);
    expect(markers.map((m) => m.stringIndex)).toEqual([2, 3, 4]);
  });

  it('labels markers with finger numbers', () => {
    const { markers } = chordShapeToFretboard(aMinorOpen);
    expect(markers.map((m) => m.label)).toEqual(['2', '3', '1']);
  });

  it('separates muted from open strings', () => {
    const { mutedStrings, openStrings } = chordShapeToFretboard(aMinorOpen);
    expect(mutedStrings).toEqual([0]);
    expect(openStrings).toEqual([1, 5]);
  });

  it('shows five frets from the first fretted note', () => {
    expect(chordShapeToFretboard(aMinorOpen).fretRange).toEqual([0, 4]);
  });

  it('passes the barre through', () => {
    expect(chordShapeToFretboard(fMajorBarre).barre).toEqual({
      fret: 1,
      fromStringIndex: 0,
      toStringIndex: 5,
    });
  });

  it('reports no open or muted strings for a full barre shape', () => {
    const { mutedStrings, openStrings } = chordShapeToFretboard(fMajorBarre);
    expect(mutedStrings).toEqual([]);
    expect(openStrings).toEqual([]);
  });
});
