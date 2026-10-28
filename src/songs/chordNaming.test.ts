import { describe, expect, it } from 'vitest';
import { CHORDS } from '@/content';
import { chordSolfegeName, type ChordQuality, type FretPosition } from '@/music';
import { QUALITY_SYMBOLS, describeChord, nameShape } from './chordNaming';

const pos = (stringIndex: number, fret: number): FretPosition => ({ stringIndex, fret });

/** Positions from a chord grid, low string first; `null` is a string left out. */
function grid(frets: readonly (number | null)[]): FretPosition[] {
  return frets.flatMap((fret, stringIndex) => (fret === null ? [] : [pos(stringIndex, fret)]));
}

/** The open Am chord as positions: x02210. */
const AM = grid([null, 0, 2, 2, 1, 0]);

describe('nameShape: exact chords, from theory', () => {
  it('names a shape the library has', () => {
    const name = nameShape(AM);
    expect(name.match).toBe('exact');
    expect(name.chord?.name).toBe('Am');
    expect(name.chord?.solfege).toBe('La minor');
    expect(name.extras).toEqual([]);
  });

  it('names a minor chord the library has no shape for: G minor', () => {
    // 355333, the barre shape: G D G Bb D G.
    const name = nameShape(grid([3, 5, 5, 3, 3, 3]));
    expect(name.match).toBe('exact');
    expect(name.chord?.name).toBe('Gm');
    expect(name.chord?.solfege).toBe('Sol minor');
  });

  it('spells a flat root as a flat: Bb major', () => {
    const name = nameShape(grid([null, 1, 3, 3, 3, 1]));
    expect(name.chord?.name).toBe('Bb');
    expect(name.chord?.solfege).toBe('Sib major');
    expect(name.match).toBe('exact');
  });

  it('names a dominant seventh: A7', () => {
    const name = nameShape(grid([null, 0, 2, 0, 2, 0]));
    expect(name.chord?.name).toBe('A7');
    expect(name.chord?.solfege).toBe('La dominant seventh');
  });

  it('names a minor seventh the library has no shape for: Dm7 up the neck', () => {
    // x5756x: D A C F.
    const name = nameShape(grid([null, 5, 7, 5, 6, null]));
    expect(name.chord?.name).toBe('Dm7');
    expect(name.chord?.solfege).toBe('Re minor seventh');
  });

  it('names a major seventh: Bbmaj7', () => {
    // Bb D F A as x1 3 2 3 x: A string 1 (Bb), D string 3 (F), G string 2 (A), B string 3 (D).
    const name = nameShape(grid([null, 1, 3, 2, 3, null]));
    expect(name.chord?.name).toBe('Bbmaj7');
  });

  it('names a suspended chord, and lets the bass say which one', () => {
    // A, B and E over an A bass is Asus2; over an E bass, the same three notes are Esus4.
    expect(nameShape(grid([null, 0, 2, 2, 0, 0])).chord?.name).toBe('Asus2');
    expect(nameShape([pos(0, 0), pos(1, 0), pos(4, 0)]).chord?.name).toBe('Esus4');
    expect(nameShape(grid([null, null, 0, 2, 3, 3])).chord?.name).toBe('Dsus4');
  });

  it('names diminished and augmented triads', () => {
    expect(nameShape(grid([null, 2, 3, 4, 3, null])).chord?.name).toBe('Bdim');
    expect(nameShape(grid([null, 3, 2, 1, 1, 0])).chord?.name).toBe('Caug');
  });

  it('prefers the chord built on the bass note, for a chord that is also another', () => {
    // C, E, G# is augmented whichever of the three is the root; the bass decides.
    expect(nameShape([pos(1, 3), pos(2, 2), pos(3, 1)]).chord?.name).toBe('Caug');
    expect(nameShape([pos(1, 7), pos(2, 6), pos(3, 5)]).chord?.name).toBe('Eaug');
  });

  it('names a power chord, root and fifth: G5', () => {
    const name = nameShape(grid([3, 5, 5, null, null, null]));
    expect(name.match).toBe('exact');
    expect(name.chord?.name).toBe('G5');
    expect(name.chord?.solfege).toBe('Sol power chord');
  });

  it('names a bare fifth by its root, whichever way up it is played', () => {
    // E and B: E5, with the E or the B lower.
    expect(nameShape([pos(0, 0), pos(1, 2)]).chord?.name).toBe('E5');
    expect(nameShape([pos(1, 2), pos(2, 2)]).chord?.name).toBe('E5');
  });

  it('knows every shape in the library by the name the library gives it', () => {
    for (const chord of CHORDS) {
      const positions = grid(chord.frets);
      const name = nameShape(positions);
      expect(name.match, chord.id).toBe('exact');
      expect(name.chord?.name, chord.id).toBe(chord.name);
      expect(name.chord?.solfege, chord.id).toBe(chordSolfegeName(chord));
    }
  });
});

