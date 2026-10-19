import { MAX_FRET, STRING_COUNT, parseNoteName, type FretPosition } from '@/music';
import { CHORDS } from './chords';
import { findRiff } from './drills';
import { isIllustrationName, type IllustrationName } from './illustrations';
import { plainText, richProblems } from './rich';
import { SONGS } from './songCatalog';

/** A dot on an explain card's neck picture. Labelled with its note by default. */
export type NeckDot = FretPosition & {
  /** What the dot says: its note name (default), its solfège, a finger number, or any short text. */
  label?: 'note' | 'solfege' | 'none' | string;
};

/**
 * The picture on top of an explain card. Every explain card has one: a
 * screen of words alone is exactly what this app exists to replace.
 */
export type Visual =
  /** A drawn illustration; see src/content/illustrations.ts for what each one shows. */
  | { kind: 'illustration'; name: IllustrationName }
  /** A window of the neck with labelled dots; optionally tap a fret to hear it. */
  | {
      kind: 'neck';
      fretRange: [number, number];
      dots: readonly NeckDot[];
      /** Strings drawn brighter than the rest, e.g. the one the card talks about. */
      highlightStrings?: readonly number[];
      tapToHear?: boolean;
    }
  /** One or more chord diagrams side by side (e.g. Am next to A to compare). */
  | { kind: 'chords'; chordIds: readonly string[] }
  /** A row of big coloured note bubbles: chord tones, scale notes, an alphabet. */
  | { kind: 'notes'; notes: readonly string[] };

/** Length limits, in characters a reader sees (markup excluded). */
export const EXPLAIN_LIMITS = { headline: 48, point: 110, callout: 110, points: 3, total: 200 } as const;

/**
 * One screen of a lesson. A lesson is a short run of these: explain, show,
 * let the learner hear it, have them play it on their own guitar, then check
 * that it stuck. Every fact a step shows (note names, chord tones) is derived
 * from the theory core at render time, never typed into the step — only the
 * prose and the hand-written check questions are authored.
 */
export type LessonStep =
  /**
   * The teaching card: a picture, a short headline, one to three short points,
   * and optionally a tip or a common mistake. Text uses the markup in
   * src/content/rich.ts (**strong**, ==highlight==, and "E (Mi)" note chips).
   */
  | {
      kind: 'explain';
      headline: string;
      visual: Visual;
      points: readonly string[];
      /** 💡 A practical tip. */
      tip?: string;
      /** ⚠️ The mistake almost everyone makes here, and its fix. */
      warn?: string;
    }
  /** @deprecated Being replaced by `explain`; the course must not use it. */
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
      case 'explain':
        problems.push(...explainProblems(where, step));
        break;
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

type ExplainStep = Extract<LessonStep, { kind: 'explain' }>;

function textProblems(where: string, what: string, text: string, limit: number): string[] {
  const problems = richProblems(text).map((p) => `${where} ${what}: ${p}`);
  const plain = plainText(text);
  if (plain.trim() === '') problems.push(`${where} ${what} is empty`);
  if (plain.length > limit) problems.push(`${where} ${what} is ${plain.length} characters; keep it to ${limit}`);
  return problems;
}

function visualProblems(where: string, visual: Visual): string[] {
  switch (visual.kind) {
    case 'illustration':
      return isIllustrationName(visual.name) ? [] : [`${where} names an unknown illustration "${visual.name}"`];
    case 'neck': {
      const bad = rangeProblem(visual.fretRange);
      const problems = bad === null ? [] : [`${where} neck ${bad}`];
      if (visual.dots.length === 0 && (visual.highlightStrings ?? []).length === 0) {
        problems.push(`${where} neck shows nothing: give it dots or highlighted strings`);
      }
      problems.push(...positionProblems(`${where} neck`, visual.dots, bad === null ? visual.fretRange : null));
      for (const s of visual.highlightStrings ?? []) {
        if (!isString(s)) problems.push(`${where} neck highlights string index ${s}, which doesn't exist`);
      }
      return problems;
    }
    case 'chords': {
      const problems = visual.chordIds.length === 0 ? [`${where} chords visual is empty`] : [];
      for (const chordId of visual.chordIds) {
        if (!CHORDS.some((chord) => chord.id === chordId)) problems.push(`${where} names an unknown chord "${chordId}"`);
      }
      return problems;
    }
    case 'notes': {
      const problems = visual.notes.length === 0 ? [`${where} notes visual is empty`] : [];
      for (const note of visual.notes) {
        try {
          parseNoteName(note);
        } catch {
          problems.push(`${where} notes visual has "${note}", which isn't a note spelling`);
        }
      }
      return problems;
    }
  }
}

function explainProblems(where: string, step: ExplainStep): string[] {
  const problems = textProblems(where, 'headline', step.headline, EXPLAIN_LIMITS.headline);
  if (step.points.length === 0 || step.points.length > EXPLAIN_LIMITS.points) {
    problems.push(`${where} has ${step.points.length} points; give it 1 to ${EXPLAIN_LIMITS.points}`);
  }
  step.points.forEach((point, i) => problems.push(...textProblems(where, `point ${i + 1}`, point, EXPLAIN_LIMITS.point)));
  // The whole card has to fit a phone screen under its picture, and be
  // skimmable in a few seconds: about 35 words across points and callouts.
  const total = [...step.points, step.tip ?? '', step.warn ?? ''].map((t) => plainText(t).length).reduce((a, b) => a + b, 0);
  if (total > EXPLAIN_LIMITS.total) {
    problems.push(`${where} carries ${total} characters of text; keep a card to ${EXPLAIN_LIMITS.total} (split it in two)`);
  }
  if (step.tip !== undefined && step.warn !== undefined && step.points.length > 2) {
    problems.push(`${where} has 3 points plus a tip and a warning: too much for one screen`);
  }
  if (step.tip !== undefined) problems.push(...textProblems(where, 'tip', step.tip, EXPLAIN_LIMITS.callout));
  if (step.warn !== undefined) problems.push(...textProblems(where, 'warn', step.warn, EXPLAIN_LIMITS.callout));
  problems.push(...visualProblems(where, step.visual));
  return problems;
}
