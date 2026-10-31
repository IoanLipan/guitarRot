import { describe, expect, it } from 'vitest';
import { chordsFor } from '@/content';
import { UKULELE, fretToMidi, noteName } from '@/music';
import { mulberry32 } from '@/feed/generator';
import { explainChordAnswer, explainNoteAnswer } from './explainAnswer';
import {
  chordPoolFor,
  generateChordQuestion,
  generateNoteQuestion,
  generateQuestion,
  instrumentOfQuestionId,
  noteQuestionAt,
  questionForId,
} from './generateQuiz';

const ukulele = { instrument: 'ukulele' as const };

describe('note questions on the ukulele', () => {
  it('stay on its four strings, at every difficulty\'s frets', () => {
    const random = mulberry32(7);
    for (let i = 0; i < 400; i += 1) {
      const q = generateNoteQuestion({ ...ukulele, random, fretRange: [0, 12] });
      expect(q.position.stringIndex).toBeGreaterThanOrEqual(0);
      expect(q.position.stringIndex).toBeLessThan(4);
      expect(q.instrument).toBe('ukulele');
    }
  });

  it('use all four strings, not only the first few', () => {
    const random = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i += 1) seen.add(generateNoteQuestion({ ...ukulele, random }).position.stringIndex);
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('name the note the ukulele\'s tuning gives: the open strings are G C E A, string index 3 at fret 3 is C', () => {
    expect([0, 1, 2, 3].map((s) => noteQuestionAt(s, 0, ukulele).correctAnswer)).toEqual(['G', 'C', 'E', 'A']);
    expect(noteQuestionAt(3, 3, ukulele).correctAnswer).toBe('C');
    expect(noteQuestionAt(1, 2, ukulele).correctAnswer).toBe('D');
  });

  it('name every note right: the answer is the pitch of the dot on the ukulele\'s tuning, among the options', () => {
    const random = mulberry32(11);
    for (let i = 0; i < 300; i += 1) {
      const q = generateNoteQuestion({ ...ukulele, random, fretRange: [0, 12] });
      const { stringIndex, fret } = q.position;
      expect(q.correctAnswer).toBe(noteName(fretToMidi(UKULELE.tuning, stringIndex, fret)));
      expect(q.options).toContain(q.correctAnswer);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('keep to natural notes on the easy setting', () => {
    const random = mulberry32(5);
    for (let i = 0; i < 200; i += 1) {
      const q = generateNoteQuestion({ ...ukulele, random, fretRange: [0, 3], naturalsOnly: true });
      expect(q.correctAnswer).not.toContain('#');
    }
  });

  it('are the guitar\'s, exactly, when no instrument is named', () => {
    const q = noteQuestionAt(5, 3);
    expect(q).not.toHaveProperty('instrument');
    expect(q.id).toBe('note-s5f3');
    expect(q.correctAnswer).toBe('G');
  });

  it('say which neck an id is on, so a review is never the other instrument\'s: note-uke-s3f3 is not note-s3f3', () => {
    expect(noteQuestionAt(3, 3, ukulele).id).toBe('note-uke-s3f3');
    expect(noteQuestionAt(3, 3).id).toBe('note-s3f3');
    expect(instrumentOfQuestionId('note-uke-s3f3')).toBe('ukulele');
    expect(instrumentOfQuestionId('note-s3f3')).toBe('guitar');
    expect(instrumentOfQuestionId('chord-uke-Am')).toBe('ukulele');
    expect(instrumentOfQuestionId('chord-Am-open')).toBe('guitar');
    expect(instrumentOfQuestionId('mystery')).toBe('guitar');
  });

  it('rebuild from their ids, on the right neck, and refuse a string the instrument does not have', () => {
    const rebuilt = questionForId('note-uke-s3f3');
    expect(rebuilt).toMatchObject({ kind: 'note', instrument: 'ukulele', correctAnswer: 'C' });
    expect(questionForId('note-uke-s4f0')).toBeNull();
    // A sixth string is the guitar's.
    expect(questionForId('note-s5f3')).toMatchObject({ correctAnswer: 'G' });
  });
});

describe('chord questions on the ukulele', () => {
  it('ask only about ukulele chords, with ukulele chords as the other answers', () => {
    const random = mulberry32(9);
    const library = new Set(chordsFor('ukulele').map((chord) => chord.name));
    for (let i = 0; i < 100; i += 1) {
      const q = generateChordQuestion({ ...ukulele, random });
      expect(q.chord.instrument).toBe('ukulele');
      expect(q.id).toMatch(/^chord-uke-/);
      for (const option of q.options) expect(library.has(option)).toBe(true);
      expect(q.options).toContain(q.chord.name);
    }
  });

  it('have a pool at every difficulty large enough to ask with: easy is open major and minor shapes', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(chordPoolFor(difficulty, chordsFor('ukulele')).length).toBeGreaterThanOrEqual(6);
    }
    const easy = chordPoolFor('easy', chordsFor('ukulele'));
    expect(easy.every((chord) => chord.quality === 'maj' || chord.quality === 'min')).toBe(true);
  });

  it('rebuild from their ids', () => {
    expect(questionForId('chord-uke-Am')).toMatchObject({ kind: 'chord', correctAnswer: 'Am' });
  });
});

describe('a quiz run on the ukulele', () => {
  it('deals note questions on its neck and chord questions from its library, at every difficulty', () => {
    const random = mulberry32(21);
    const names = new Set(chordsFor('ukulele').map((chord) => chord.name));
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (let i = 0; i < 60; i += 1) {
        const q = generateQuestion(difficulty, { random, instrument: 'ukulele' });
        if (q.kind === 'note') {
          expect(q.position.stringIndex).toBeLessThan(4);
          expect(q.instrument).toBe('ukulele');
        } else {
          expect(names.has(q.correctAnswer)).toBe(true);
        }
      }
    }
  });

  it('is the guitar\'s run when no instrument is given', () => {
    const q = generateQuestion('easy', { random: mulberry32(1) });
    if (q.kind === 'note') expect(q).not.toHaveProperty('instrument');
    else expect(q.chord.instrument).toBeUndefined();
  });
});

describe('explaining a ukulele answer', () => {
  it('counts strings from the top line (string 4 is the first index) and finds the notes on its tuning', () => {
    const q = noteQuestionAt(0, 2, ukulele); // the G string, fret 2: A
    expect(q.correctAnswer).toBe('A');
    const wrong = explainNoteAnswer(q, 'B');
    expect(wrong).toContain('String 4 is G (Sol) open, so 2 frets up is A (La).');
    expect(wrong).toContain('B (Si) is at fret 4 on that string');
  });

  it('says a string played open is its own note', () => {
    expect(explainNoteAnswer(noteQuestionAt(1, 0, ukulele), 'C')).toBe('String 3 played open is C (Do).');
  });

  it('names a ukulele chord\'s own tones, and contrasts a wrong answer from the ukulele library', () => {
    const q = generateChordQuestion({ ...ukulele, random: mulberry32(2) });
    const other = chordsFor('ukulele').find((chord) => chord.name !== q.chord.name && chord.root === q.chord.root);
    const line = explainChordAnswer(q, other?.name ?? 'Zz');
    expect(line.startsWith(`${q.chord.name} is `)).toBe(true);
    if (other !== undefined) expect(line).toContain('shares the same root');
  });
});