describe('nameShape: a chord with a melody', () => {
  it('calls a chord with one extra note "with melody", and says which note', () => {
    // Am, plus a D on the B string: the note the tune is on.
    const name = nameShape([...AM, pos(4, 3)]);
    expect(name.match).toBe('with-melody');
    expect(name.chord?.name).toBe('Am');
    expect(name.extras).toEqual([2]);
  });

  it('does it for a chord that is not in the library: G minor with a high C', () => {
    const name = nameShape([...grid([3, 5, 5, 3, 3, 3]), pos(5, 8)]);
    expect(name.match).toBe('with-melody');
    expect(name.chord?.name).toBe('Gm');
    expect(name.extras).toEqual([0]);
  });

  it('prefers the chord built on the bass note when two fit', () => {
    // A, C, E and F over an A bass spell Fmaj7 exactly, but the bass says Am
    // with a passing F: that is how it sounds, so that is the name.
    const name = nameShape([...AM, pos(5, 1)]);
    expect(name.chord?.name).toBe('Am');
    expect(name.match).toBe('with-melody');
    expect(name.extras).toEqual([5]);
  });

  it('keeps an exact match when the bass agrees with it', () => {
    // The same four notes with the F in the bass: Fmaj7, no melody about it.
    const name = nameShape(grid([1, null, 2, 2, 1, 0]));
    expect(name.chord?.name).toBe('Fmaj7');
    expect(name.match).toBe('exact');
  });

  it('does not call two extra notes a melody', () => {
    // Am with a G sharp and a D: too much to be "a chord with a tune".
    expect(nameShape([...AM, pos(5, 4), pos(4, 3)]).match).toBe('none');
  });

  it('never calls a power chord plus a note a chord with melody', () => {
    // E and B (E5) with a C on top.
    expect(nameShape([pos(0, 0), pos(1, 2), pos(4, 1)]).match).toBe('none');
  });
});

describe('nameShape: leaving it unnamed', () => {
  it('names nothing for no notes', () => {
    expect(nameShape([]).match).toBe('none');
    expect(nameShape([]).chord).toBeUndefined();
  });

  it('names nothing for a chromatic cluster', () => {
    // C, C#, D, D#.
    const name = nameShape([pos(1, 3), pos(1, 4), pos(2, 0), pos(2, 1)]);
    expect(name.match).toBe('none');
    expect(name.chord).toBeUndefined();
  });

  it('names nothing for a single note', () => {
    expect(nameShape([pos(1, 0)]).match).toBe('none');
    // The same note an octave up is still one note.
    expect(nameShape([pos(1, 0), pos(3, 2)]).match).toBe('none');
  });

  it('names nothing for two notes that are not a fifth', () => {
    // C and E, a third apart: a dyad with no chord to call it.
    expect(nameShape([pos(1, 3), pos(2, 2)]).match).toBe('none');
  });

  it('names nothing for a set that fits no chord with at most one note over', () => {
    // A walking bass over a chord: every note of a scale.
    const scale = [pos(1, 0), pos(1, 2), pos(1, 3), pos(2, 0), pos(2, 2), pos(2, 4)];
    expect(nameShape(scale).match).toBe('none');
  });
});

describe('describeChord', () => {
  it('writes the symbol the rest of the app writes', () => {
    const cases: [number, ChordQuality, string][] = [
      [0, 'maj', 'C'],
      [9, 'min', 'Am'],
      [9, 'dom7', 'A7'],
      [2, 'min7', 'Dm7'],
      [0, 'maj7', 'Cmaj7'],
      [9, 'sus2', 'Asus2'],
      [2, 'sus4', 'Dsus4'],
      [11, 'dim', 'Bdim'],
      [0, 'aug', 'Caug'],
      [4, 'power', 'E5'],
    ];
    for (const [root, quality, name] of cases) expect(describeChord(root, quality).name).toBe(name);
  });

  it('has a symbol for every quality there is', () => {
    expect(Object.keys(QUALITY_SYMBOLS).sort()).toEqual(
      ['aug', 'dim', 'dom7', 'maj', 'maj7', 'min', 'min7', 'power', 'sus2', 'sus4'].sort(),
    );
  });

  it('leans flat for major chords and sharp for minor ones', () => {
    expect(describeChord(10, 'maj').name).toBe('Bb');
    expect(describeChord(1, 'maj').name).toBe('Db');
    expect(describeChord(6, 'maj').name).toBe('F#');
    expect(describeChord(1, 'min').name).toBe('C#m');
    expect(describeChord(8, 'min7').name).toBe('G#m7');
    expect(describeChord(3, 'min').name).toBe('Ebm');
  });

  it('writes the solfège to match the spelling', () => {
    expect(describeChord(10, 'maj').solfege).toBe('Sib major');
    expect(describeChord(6, 'min').solfege).toBe('Fa# minor');
    expect(describeChord(7, 'min').solfege).toBe('Sol minor');
    expect(describeChord(0, 'maj7').solfege).toBe('Do major seventh');
  });
});
