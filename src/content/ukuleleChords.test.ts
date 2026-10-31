import { describe, expect, it } from 'vitest';
import {
  chordPitchClasses,
  chordStrings,
  chordToneNames,
  chordVoicing,
  expectedPitchClasses,
  UKULELE,
  validateChordShape,
  noteName,
} from '@/music';
import { ALL_CHORDS, CHORDS, GUITAR_CHORDS, chordsFor, getChord } from './chords';
import { UKULELE_CHORDS } from './ukuleleChords';

/** The shapes a beginner's first ukulele chord book has, as the familiar G-C-E-A tab digits. */
const CORE: Record<string, string> = {
  C: '0003',
  Am: '2000',
  F: '2010',
  G: '0232',
  Em: '0432',
  Dm: '2210',
  G7: '0212',
  C7: '0001',
  A7: '0100',
  D: '2220',
  A: '2100',
  E7: '1202',
  Bb: '3211',
};

describe('the ukulele chord library', () => {
  it('has the core shapes, written as the familiar GCEA digits', () => {
    expect(UKULELE_CHORDS.map((chord) => chord.name).sort()).toEqual(Object.keys(CORE).sort());
    for (const chord of UKULELE_CHORDS) {
      expect(chord.frets.map((fret) => (fret === null ? 'x' : String(fret))).join('')).toBe(CORE[chord.name]);
    }
  });

  it('puts four entries on every shape, one per string', () => {
    for (const chord of UKULELE_CHORDS) {
      expect(chord.frets).toHaveLength(4);
      expect(chord.fingers).toHaveLength(4);
      expect(chord.instrument).toBe('ukulele');
    }
  });

  it.each(UKULELE_CHORDS.map((chord) => [chord.id, chord] as const))(
    '%s sounds exactly the notes its name says, worked out from the tuning',
    (_id, chord) => {
      expect(validateChordShape(chord, UKULELE.tuning)).toEqual([]);
      expect(chordPitchClasses(chord, UKULELE.tuning)).toEqual(expectedPitchClasses(chord.root, chord.quality));
    },
  );

  it('spells the tones from the root, so Am is A C E and G7 is G B D F', () => {
    const tones = (name: string) => {
      const chord = UKULELE_CHORDS.find((candidate) => candidate.name === name);
      if (chord === undefined) throw new Error(`no ${name}`);
      return chordToneNames(chord, UKULELE.tuning, { preferFlat: name === 'Bb' });
    };
    expect(tones('Am')).toEqual(['A', 'C', 'E']);
    expect(tones('G7')).toEqual(['G', 'B', 'D', 'F']);
    expect(tones('Bb')).toEqual(['Bb', 'D', 'F']);
    expect(tones('C')).toEqual(['C', 'E', 'G']);
  });

  it('voices a shape in string order, not pitch order: C is G4 C4 E4 C5, the high G first', () => {
    const c = getChord('uke-C');
    if (c === undefined) throw new Error('no uke-C');
    expect(chordVoicing(c, UKULELE.tuning).map((midi) => noteName(midi, { withOctave: true }))).toEqual([
      'G4',
      'C4',
      'E4',
      'C5',
    ]);
    expect(chordStrings(c)).toEqual([0, 1, 2, 3]);
  });

  it('is a wrong guitar shape on a four-string neck: a six-string shape does not validate against the ukulele', () => {
    const guitarShape = GUITAR_CHORDS[0];
    if (guitarShape === undefined) throw new Error('no guitar chords');
    expect(validateChordShape(guitarShape, UKULELE.tuning).join(' ')).toContain('4 entries');
  });
});

describe('the libraries together', () => {
  it('keeps ids unique across every instrument, because a chord id travels with no instrument beside it', () => {
    const ids = ALL_CHORDS.map((chord) => chord.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps share-safe ids: no character that would end a link query', () => {
    for (const chord of ALL_CHORDS) expect(chord.id).toMatch(/^[A-Za-z0-9-]+$/);
  });

  it('lists each instrument its own chords and leaves the guitar library exactly as it was', () => {
    expect(chordsFor('guitar')).toBe(GUITAR_CHORDS);
    expect(CHORDS).toBe(GUITAR_CHORDS);
    expect(chordsFor('ukulele')).toEqual(UKULELE_CHORDS);
    expect(chordsFor('guitar').some((chord) => chord.instrument === 'ukulele')).toBe(false);
  });

  it('finds a chord by id in either library', () => {
    expect(getChord('E-open')?.name).toBe('E');
    expect(getChord('uke-Am')?.instrument).toBe('ukulele');
    expect(getChord('nope')).toBeUndefined();
  });
});
