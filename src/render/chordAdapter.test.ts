import { describe, expect, it } from 'vitest';
import { chordShapeToFretboard } from './chordAdapter';
import { STANDARD_TUNING, validateChordShape, type ChordShape } from '@/music';

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

  it('shows a five-fret window starting at the baseFret', () => {
    expect(chordShapeToFretboard(aMinorOpen).fretRange).toEqual([1, 5]);
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

  // Regression for the box being one fret too narrow: validateChordShape
  // allows any fretted note up to baseFret + 4 (a 5-fret box), but the old
  // DIAGRAM_FRETS = 4 plus a lowest-fretted-note-derived start could compute
  // a window that excludes a note sitting legally at the box's far edge.
  // A5 power chord: root (A, pitch class 9) on the low E string at fret 5
  // (baseFret), fifth (E, pitch class 4) on the G string at fret 9 --
  // exactly baseFret + 4.
  const a5AtFretboardEdge: ChordShape = {
    id: 'A5-edge',
    name: 'A5',
    root: 9,
    quality: 'power',
    baseFret: 5,
    frets: [5, null, null, 9, null, null],
    fingers: [1, null, null, 3, null, null],
    difficulty: 1,
  };

  it('is a legitimately valid shape (fixture sanity check)', () => {
    expect(validateChordShape(a5AtFretboardEdge, STANDARD_TUNING)).toEqual([]);
  });

  it('covers a note fretted at baseFret + 4, the far edge of the 5-fret box', () => {
    const { fretRange } = chordShapeToFretboard(a5AtFretboardEdge);
    const [low, high] = fretRange;
    expect(low).toBeLessThanOrEqual(9);
    expect(high).toBeGreaterThanOrEqual(9);
    expect(fretRange).toEqual([5, 9]);
  });

  it('derives the window start from baseFret, not the lowest fretted note', () => {
    const shapeWithHighLowestNote: ChordShape = {
      id: 'test-high-lowest',
      name: 'A5',
      root: 9,
      quality: 'power',
      baseFret: 3,
      frets: [7, null, null, null, null, null],
      fingers: [1, null, null, null, null, null],
      difficulty: 1,
    };
    expect(chordShapeToFretboard(shapeWithHighLowestNote).fretRange).toEqual([3, 7]);
  });
});
