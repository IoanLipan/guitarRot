import { describe, expect, it } from 'vitest';
import { parseRich, plainText, richProblems } from './rich';

describe('parseRich', () => {
  it('finds strong, mark and note tokens in order', () => {
    expect(parseRich('Press **fret 3** ==just behind== the wire: G (Sol).')).toEqual([
      { kind: 'text', text: 'Press ' },
      { kind: 'strong', text: 'fret 3' },
      { kind: 'text', text: ' ' },
      { kind: 'mark', text: 'just behind' },
      { kind: 'text', text: ' the wire: ' },
      { kind: 'note', name: 'G', solfege: 'Sol' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('reads sharps, flats and chord names as notes', () => {
    const notes = parseRich('F# (Fa#), Bb (Sib), Am (La minor), E5 (Mi power chord), G7 (Sol dominant seventh)').filter(
      (t) => t.kind === 'note',
    );
    expect(notes).toEqual([
      { kind: 'note', name: 'F#', solfege: 'Fa#' },
      { kind: 'note', name: 'Bb', solfege: 'Sib' },
      { kind: 'note', name: 'Am', solfege: 'La minor' },
      { kind: 'note', name: 'E5', solfege: 'Mi power chord' },
      { kind: 'note', name: 'G7', solfege: 'Sol dominant seventh' },
    ]);
  });

  it('accepts the non-breaking space the app glues notes with', () => {
    expect(parseRich('E (Mi)')).toEqual([{ kind: 'note', name: 'E', solfege: 'Mi' }]);
  });

  it('leaves ordinary brackets and a lone capital alone', () => {
    expect(parseRich('A string (the second) and I (one)')).toEqual([
      { kind: 'text', text: 'A string (the second) and I (one)' },
    ]);
  });

  it('keeps unbalanced markers as literal text', () => {
    expect(parseRich('a **b')).toEqual([{ kind: 'text', text: 'a **b' }]);
  });
});

describe('plainText', () => {
  it('drops the markers but keeps the words', () => {
    expect(plainText('**fret 3** is ==G (Sol)== and C (Do)')).toBe('fret 3 is G (Sol) and C (Do)');
  });
});

describe('richProblems', () => {
  it('flags stray markers', () => {
    expect(richProblems('ok **fine**')).toEqual([]);
    expect(richProblems('broken **here')).toHaveLength(1);
    expect(richProblems('broken ==here')).toHaveLength(1);
  });
});
