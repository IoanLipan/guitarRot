import { describe, expect, it } from 'vitest';
import {
  enharmonics,
  FLAT_NAMES,
  midiToOctave,
  midiToPitchClass,
  noteLabel,
  noteName,
  parseNoteName,
  pitchClassName,
  SHARP_NAMES,
  SOLFEGE_FLAT_NAMES,
  SOLFEGE_SHARP_NAMES,
  solfegeName,
  spellingSolfege,
  transpose,
  withSolfege,
} from './notes';

describe('midiToPitchClass', () => {
  it('maps C4 to pitch class 0', () => {
    expect(midiToPitchClass(60)).toBe(0);
  });

  it('maps every open standard-tuning string', () => {
    expect([40, 45, 50, 55, 59, 64].map(midiToPitchClass)).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it('stays in range for negative input', () => {
    expect(midiToPitchClass(-1)).toBe(11);
  });
});

describe('midiToOctave', () => {
  it('places C4 in octave 4', () => {
    expect(midiToOctave(60)).toBe(4);
  });

  it('places the low E string in octave 2', () => {
    expect(midiToOctave(40)).toBe(2);
  });

  it('places the high E string in octave 4', () => {
    expect(midiToOctave(64)).toBe(4);
  });
});

describe('noteName', () => {
  it('uses sharps by default', () => {
    expect(noteName(61)).toBe('C#');
  });

  it('uses flats on request', () => {
    expect(noteName(61, { preferFlat: true })).toBe('Db');
  });

  it('appends the octave on request', () => {
    expect(noteName(40, { withOctave: true })).toBe('E2');
  });

  it('names all six open strings', () => {
    const names = [40, 45, 50, 55, 59, 64].map((m) => noteName(m, { withOctave: true }));
    expect(names).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });
});

describe('pitchClassName', () => {
  it('names a pitch class without an octave', () => {
    expect(pitchClassName(9)).toBe('A');
  });
});

describe('parseNoteName', () => {
  it('round-trips every open string', () => {
    for (const m of [40, 45, 50, 55, 59, 64]) {
      expect(parseNoteName(noteName(m, { withOctave: true }))).toBe(m);
    }
  });

  it('accepts flats', () => {
    expect(parseNoteName('Bb3')).toBe(58);
  });

  it('accepts unicode accidentals', () => {
    expect(parseNoteName('C♯4')).toBe(61);
  });

  it('defaults to octave 4 when none is given', () => {
    expect(parseNoteName('C')).toBe(60);
  });

  it('throws on nonsense', () => {
    expect(() => parseNoteName('H4')).toThrow();
  });
});

describe('transpose', () => {
  it('moves up an octave', () => {
    expect(transpose(40, 12)).toBe(52);
  });

  it('moves down a fifth', () => {
    expect(transpose(64, -7)).toBe(57);
  });
});

describe('enharmonics', () => {
  it('gives both spellings for a black key', () => {
    expect(enharmonics(1)).toEqual(['C#', 'Db']);
  });

  it('gives one spelling for a white key', () => {
    expect(enharmonics(0)).toEqual(['C']);
  });
});

/** Fixed-do, typed independently of the implementation so the tables can't drift with it. */
const FIXED_DO: Record<string, string> = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};

describe('solfege tables', () => {
  it('pins the sharp table', () => {
    expect([...SOLFEGE_SHARP_NAMES]).toEqual([
      'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
    ]);
  });

  it('pins the flat table', () => {
    expect([...SOLFEGE_FLAT_NAMES]).toEqual([
      'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si',
    ]);
  });

  it('agrees with the letter names pitch class by pitch class', () => {
    // Whatever letter + accidental the app prints, the solfege is the same
    // syllable with the same accidental — so the two tables can never disagree.
    for (let pc = 0; pc < 12; pc += 1) {
      for (const [letters, solfege] of [
        [SHARP_NAMES, SOLFEGE_SHARP_NAMES],
        [FLAT_NAMES, SOLFEGE_FLAT_NAMES],
      ] as const) {
        const letter = letters[pc] ?? '';
        expect(solfege[pc]).toBe(`${FIXED_DO[letter.charAt(0)]}${letter.slice(1)}`);
      }
    }
  });
});

describe('solfegeName', () => {
  it('names all twelve pitch classes with sharps by default', () => {
    expect(Array.from({ length: 12 }, (_, pc) => solfegeName(pc))).toEqual([
      ...SOLFEGE_SHARP_NAMES,
    ]);
  });

  it('names all twelve pitch classes with flats on request', () => {
    expect(
      Array.from({ length: 12 }, (_, pc) => solfegeName(pc, { preferFlat: true })),
    ).toEqual([...SOLFEGE_FLAT_NAMES]);
  });

  it('wraps pitch classes outside 0-11 like pitchClassName does', () => {
    expect(solfegeName(12)).toBe('Do');
    expect(solfegeName(-1)).toBe('Si');
  });
});

describe('spellingSolfege', () => {
  it('gives the bare syllable for a spelling, octave ignored', () => {
    expect(spellingSolfege('E2')).toBe('Mi');
    expect(spellingSolfege('F#')).toBe('Fa#');
    expect(spellingSolfege('Bb3')).toBe('Sib');
  });
});

describe('withSolfege', () => {
  it('brackets the solfege after a natural', () => {
    expect(withSolfege('C')).toBe('C (Do)');
    expect(withSolfege('G')).toBe('G (Sol)');
  });

  it('follows a sharp spelling', () => {
    expect(withSolfege('F#')).toBe('F# (Fa#)');
    expect(withSolfege('C#')).toBe('C# (Do#)');
  });

  it('gives a flat spelling the flat solfege', () => {
    expect(withSolfege('Bb')).toBe('Bb (Sib)');
    expect(withSolfege('Db')).toBe('Db (Reb)');
  });

  it('passes the octave through on the letter name only', () => {
    expect(withSolfege('E2')).toBe('E2 (Mi)');
    expect(withSolfege('Bb3')).toBe('Bb3 (Sib)');
    expect(withSolfege('F#4')).toBe('F#4 (Fa#)');
  });

  it('labels every spelling the app prints, sharp and flat', () => {
    for (let pc = 0; pc < 12; pc += 1) {
      expect(withSolfege(SHARP_NAMES[pc] ?? '')).toBe(
        `${SHARP_NAMES[pc]} (${SOLFEGE_SHARP_NAMES[pc]})`,
      );
      expect(withSolfege(FLAT_NAMES[pc] ?? '')).toBe(
        `${FLAT_NAMES[pc]} (${SOLFEGE_FLAT_NAMES[pc]})`,
      );
    }
  });

  it('accepts unicode accidentals', () => {
    expect(withSolfege('C♯4')).toBe('C♯4 (Do#)');
    expect(withSolfege('B♭')).toBe('B♭ (Sib)');
  });

  it('does not mistake the letter b for a flat', () => {
    expect(withSolfege('b')).toBe('b (Si)');
  });

  it('throws on a spelling it cannot parse', () => {
    expect(() => withSolfege('H4')).toThrow();
    expect(() => withSolfege('')).toThrow();
  });
});

describe('noteLabel', () => {
  it('labels a midi note the way noteName spells it', () => {
    expect(noteLabel(67)).toBe('G (Sol)');
    expect(noteLabel(61)).toBe('C# (Do#)');
  });

  it('follows preferFlat', () => {
    expect(noteLabel(61, { preferFlat: true })).toBe('Db (Reb)');
    expect(noteLabel(70, { preferFlat: true })).toBe('Bb (Sib)');
  });

  it('keeps the octave on the letter name', () => {
    expect(noteLabel(40, { withOctave: true })).toBe('E2 (Mi)');
    expect(noteLabel(43, { withOctave: true })).toBe('G2 (Sol)');
  });
});
