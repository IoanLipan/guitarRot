import { MAX_FRET, STRING_COUNT, type FretPosition } from '@/music';
import { CHORDS } from './chords';
import { findRiff } from './drills';
import { SONGS } from './songCatalog';

/**
 * One screen of a lesson. A lesson is a short run of these: explain, show,
 * let the learner hear it, have them play it on their own guitar, then check
 * that it stuck. Every fact a step shows (note names, chord tones) is derived
 * from the theory core at render time, never typed into the step — only the
 * prose and the hand-written check questions are authored.
 */
export type LessonStep =
  /** Plain-text paragraphs. Pair every note name with its solfège: "G (Sol)". */
  | { kind: 'text'; title?: string; body: readonly string[] }
  /** Dots on the neck, labelled with their notes; the caption lists them with solfège. */
  | {
      kind: 'fretboard';
      caption: string;
      fretRange: [number, number];
      positions: readonly FretPosition[];
      tapToHear?: boolean;
    }
  /** A chord diagram with a strum button and its tones in solfège. */
  | { kind: 'chord'; chordId: string; caption?: string }
  /** Tab with play/stop, speed and a metronome. Resolves through `findRiff`. */
  | { kind: 'riff'; riffId: string; caption?: string }
  /** The same player, for a song from the catalogue. */
  | { kind: 'song'; songId: string; caption?: string }
  /** Play each target on your own guitar; the microphone checks it. Always skippable. */
  | { kind: 'listen'; caption: string; targets: readonly FretPosition[] }
  | { kind: 'tuner' }
  /** `count` name-this-note questions on the given strings, like the Quiz tab. */
  | { kind: 'drill'; strings: readonly number[]; fretRange: [number, number]; count: number }
  /** A hand-written multiple-choice question; `explain` is shown on a wrong answer. */
  | {
      kind: 'check';
      question: string;
      options: readonly string[];
      answer: string;
      explain: string;
    };

export type LessonStepKind = LessonStep['kind'];

export type Lesson = {
  /** Stable: progress is stored against it. Never rename a shipped id. */
  id: string;
  /** Unit heading the course list groups lessons under. */
  unit: string;
  title: string;
  /** One sentence: what you can do at the end of this lesson. */
  goal: string;
  steps: readonly LessonStep[];
};

/** Step kinds that test the learner. Every lesson must end having asked one. */
const TESTING_KINDS: ReadonlySet<LessonStepKind> = new Set(['check', 'drill', 'listen']);

const LESSON_ID = /^[a-z0-9][a-z0-9-]*$/;

function blank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function isString(stringIndex: number): boolean {
  return Number.isInteger(stringIndex) && stringIndex >= 0 && stringIndex < STRING_COUNT;
}

function rangeProblem(range: readonly [number, number]): string | null {
  const [lo, hi] = range;
  if (!Number.isInteger(lo) || !Number.isInteger(hi)) return 'has a non-integer fret range';
  if (lo < 0 || hi > MAX_FRET || lo > hi) return `has an invalid fret range [${lo}, ${hi}]`;
  return null;
}

function positionProblems(
  where: string,
  positions: readonly FretPosition[],
  range: readonly [number, number] | null,
): string[] {
  const problems: string[] = [];
  for (const { stringIndex, fret } of positions) {
    if (!isString(stringIndex)) {
      problems.push(`${where} names string index ${stringIndex}, which doesn't exist`);
      continue;
    }
    if (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET) {
      problems.push(`${where} names fret ${fret}, which doesn't exist`);
    } else if (range !== null && (fret < range[0] || fret > range[1])) {
      problems.push(`${where} puts fret ${fret} outside its fret range [${range[0]}, ${range[1]}]`);
    }
  }
  return problems;
}

/**
 * Human-readable problems with a lesson; an empty array means it is sound.
 * Lessons are hand-written, so this is the net that stops a typo from
 * pointing at a chord that doesn't exist or a quiz whose answer isn't one of
 * its options.
 */
export function validateLesson(lesson: Lesson): string[] {
  const problems: string[] = [];
  const id = lesson.id;

  if (!LESSON_ID.test(id)) problems.push(`lesson id "${id}" must be lowercase letters, digits and dashes`);
  if (blank(lesson.unit)) problems.push(`${id}: unit must not be blank`);
  if (blank(lesson.title)) problems.push(`${id}: title must not be blank`);
  if (blank(lesson.goal)) problems.push(`${id}: goal must not be blank`);
  if (lesson.steps.length === 0) problems.push(`${id}: has no steps`);

  lesson.steps.forEach((step, index) => {
    const where = `${id} step ${index + 1} (${step.kind})`;
    switch (step.kind) {
      case 'text':
        if (step.body.length === 0 || step.body.some((paragraph) => blank(paragraph))) {
          problems.push(`${where} has an empty paragraph`);
        }
        break;
      case 'fretboard': {
        if (blank(step.caption)) problems.push(`${where} needs a caption`);
        const bad = rangeProblem(step.fretRange);
        if (bad !== null) problems.push(`${where} ${bad}`);
        if (step.positions.length === 0) problems.push(`${where} shows no positions`);
        problems.push(...positionProblems(where, step.positions, bad === null ? step.fretRange : null));
        break;
      }
      case 'chord':
        if (!CHORDS.some((chord) => chord.id === step.chordId)) {
          problems.push(`${where} names an unknown chord "${step.chordId}"`);
        }
        break;
      case 'riff':
        if (findRiff(step.riffId) === undefined) problems.push(`${where} names an unknown riff "${step.riffId}"`);
        break;
      case 'song':
        if (!SONGS.some((song) => song.id === step.songId)) {
          problems.push(`${where} names an unknown song "${step.songId}"`);
        }
        break;
      case 'listen':
        if (blank(step.caption)) problems.push(`${where} needs a caption`);
        if (step.targets.length === 0) problems.push(`${where} has nothing to play`);
        problems.push(...positionProblems(where, step.targets, null));
        break;
      case 'tuner':
        break;
      case 'drill': {
        const bad = rangeProblem(step.fretRange);
        if (bad !== null) problems.push(`${where} ${bad}`);
        if (step.strings.length === 0 || !step.strings.every(isString)) {
          problems.push(`${where} needs real strings to ask about`);
        }
        if (!Number.isInteger(step.count) || step.count < 3) problems.push(`${where} should ask at least 3 questions`);
        break;
      }
      case 'check': {
        if (blank(step.question)) problems.push(`${where} has no question`);
        if (blank(step.explain)) problems.push(`${where} has no explanation for a wrong answer`);
        if (step.options.length < 2) problems.push(`${where} needs at least two options`);
        if (new Set(step.options).size !== step.options.length) problems.push(`${where} repeats an option`);
        if (!step.options.includes(step.answer)) {
          problems.push(`${where}: answer "${step.answer}" is not one of its options`);
        }
        break;
      }
    }
  });

  if (!lesson.steps.some((step) => TESTING_KINDS.has(step.kind))) {
    problems.push(`${id}: never tests the learner (needs a check, drill or listen step)`);
  }

  return problems;
}
