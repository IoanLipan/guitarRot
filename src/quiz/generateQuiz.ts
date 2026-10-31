import { ALL_CHORDS, chordsFor } from '@/content';
import {
  DEFAULT_INSTRUMENT_ID,
  fretToMidi,
  getInstrument,
  instrumentIdOf,
  noteName,
  type ChordShape,
  type FretPosition,
  type InstrumentId,
  type Tuning,
} from '@/music';
import type { QuizDifficulty } from '@/progress';

export type NoteQuizQuestion = {
  kind: 'note';
  id: string;
  /** The instrument whose neck the dot is on. Absent means the guitar. */
  instrument?: InstrumentId;
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

/** The far end of the neck any note question reaches (the hard difficulty's). */
export const QUIZ_MAX_FRET = 12;

/**
 * What a difficulty asks. Easy stays in open position on natural notes, medium
 * brings in the sharps and the first seven frets, hard has the whole first
 * octave of the neck and six answers to pick from.
 */
export const DIFFICULTY_PROFILES = {
  easy: { fretRange: [0, 3], naturalsOnly: true, optionCount: 4 },
  medium: { fretRange: [0, 7], naturalsOnly: false, optionCount: 4 },
  hard: { fretRange: [0, QUIZ_MAX_FRET], naturalsOnly: false, optionCount: 6 },
} as const satisfies Record<
  QuizDifficulty,
  { fretRange: readonly [number, number]; naturalsOnly: boolean; optionCount: number }
>;

/** The fret windows a question can be drawn on, narrowest first. */
const FRET_WINDOWS: readonly (readonly [number, number])[] = [
  NOTE_QUIZ_FRET_RANGE,
  DIFFICULTY_PROFILES.medium.fretRange,
  DIFFICULTY_PROFILES.hard.fretRange,
];

/** The narrowest window that shows `fret`, so a question rebuilt from its id still shows its own dot. */
function windowCovering(fret: number): [number, number] {
  const [low, high] = FRET_WINDOWS.find(([, end]) => fret <= end) ?? DIFFICULTY_PROFILES.hard.fretRange;
  return [low, high];
}

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

export type NoteQuestionOptions = {
  /** Whose neck the question is on: its strings and its pitches. Defaults to the guitar. */
  instrument?: InstrumentId;
  /** Overrides the instrument's open-string pitches. */
  tuning?: Tuning;
  random?: () => number;
  /** The frets the picture shows, and the generator draws from. Defaults to the Quiz tab's 0 to 5. */
  fretRange?: readonly [number, number];
  /** Wrong answers and the asked note are all natural notes: no sharps anywhere. */
  naturalsOnly?: boolean;
  /** Answers on offer, the right one among them. Defaults to 4. */
  optionCount?: number;
};

const DEFAULT_OPTION_COUNT = 4;

/**
 * The note names nearest to `midi` in pitch, the plausible wrong answers
 * (matches the design handoff's F#/G/G#/A example for a correct answer of G).
 * Gives `count` of them, picked at random from the `count + 1` nearest so the
 * right answer is not always the one in the middle.
 */
function noteDistractors(
  midi: number,
  correctAnswer: string,
  count: number,
  naturalsOnly: boolean,
  random: () => number,
): string[] {
  const nearest: { offset: number; name: string }[] = [];
  for (let distance = 1; distance <= 11 && nearest.length < count + 1; distance += 1) {
    for (const offset of [-distance, distance]) {
      if (nearest.length > count) break;
      const name = noteName(midi + offset);
      if (name === correctAnswer || nearest.some((candidate) => candidate.name === name)) continue;
      if (naturalsOnly && name.includes('#')) continue;
      nearest.push({ offset, name });
    }
  }
  if (nearest.length < count) throw new Error(`No ${count} distractors for ${correctAnswer}`);

  // In pitch order before the shuffle, so a plain four-option question draws exactly as it always has.
  nearest.sort((a, b) => a.offset - b.offset);
  return shuffle(
    nearest.map((candidate) => candidate.name),
    random,
  ).slice(0, count);
}

/**
 * Builds the question for one specific fret.
 *
 * Split out from the random generator so a question can be rebuilt from its
 * own id — that is what makes a quiz card shareable by link.
 */
export function noteQuestionAt(
  stringIndex: number,
  fret: number,
  opts: NoteQuestionOptions = {},
): NoteQuizQuestion {
  const instrument = opts.instrument ?? DEFAULT_INSTRUMENT_ID;
  const tuning = opts.tuning ?? getInstrument(instrument).tuning;
  const random = opts.random ?? Math.random;
  const midi = fretToMidi(tuning, stringIndex, fret);
  const correctAnswer = noteName(midi);
  const distractors = noteDistractors(
    midi,
    correctAnswer,
    (opts.optionCount ?? DEFAULT_OPTION_COUNT) - 1,
    opts.naturalsOnly ?? false,
    random,
  );

  return {
    kind: 'note',
    id: noteQuestionId(instrument, stringIndex, fret),
    // Left off for the guitar so its questions are exactly what they were.
    ...(instrument === DEFAULT_INSTRUMENT_ID ? {} : { instrument }),
    prompt: 'Name this note',
    position: { stringIndex, fret },
    // The Quiz tab's own window when the fret fits it, so its questions are exactly what they were.
    fretRange: opts.fretRange === undefined ? windowCovering(fret) : [opts.fretRange[0], opts.fretRange[1]],
    correctAnswer,
    options: shuffle([correctAnswer, ...distractors], random),
  };
}

/** Every position in the window whose note is a natural one. */
function naturalPositions(tuning: Tuning, [lowFret, highFret]: readonly [number, number]): FretPosition[] {
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < tuning.length; stringIndex += 1) {
    for (let fret = lowFret; fret <= highFret; fret += 1) {
      if (!noteName(fretToMidi(tuning, stringIndex, fret)).includes('#')) found.push({ stringIndex, fret });
    }
  }
  return found;
}

