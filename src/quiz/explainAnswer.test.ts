import { describe, expect, it } from 'vitest';
import { CHORDS } from '@/content';
import { explainAnswer, explainChordAnswer, explainNoteAnswer } from './explainAnswer';
import type { ChordQuizQuestion, NoteQuizQuestion } from './generateQuiz';

function noteQuestion(stringIndex: number, fret: number, correctAnswer: string): NoteQuizQuestion {
  return {
    kind: 'note',
    id: `note-s${stringIndex}f${fret}`,
    prompt: 'Name this note',
    position: { stringIndex, fret },
    fretRange: [0, 5],
    correctAnswer,
    options: [correctAnswer],
  };
}

function chordQuestion(name: string): ChordQuizQuestion {
  const chord = CHORDS.find((c) => c.name === name);
  if (chord === undefined) throw new Error(`no fixture chord ${name}`);
  return {
    kind: 'chord',
    id: `chord-${chord.id}`,
    prompt: 'Which chord is this?',
    chord,
    correctAnswer: chord.name,
    options: [chord.name],
  };
}

describe('explainNoteAnswer', () => {
  it('locates the note from the open string', () => {
    // Low E string (string 6), fret 3 -> G.
    expect(explainNoteAnswer(noteQuestion(0, 3, 'G'), 'G')).toBe(
      'String 6 is E open, so 3 frets up is G.',
    );
  });

  it('uses singular "fret" one fret up', () => {
    expect(explainNoteAnswer(noteQuestion(0, 1, 'F'), 'F')).toBe(
      'String 6 is E open, so 1 fret up is F.',
    );
  });

  it('describes an open string without fret arithmetic', () => {
    expect(explainNoteAnswer(noteQuestion(0, 0, 'E'), 'E')).toBe('String 6 played open is E.');
  });

  it('says where the wrong answer actually sits on the same string', () => {
    // Correct G at fret 3; A is two frets higher at fret 5.
    expect(explainNoteAnswer(noteQuestion(0, 3, 'G'), 'A')).toBe(
      'String 6 is E open, so 3 frets up is G. A is at fret 5 on that string — 2 frets higher.',
    );
  });

  it('reports a wrong answer that sits lower on the string', () => {
    // Correct G at fret 3; F is at fret 1, two frets lower.
    expect(explainNoteAnswer(noteQuestion(0, 3, 'G'), 'F')).toBe(
      'String 6 is E open, so 3 frets up is G. F is at fret 1 on that string — 2 frets lower.',
    );
  });
});

describe('explainChordAnswer', () => {
  it('names the notes the correct shape sounds', () => {
    expect(explainChordAnswer(chordQuestion('Am'), 'Am')).toBe('Am is minor: A, C, E.');
  });

  it('contrasts a wrong chord with a different root', () => {
    expect(explainChordAnswer(chordQuestion('Am'), 'C')).toBe(
      'Am is minor: A, C, E. C is C, E, G.',
    );
  });

  it('calls out a wrong answer that shares the root', () => {
    expect(explainChordAnswer(chordQuestion('Em'), 'E')).toBe(
      'Em is minor: E, G, B. E shares the same root but is major: E, G#, B.',
    );
  });

  it('spells chord tones from the root, not from C', () => {
    // Am's pitch classes sort to C, E, A numerically; the root must lead.
    expect(explainChordAnswer(chordQuestion('Am'), 'Am')).toMatch(/^Am is minor: A, C, E\./);
  });

  it('falls back to the correct line when the picked name is not in the library', () => {
    expect(explainChordAnswer(chordQuestion('Am'), 'Bdim')).toBe('Am is minor: A, C, E.');
  });
});

describe('explainAnswer', () => {
  it('routes note questions to the note explanation', () => {
    expect(explainAnswer(noteQuestion(0, 3, 'G'), 'A')).toContain('fret 5');
  });

  it('routes chord questions to the chord explanation', () => {
    expect(explainAnswer(chordQuestion('Am'), 'C')).toContain('A, C, E');
  });
});
