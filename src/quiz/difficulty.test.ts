import { describe, expect, it } from 'vitest';
import { CHORDS } from '@/content';
import { STANDARD_TUNING, noteName, withSolfege } from '@/music';
import type { QuizDifficulty } from '@/progress';
import {
  DIFFICULTY_PROFILES,
  NOTE_QUIZ_FRET_RANGE,
  QUIZ_MAX_FRET,
  chordPoolFor,
  chordQuestionFor,
  generateChordQuestion,
  generateQuestion,
  noteQuestionAt,
  questionForId,
  type ChordQuizQuestion,
  type NoteQuizQuestion,
  type QuizQuestion,
} from './generateQuiz';

/** A small deterministic generator: mulberry32. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DRAWS = 1500;

function draws(difficulty: QuizDifficulty): QuizQuestion[] {
  const random = seededRandom(difficulty.length * 977);
  return Array.from({ length: DRAWS }, () => generateQuestion(difficulty, { random }));
}

const notes = (questions: QuizQuestion[]): NoteQuizQuestion[] =>
  questions.filter((question): question is NoteQuizQuestion => question.kind === 'note');
const chords = (questions: QuizQuestion[]): ChordQuizQuestion[] =>
  questions.filter((question): question is ChordQuizQuestion => question.kind === 'chord');

describe('chordQuestionFor and generateChordQuestion: option count', () => {
  it('offer as many options as asked, the right one among them', () => {
    const question = generateChordQuestion({ optionCount: 6, random: seededRandom(3) });
    expect(question.options).toHaveLength(6);
    expect(new Set(question.options).size).toBe(6);
    expect(question.options).toContain(question.correctAnswer);
  });

  it('refuse a pool smaller than the options they must fill', () => {
    expect(() => generateChordQuestion({ chords: CHORDS.slice(0, 5), optionCount: 6 })).toThrow(/at least 6/);
    expect(() => chordQuestionFor(CHORDS[0]!, { chords: CHORDS.slice(0, 5), optionCount: 6 })).toThrow(/at least 6/);
  });
});

describe('noteQuestionAt', () => {
  it('keeps its plain question as it was: four options within two semitones, the Quiz tab window', () => {
    const question = noteQuestionAt(2, 2); // D string, fret 2: E
    expect(question.correctAnswer).toBe('E');
    expect(question.options).toHaveLength(4);
    expect(question.options).toContain('E');
    for (const option of question.options) expect(['D', 'D#', 'E', 'F', 'F#']).toContain(option);
    expect(question.fretRange).toEqual(NOTE_QUIZ_FRET_RANGE);
  });

  it('picks its wrong answers from the nearest notes, and varies which', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed += 1) {
      const question = noteQuestionAt(1, 7, { random: seededRandom(seed) }); // A string, fret 7: E
      for (const option of question.options) seen.add(option);
    }
    // Four options are drawn from E and its four nearest neighbours.
    expect([...seen].sort()).toEqual(['D', 'D#', 'E', 'F', 'F#']);
  });

  it("widens its window to show a fret beyond the Quiz tab's", () => {
    expect(noteQuestionAt(0, 5).fretRange).toEqual([0, 5]);
    expect(noteQuestionAt(0, 6).fretRange).toEqual([0, 7]);
    expect(noteQuestionAt(0, 8).fretRange).toEqual([0, 12]);
    expect(noteQuestionAt(0, 12).fretRange).toEqual([0, 12]);
  });

  it('takes a window given to it as it is', () => {
    expect(noteQuestionAt(0, 2, { fretRange: [0, 3] }).fretRange).toEqual([0, 3]);
  });
});

describe.each(['easy', 'medium', 'hard'] as const)('generateQuestion(%s)', (difficulty) => {
  const questions = draws(difficulty);
  const profile = DIFFICULTY_PROFILES[difficulty];

  it('asks both note and chord questions', () => {
    expect(notes(questions).length).toBeGreaterThan(DRAWS * 0.4);
    expect(chords(questions).length).toBeGreaterThan(DRAWS * 0.4);
  });

  it(`offers ${profile.optionCount} different options with the right answer among them`, () => {
    for (const question of questions) {
      expect(question.options).toHaveLength(profile.optionCount);
      expect(new Set(question.options).size).toBe(profile.optionCount);
      expect(question.options).toContain(question.correctAnswer);
    }
  });

  it('keeps notes inside the fret range, and shows that range', () => {
    const [low, high] = profile.fretRange;
    for (const question of notes(questions)) {
      expect(question.position.fret).toBeGreaterThanOrEqual(low);
      expect(question.position.fret).toBeLessThanOrEqual(high);
      expect(question.position.stringIndex).toBeGreaterThanOrEqual(0);
      expect(question.position.stringIndex).toBeLessThan(6);
      expect(question.fretRange).toEqual([low, high]);
    }
  });

  it('uses every string and a spread of frets', () => {
    const frets = new Set(notes(questions).map((question) => question.position.fret));
    const strings = new Set(notes(questions).map((question) => question.position.stringIndex));
    expect(frets.size).toBeGreaterThanOrEqual(difficulty === 'easy' ? 3 : 8);
    expect(strings.size).toBe(6);
  });

  it('answers a note question with the note that is really there', () => {
    for (const question of notes(questions)) {
      const { stringIndex, fret } = question.position;
      expect(question.correctAnswer).toBe(noteName((STANDARD_TUNING[stringIndex] ?? 0) + fret));
    }
  });

  it('gives every option a solfège label, as the Quiz tab shows them', () => {
    for (const question of notes(questions)) {
      for (const option of question.options) {
        expect(withSolfege(option)).toMatch(/^[A-G]#? \([A-Z][a-z]+#?\)$/);
      }
    }
  });

  it('gives each question an id the schedule can rebuild it from', () => {
    for (const question of questions) {
      const rebuilt = questionForId(question.id);
      expect(rebuilt).not.toBeNull();
      expect(rebuilt?.id).toBe(question.id);
      expect(rebuilt?.correctAnswer).toBe(question.correctAnswer);
      if (question.kind === 'note' && rebuilt?.kind === 'note') {
        // The rebuilt window still shows the dot.
        expect(rebuilt.fretRange[0]).toBeLessThanOrEqual(question.position.fret);
        expect(rebuilt.fretRange[1]).toBeGreaterThanOrEqual(question.position.fret);
      }
    }
  });

  it('draws chords only from its pool', () => {
    const pool = new Set(chordPoolFor(difficulty).map((chord) => chord.name));
    for (const question of chords(questions)) {
      expect(pool.has(question.correctAnswer)).toBe(true);
      for (const option of question.options) expect(pool.has(option)).toBe(true);
    }
  });

  it('is the same question for the same seed', () => {
    const a = generateQuestion(difficulty, { random: seededRandom(5) });
    const b = generateQuestion(difficulty, { random: seededRandom(5) });
    expect(a).toEqual(b);
  });
});

describe('easy questions', () => {
  const questions = draws('easy');

  it('are natural notes only, in the right answer and the wrong ones', () => {
    for (const question of notes(questions)) {
      for (const option of question.options) expect(option).toMatch(/^[A-G]$/);
    }
  });

  it('stay in open position', () => {
    expect(Math.max(...notes(questions).map((question) => question.position.fret))).toBe(3);
  });

  it('use open major and minor chords only, no sevenths, suspensions, barres or power chords', () => {
    const asked = chords(questions).map((question) => question.chord);
    expect(asked.length).toBeGreaterThan(0);
    for (const chord of asked) {
      expect(['maj', 'min']).toContain(chord.quality);
      expect(chord.barre).toBeUndefined();
      expect(chord.difficulty).toBeLessThanOrEqual(2);
    }
    expect(new Set(asked.map((chord) => chord.name))).toEqual(new Set(['E', 'Am', 'D', 'G', 'C', 'Em', 'A', 'Dm']));
  });
});

describe('medium questions', () => {
  const questions = draws('medium');

  it('bring in the sharps and reach the seventh fret', () => {
    const asked = notes(questions);
    expect(asked.some((question) => question.correctAnswer.includes('#'))).toBe(true);
    expect(asked.some((question) => question.options.some((option) => option.includes('#')))).toBe(true);
    expect(Math.max(...asked.map((question) => question.position.fret))).toBe(7);
  });

  it('add the sevenths and suspended chords, still open shapes', () => {
    const qualities = new Set(chords(questions).map((question) => question.chord.quality));
    for (const quality of ['maj', 'min', 'dom7', 'min7', 'maj7', 'sus2', 'sus4'] as const) {
      expect(qualities.has(quality)).toBe(true);
    }
    expect(qualities.has('power')).toBe(false);
    for (const question of chords(questions)) expect(question.chord.difficulty).toBeLessThanOrEqual(2);
  });

  it('have more chords to draw on than easy does', () => {
    expect(chordPoolFor('medium').length).toBeGreaterThan(chordPoolFor('easy').length);
  });
});

describe('hard questions', () => {
  const questions = draws('hard');

  it('reach the twelfth fret and every note', () => {
    const asked = notes(questions);
    expect(Math.max(...asked.map((question) => question.position.fret))).toBe(QUIZ_MAX_FRET);
    expect(new Set(asked.map((question) => question.correctAnswer)).size).toBe(12);
  });

  it('draw on every chord in the library, barres and power chords too', () => {
    expect(new Set(chords(questions).map((question) => question.chord.id))).toEqual(
      new Set(CHORDS.map((chord) => chord.id)),
    );
    expect(chordPoolFor('hard')).toHaveLength(CHORDS.length);
  });

  it('offer six options', () => {
    for (const question of questions) expect(question.options).toHaveLength(6);
  });
});

describe('questionForId', () => {
  it('rebuilds a note question up to the twelfth fret', () => {
    expect(questionForId('note-s0f12')?.correctAnswer).toBe('E');
    expect(questionForId('note-s5f9')).toMatchObject({ kind: 'note', correctAnswer: 'C#' });
  });

  it('does not rebuild a fret past the twelfth, or a string that is not there', () => {
    expect(questionForId('note-s0f13')).toBeNull();
    expect(questionForId('note-s6f0')).toBeNull();
  });

  it('still rebuilds a chord from its id, and refuses one it does not know', () => {
    expect(questionForId('chord-Am-open')).toMatchObject({ kind: 'chord', correctAnswer: 'Am' });
    expect(questionForId('chord-nonsense')).toBeNull();
    expect(questionForId('something-else')).toBeNull();
  });
});