export function generateNoteQuestion(opts: NoteQuestionOptions = {}): NoteQuizQuestion {
  const random = opts.random ?? Math.random;
  const range = opts.fretRange ?? NOTE_QUIZ_FRET_RANGE;
  const [lowFret, highFret] = range;
  const tuning = opts.tuning ?? getInstrument(opts.instrument ?? DEFAULT_INSTRUMENT_ID).tuning;

  if (opts.naturalsOnly === true) {
    // Drawn from the positions that qualify, because most of an open-position
    // neck is natural but a quarter of it is not, and "redraw until natural"
    // would burn an unbounded number of random calls.
    const pool = naturalPositions(tuning, range);
    const pick = pool[Math.floor(random() * pool.length)];
    if (pick === undefined) throw new Error('No natural notes in that fret range');
    return noteQuestionAt(pick.stringIndex, pick.fret, { ...opts, random });
  }

  const stringIndex = Math.floor(random() * tuning.length);
  const fret = lowFret + Math.floor(random() * (highFret - lowFret + 1));
  return noteQuestionAt(stringIndex, fret, { ...opts, random });
}

export type ChordQuestionOptions = {
  /** The chords the other answers are drawn from. Defaults to the instrument's whole library. */
  chords?: readonly ChordShape[];
  /** Whose chords to ask about when `chords` is not given. Defaults to the guitar. */
  instrument?: InstrumentId;
  random?: () => number;
  /** Answers on offer, the right one among them. Defaults to 4. */
  optionCount?: number;
};

/** Builds the question for one specific chord, so it can be rebuilt from its id. */
export function chordQuestionFor(correct: ChordShape, opts: ChordQuestionOptions = {}): ChordQuizQuestion {
  const pool = opts.chords ?? chordsFor(opts.instrument ?? instrumentIdOf(correct));
  const random = opts.random ?? Math.random;
  const optionCount = opts.optionCount ?? DEFAULT_OPTION_COUNT;
  if (pool.length < optionCount) {
    throw new Error(`chordQuestionFor needs a pool of at least ${optionCount} chords`);
  }

  const distractors = shuffle(
    pool.filter((chord) => chord.id !== correct.id),
    random,
  ).slice(0, optionCount - 1);

  return {
    kind: 'chord',
    id: `chord-${correct.id}`,
    prompt: 'Which chord is this?',
    chord: correct,
    correctAnswer: correct.name,
    options: shuffle([correct.name, ...distractors.map((c) => c.name)], random),
  };
}

