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

function lesson(steps: readonly LessonStep[], overrides: Partial<Lesson> = {}): Lesson {
  return { id: 'sample', unit: 'Start here', title: 'Sample', goal: 'Test the validator.', steps, ...overrides };
}

describe('validateLesson', () => {
  it('accepts a sound lesson using every step kind', () => {
    const steps: LessonStep[] = [
      { kind: 'text', body: ['One.', 'Two.'] },
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
    expect(validateLesson(lesson([{ kind: 'text', body: ['Just reading.'] }])).join('\n')).toMatch(
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

describe('the course', () => {
  it('has only sound lessons', () => {
    expect(COURSE.flatMap((l) => validateLesson(l))).toEqual([]);
  });

  it('never reuses a lesson id', () => {
    const ids = COURSE.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
