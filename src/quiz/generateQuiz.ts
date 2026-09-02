import { CHORDS } from '@/content';
import { STANDARD_TUNING, fretToMidi, noteName, type ChordShape, type FretPosition, type Tuning } from '@/music';

export type NoteQuizQuestion = {
  kind: 'note';
  id: string;
  prompt: string;
  position: FretPosition;
  fretRange: [number, number];
  correctAnswer: string;
  options: string[];
};

export type ChordQuizQuestion = {
  kind: 'chord';
  id: string;
  prompt: string;
  chord: ChordShape;
  correctAnswer: string;
  options: string[];
};

export type QuizQuestion = NoteQuizQuestion | ChordQuizQuestion;

/** Fret window shown for note-ID questions, matching the design handoff. */
export const NOTE_QUIZ_FRET_RANGE: [number, number] = [0, 5];

const STRING_COUNT = 6;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export function generateNoteQuestion(
  opts: { tuning?: Tuning; random?: () => number } = {},
): NoteQuizQuestion {
  const tuning = opts.tuning ?? STANDARD_TUNING;
  const random = opts.random ?? Math.random;
  const [lowFret, highFret] = NOTE_QUIZ_FRET_RANGE;

  const stringIndex = Math.floor(random() * STRING_COUNT);
  const fret = lowFret + Math.floor(random() * (highFret - lowFret + 1));
  const midi = fretToMidi(tuning, stringIndex, fret);
  const correctAnswer = noteName(midi);

  // Chromatic neighbors read as the most plausible wrong answers (matches
  // the design handoff's F#/G/G#/A example for a correct answer of G).
  const distractors: string[] = [];
  for (const offset of shuffle([-2, -1, 1, 2], random)) {
    if (distractors.length === 3) break;
    const name = noteName(midi + offset);
    if (name !== correctAnswer && !distractors.includes(name)) distractors.push(name);
  }

  return {
    kind: 'note',
    id: `note-s${stringIndex}f${fret}`,
    prompt: 'Name this note',
    position: { stringIndex, fret },
    fretRange: NOTE_QUIZ_FRET_RANGE,
    correctAnswer,
    options: shuffle([correctAnswer, ...distractors], random),
  };
}

export function generateChordQuestion(
  opts: { chords?: readonly ChordShape[]; random?: () => number } = {},
): ChordQuizQuestion {
  const pool = opts.chords ?? CHORDS;
  const random = opts.random ?? Math.random;
  if (pool.length < 4) {
    throw new Error('generateChordQuestion needs a pool of at least 4 chords');
  }

  const [correct, ...rest] = shuffle(pool, random);
  if (correct === undefined) throw new Error('Empty chord pool');
  const distractors = rest.slice(0, 3);

  return {
    kind: 'chord',
    id: `chord-${correct.id}`,
    prompt: 'Which chord is this?',
    chord: correct,
    correctAnswer: correct.name,
    options: shuffle([correct.name, ...distractors.map((c) => c.name)], random),
  };
}