export function generateChordQuestion(opts: ChordQuestionOptions = {}): ChordQuizQuestion {
  const pool = opts.chords ?? chordsFor(opts.instrument ?? DEFAULT_INSTRUMENT_ID);
  const random = opts.random ?? Math.random;
  const optionCount = opts.optionCount ?? DEFAULT_OPTION_COUNT;
  if (pool.length < optionCount) {
    throw new Error(`generateChordQuestion needs a pool of at least ${optionCount} chords`);
  }

  const [correct] = shuffle(pool, random);
  if (correct === undefined) throw new Error('Empty chord pool');
  return chordQuestionFor(correct, { ...opts, random });
}

/**
 * The chords a difficulty asks about. Easy is the open major and minor chords
 * a beginner meets first; medium adds the sevenths and suspended chords that
 * are still open shapes; hard is everything in the library, barres and power
 * chords included.
 */
export function chordPoolFor(
  difficulty: QuizDifficulty,
  library: readonly ChordShape[] = chordsFor(DEFAULT_INSTRUMENT_ID),
): ChordShape[] {
  switch (difficulty) {
    case 'easy':
      return library.filter((chord) => (chord.quality === 'maj' || chord.quality === 'min') && chord.difficulty <= 2);
    case 'medium':
      return library.filter((chord) => chord.quality !== 'power' && chord.difficulty <= 2);
    case 'hard':
      return [...library];
  }
}

/**
 * One question for a quiz run at this difficulty: a note on the neck or a
 * chord diagram, an even toss up between them. Everything a question carries
 * is as for the free-practice Quiz tab (the right answer among the options,
 * an id the spaced-repetition schedule can use); only the pool and the number
 * of answers change.
 */
export function generateQuestion(
  difficulty: QuizDifficulty,
  opts: { random?: () => number; instrument?: InstrumentId } = {},
): QuizQuestion {
  const random = opts.random ?? Math.random;
  const instrument = opts.instrument ?? DEFAULT_INSTRUMENT_ID;
  const { fretRange, naturalsOnly, optionCount } = DIFFICULTY_PROFILES[difficulty];
  return random() < 0.5
    ? generateNoteQuestion({ random, fretRange, naturalsOnly, optionCount, instrument })
    : generateChordQuestion({ random, chords: chordPoolFor(difficulty, chordsFor(instrument)), optionCount });
}

/**
 * A note question's id: where the dot is, and for any instrument but the
 * guitar, whose neck it is (the same string and fret is a different note on a
 * ukulele). A guitar id is `note-s3f5`; a ukulele's is `note-uke-s3f5`.
 */
function noteQuestionId(instrument: InstrumentId, stringIndex: number, fret: number): string {
  return `note-${instrument === 'ukulele' ? 'uke-' : ''}s${stringIndex}f${fret}`;
}

const NOTE_QUESTION_ID = /^note-(uke-)?s(\d+)f(\d+)$/;

/**
 * Whose question an id names: a note id says so in its name, a chord id by the
 * chord it names. What is not a known id is the guitar's, so nothing is lost.
 */
export function instrumentOfQuestionId(id: string): InstrumentId {
  const note = NOTE_QUESTION_ID.exec(id);
  if (note !== null) return note[1] === undefined ? 'guitar' : 'ukulele';
  const chord = ALL_CHORDS.find((c) => c.id === id.slice('chord-'.length));
  return id.startsWith('chord-') && chord !== undefined ? instrumentIdOf(chord) : 'guitar';
}

/**
 * Rebuilds the question a given quiz id names. Ids are deterministic
 * (fret position or chord id), so this is the one place both sharing and
 * SRS scheduling go to turn a stored id back into a real question. It is
 * not told which difficulty the question was first asked at, so it comes
 * back as the plain four-answer question on the narrowest window that
 * shows its fret.
 */
export function questionForId(id: string): QuizQuestion | null {
  const note = NOTE_QUESTION_ID.exec(id);
  if (note !== null) {
    const instrument: InstrumentId = note[1] === undefined ? 'guitar' : 'ukulele';
    const stringIndex = Number(note[2]);
    const fret = Number(note[3]);
    if (stringIndex >= getInstrument(instrument).tuning.length || fret > QUIZ_MAX_FRET) return null;
    return noteQuestionAt(stringIndex, fret, { instrument });
  }

  if (id.startsWith('chord-')) {
    const chord = ALL_CHORDS.find((c) => c.id === id.slice('chord-'.length));
    return chord === undefined ? null : chordQuestionFor(chord);
  }

  return null;
}
