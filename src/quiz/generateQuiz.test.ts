import { describe, expect, it } from 'vitest';
import { CHORDS } from '@/content';
import { generateChordQuestion, generateNoteQuestion, NOTE_QUIZ_FRET_RANGE } from './generateQuiz';

/** Cycles through a fixed sequence of [0,1) values so tests are deterministic. */
function seeded(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length];
    i += 1;
    if (value === undefined) throw new Error('empty sequence');
    return value;
  };
}

describe('generateNoteQuestion', () => {
  it('picks a position within the note-quiz fret range', () => {
    const question = generateNoteQuestion({ random: seeded([0.99, 0.99, 0.1, 0.2, 0.3, 0.4]) });
    expect(question.position.stringIndex).toBeGreaterThanOrEqual(0);
    expect(question.position.stringIndex).toBeLessThan(6);
    expect(question.position.fret).toBeGreaterThanOrEqual(NOTE_QUIZ_FRET_RANGE[0]);
    expect(question.position.fret).toBeLessThanOrEqual(NOTE_QUIZ_FRET_RANGE[1]);
  });

  it('offers 4 unique options including the correct answer', () => {
    const question = generateNoteQuestion({ random: seeded([0.5, 0.5, 0.1, 0.2, 0.3, 0.4]) });
    expect(question.options).toHaveLength(4);
    expect(new Set(question.options).size).toBe(4);
    expect(question.options).toContain(question.correctAnswer);
  });

  it('derives the correct answer from the tapped fretboard position', () => {
    // String index 0 (low E, open pitch MIDI 40) fret 3 -> MIDI 43 -> G.
    const question = generateNoteQuestion({ random: seeded([0, 0.5]) });
    expect(question.position).toEqual({ stringIndex: 0, fret: 3 });
    expect(question.correctAnswer).toBe('G');
  });
});

describe('generateChordQuestion', () => {
  it('picks a chord from the pool and includes its name as the correct answer', () => {
    const question = generateChordQuestion({ random: seeded([0.1, 0.2, 0.3, 0.4, 0.5]) });
    expect(CHORDS.some((c) => c.name === question.correctAnswer)).toBe(true);
    expect(question.chord.name).toBe(question.correctAnswer);
  });

  it('offers 4 unique options including the correct answer', () => {
    const question = generateChordQuestion({ random: seeded([0.9, 0.1, 0.9, 0.1, 0.9]) });
    expect(question.options).toHaveLength(4);
    expect(new Set(question.options).size).toBe(4);
    expect(question.options).toContain(question.correctAnswer);
  });

  it('throws when the pool has fewer than 4 chords', () => {
    expect(() => generateChordQuestion({ chords: CHORDS.slice(0, 2) })).toThrow();
  });
});
