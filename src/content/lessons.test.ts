import { describe, expect, it } from 'vitest';
import { COURSE } from './course';
import { validateLesson, type Lesson, type LessonStep } from './lessons';

const check: LessonStep = {
  kind: 'check',
  question: 'Open string 3 is…',
  options: ['G (Sol)', 'D (Re)'],
  answer: 'G (Sol)',
  explain: 'Counting from the thinnest: string 1 is E, 2 is B, 3 is G.',
};

/** A sound explain card; override pieces to break it. */
const card = (over: Partial<Extract<LessonStep, { kind: 'explain' }>> = {}): LessonStep => ({
  kind: 'explain',
  headline: 'Six strings, **six names**',
  visual: { kind: 'illustration', name: 'string-order' },
  points: ['Thickest to thinnest: E (Mi), A (La), D (Re), G (Sol), B (Si), E (Mi).'],
  ...over,
});

function lesson(steps: readonly LessonStep[], overrides: Partial<Lesson> = {}): Lesson {
  return { id: 'sample', unit: 'Start here', title: 'Sample', goal: 'Test the validator.', steps, ...overrides };
}

describe('validateLesson', () => {
  it('accepts a sound lesson using every step kind', () => {
    const steps: LessonStep[] = [
      card(),
      { kind: 'fretboard', caption: 'Open strings', fretRange: [0, 3], positions: [{ stringIndex: 0, fret: 0 }] },
      { kind: 'chord', chordId: 'Em-open' },
      { kind: 'riff', riffId: 'chromatic-warmup' },
      { kind: 'riff', riffId: 'open-strings-walk' },
      { kind: 'song', songId: 'ode-to-joy' },
      { kind: 'listen', caption: 'Play these', targets: [{ stringIndex: 5, fret: 3 }] },
      { kind: 'tuner' },
      { kind: 'drill', strings: [0], fretRange: [0, 12], count: 5 },
      check,
    ];
    expect(validateLesson(lesson(steps))).toEqual([]);
  });

  it('rejects a check whose answer is not an option', () => {
    const problems = validateLesson(lesson([{ ...check, answer: 'A (La)' }]));
    expect(problems.join('\n')).toMatch(/not one of its options/);
  });

  it('rejects repeated options and single-option checks', () => {
    expect(validateLesson(lesson([{ ...check, options: ['G (Sol)', 'G (Sol)'] }])).join('\n')).toMatch(/repeats/);
    expect(validateLesson(lesson([{ ...check, options: ['G (Sol)'] }])).join('\n')).toMatch(/two options/);
  });

  it('rejects ids that resolve to nothing', () => {
    const problems = validateLesson(
      lesson([
        { kind: 'chord', chordId: 'H-open' },
        { kind: 'riff', riffId: 'no-such-riff' },
        { kind: 'song', songId: 'no-such-song' },
        check,
      ]),
    ).join('\n');
    expect(problems).toMatch(/unknown chord/);
    expect(problems).toMatch(/unknown riff/);
    expect(problems).toMatch(/unknown song/);
  });

  it('rejects positions off the neck or outside the shown range', () => {
    const problems = validateLesson(
      lesson([
        { kind: 'fretboard', caption: 'x', fretRange: [0, 3], positions: [{ stringIndex: 0, fret: 5 }] },
        { kind: 'listen', caption: 'x', targets: [{ stringIndex: 6, fret: 0 }] },
        check,
      ]),
    ).join('\n');
    expect(problems).toMatch(/outside its fret range/);
    expect(problems).toMatch(/string index 6/);
  });

  it('rejects a lesson that never tests the learner', () => {
    expect(validateLesson(lesson([card()])).join('\n')).toMatch(
      /never tests/,
    );
  });

  it('rejects a bad id and blank fields', () => {
    const problems = validateLesson(lesson([check], { id: 'Bad Id', title: ' ', goal: '' })).join('\n');
    expect(problems).toMatch(/lesson id/);
    expect(problems).toMatch(/title/);
    expect(problems).toMatch(/goal/);
  });

  it('rejects a drill that asks too little or about no real string', () => {
    const problems = validateLesson(
      lesson([{ kind: 'drill', strings: [7], fretRange: [0, 12], count: 1 }]),
    ).join('\n');
    expect(problems).toMatch(/real strings/);
    expect(problems).toMatch(/at least 3/);
  });
});

describe('explain cards', () => {
  it('accepts a sound card with each kind of visual', () => {
    const steps: LessonStep[] = [
      card(),
      card({ visual: { kind: 'neck', fretRange: [0, 3], dots: [{ stringIndex: 0, fret: 3 }], tapToHear: true } }),
      card({ visual: { kind: 'chords', chordIds: ['Am-open', 'A-open'] } }),
      card({ visual: { kind: 'notes', notes: ['E', 'G', 'B'] }, tip: 'Say them out loud.', warn: 'Not **G#**.' }),
      check,
    ];
    expect(validateLesson(lesson(steps))).toEqual([]);
  });

  it('rejects an unknown illustration, chord or note', () => {
    const problems = validateLesson(
      lesson([
        card({ visual: { kind: 'illustration', name: 'nope' as never } }),
        card({ visual: { kind: 'chords', chordIds: ['H-open'] } }),
        card({ visual: { kind: 'notes', notes: ['H'] } }),
        check,
      ]),
    ).join('\n');
    expect(problems).toMatch(/unknown illustration/);
    expect(problems).toMatch(/unknown chord/);
    expect(problems).toMatch(/isn't a note spelling/);
  });

  it('keeps cards short: headline, point count and point length', () => {
    const long = 'x'.repeat(111);
    const problems = validateLesson(
      lesson([card({ headline: 'y'.repeat(49), points: ['a', 'b', 'c', 'd'] }), card({ points: [long] }), check]),
    ).join('\n');
    expect(problems).toMatch(/headline is 49 characters/);
    expect(problems).toMatch(/has 4 points/);
    expect(problems).toMatch(/point 1 is 111 characters/);
  });

  it('keeps the whole card skimmable: a total text budget, and no 3 points with both callouts', () => {
    const point = 'p'.repeat(70);
    const problems = validateLesson(
      lesson([
        card({ points: [point, point, point] }),
        card({ points: ['a', 'b', 'c'], tip: 'tip', warn: 'warn' }),
        check,
      ]),
    ).join('\n');
    expect(problems).toMatch(/carries 210 characters/);
    expect(problems).toMatch(/3 points plus a tip and a warning/);
  });

  it('measures what the reader sees, not the markup', () => {
    const marked = `**${'z'.repeat(108)}**`;
    expect(validateLesson(lesson([card({ points: [marked] }), check]))).toEqual([]);
  });

  it('rejects unbalanced markup', () => {
    expect(validateLesson(lesson([card({ points: ['a **b'] }), check])).join('\n')).toMatch(/unbalanced/);
  });
});

describe('the course', () => {
  it('has only sound lessons', () => {
    expect(COURSE.flatMap((l) => validateLesson(l))).toEqual([]);
  });

  it('never reuses a lesson id', () => {
    const ids = COURSE.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
