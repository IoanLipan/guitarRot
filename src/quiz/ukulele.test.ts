import { describe, expect, it } from 'vitest';
import { chordsFor } from '@/content';
import { UKULELE, fretToMidi, noteName } from '@/music';
import { mulberry32 } from '@/feed/generator';
import { explainChordAnswer, explainNoteAnswer } from './explainAnswer';
import {
  DIFFICULTY_PROFILES,
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

describe('the three difficulties on the ukulele', () => {
  const ALL = chordsFor('ukulele');
  const ask = (difficulty: 'easy' | 'medium' | 'hard', count: number, seed: number) => {
    const random = mulberry32(seed);
    return Array.from({ length: count }, () => generateQuestion(difficulty, { random, instrument: 'ukulele' }));
  };
  const notes = (questions: ReturnType<typeof ask>) =>
    questions.flatMap((q) => (q.kind === 'note' ? [q] : []));
  const chords = (questions: ReturnType<typeof ask>) =>
    questions.flatMap((q) => (q.kind === 'chord' ? [q] : []));

  it('easy asks the natural notes in the first four frets, on all four strings, from four answers that are naturals too', () => {
    const questions = notes(ask('easy', 800, 31));
    expect(questions.length).toBeGreaterThan(300);
    expect(DIFFICULTY_PROFILES.easy.fretRange).toEqual([0, 3]);
    for (const q of questions) {
      expect(q.position.fret).toBeLessThanOrEqual(3);
      expect(q.options).toHaveLength(4);
      for (const option of q.options) expect(option, `${q.id}`).not.toContain('#');
    }
    expect(new Set(questions.map((q) => q.position.stringIndex))).toEqual(new Set([0, 1, 2, 3]));
  });

  it('easy asks the core chords: open major and minor shapes on natural roots, and nothing that needs a barre or a stretch', () => {
    const pool = chordPoolFor('easy', ALL).map((chord) => chord.name);
    for (const core of ['C', 'Am', 'F', 'G', 'Em', 'Dm', 'D', 'A']) expect(pool, core).toContain(core);
    for (const hard of ['E', 'Bm', 'Bb', 'F#m', 'G7', 'Am7', 'Asus4', 'Fmaj7']) expect(pool, hard).not.toContain(hard);
    for (const chord of chordPoolFor('easy', ALL)) {
      expect(chord.difficulty).toBeLessThanOrEqual(2);
      expect(['maj', 'min']).toContain(chord.quality);
    }
    for (const q of chords(ask('easy', 300, 32))) {
      expect(pool).toContain(q.correctAnswer);
      expect(q.options).toHaveLength(4);
    }
  });

  it('medium asks every note in the first seven frets, sharps included, and brings in the sevenths and the suspended chords', () => {
    const questions = notes(ask('medium', 1200, 33));
    expect(DIFFICULTY_PROFILES.medium.fretRange).toEqual([0, 7]);
    expect(Math.max(...questions.map((q) => q.position.fret))).toBe(7);
    expect(questions.some((q) => q.correctAnswer.includes('#'))).toBe(true);
    for (const q of questions) expect(q.options).toHaveLength(4);

    const pool = chordPoolFor('medium', ALL).map((chord) => chord.name);
    for (const seventh of ['G7', 'C7', 'A7', 'E7', 'D7', 'Am7', 'Em7', 'Cmaj7']) expect(pool, seventh).toContain(seventh);
    for (const sus of ['Asus4', 'Dsus4']) expect(pool, sus).toContain(sus);
    for (const name of ['E', 'Bm', 'B7', 'Dm7', 'Fmaj7']) expect(pool, name).not.toContain(name);
  });

  it('hard asks the whole first octave of the neck from six answers, and the whole ukulele library', () => {
    const questions = notes(ask('hard', 1500, 34));
    expect(DIFFICULTY_PROFILES.hard.fretRange).toEqual([0, 12]);
    expect(Math.max(...questions.map((q) => q.position.fret))).toBe(12);
    expect(new Set(questions.map((q) => q.position.stringIndex))).toEqual(new Set([0, 1, 2, 3]));
    for (const q of questions) {
      expect(q.options).toHaveLength(6);
      expect(new Set(q.options).size).toBe(6);
    }

    expect(chordPoolFor('hard', ALL)).toHaveLength(ALL.length);
    const names = new Set(chords(ask('hard', 1500, 35)).map((q) => q.correctAnswer));
    // Every shape of the library, the barres and stretches included, comes up.
    expect([...names].sort()).toEqual(ALL.map((chord) => chord.name).sort());
    for (const q of chords(ask('hard', 200, 36))) expect(q.options).toHaveLength(6);
  });

  it('never offers two answers that read the same, at any difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (const q of ask(difficulty, 400, 37)) expect(new Set(q.options).size, `${difficulty} ${q.id}`).toBe(q.options.length);
    }
  });
});

describe('explaining a ukulele note in words', () => {
  it('says which string, counting from the top line of the tab, and names its open note: G is 4, C is 3, E is 2, A is 1', () => {
    const lines = [0, 1, 2, 3].map((stringIndex) => explainNoteAnswer(noteQuestionAt(stringIndex, 3, ukulele), 'B'));
    expect(lines[0]).toContain('String 4 is G (Sol) open, so 3 frets up is A# (La#).');
    expect(lines[1]).toContain('String 3 is C (Do) open, so 3 frets up is D# (Re#).');
    expect(lines[2]).toContain('String 2 is E (Mi) open, so 3 frets up is G (Sol).');
    expect(lines[3]).toContain('String 1 is A (La) open, so 3 frets up is C (Do).');
  });

  it('puts the wrong answer on that string too, a fret count away: the re-entrant G is not the C below it', () => {
    // The C string at its second fret is D; E is two frets further along the same string.
    const q = noteQuestionAt(1, 2, ukulele);
    const line = explainNoteAnswer(q, 'E');
    expect(line).toContain('String 3 is C (Do) open, so 2 frets up is D (Re).');
    expect(line).toContain('E (Mi) is at fret 4 on that string — 2 frets higher.');
  });

  it('explains a ukulele chord with the notes the shape really sounds, from its own tuning', () => {
    const e = chordsFor('ukulele').find((chord) => chord.name === 'E');
    if (e === undefined) throw new Error('no ukulele E');
    const q = { kind: 'chord' as const, id: `chord-${e.id}`, prompt: 'Which chord is this?', chord: e, correctAnswer: 'E', options: ['E', 'Em', 'E7', 'A'] };
    expect(explainChordAnswer(q, 'E')).toBe('E is major: E (Mi), G# (Sol#), B (Si).');
    expect(explainChordAnswer(q, 'Em')).toContain('Em shares the same root but is minor: E (Mi), G (Sol), B (Si).');
  });
});
