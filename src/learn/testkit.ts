import { vi } from 'vitest';
import { getToneProfile, type AudioEngine } from '@/audio';
import type { Lesson, LessonStep } from '@/content';

/** An engine that records what it is asked to play and makes no sound. */
export function fakeEngine(): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: vi.fn(),
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

export const CHECK: LessonStep = {
  kind: 'check',
  question: 'Which string is the thinnest?',
  options: ['String 1', 'String 6', 'String 3'],
  answer: 'String 1',
  explain: 'String 1 is the thin, high E. String 6 is the thick, low E.',
};

export function lesson(id: string, steps: readonly LessonStep[], overrides: Partial<Lesson> = {}): Lesson {
  return {
    id,
    unit: 'Start here',
    title: `Lesson ${id}`,
    goal: `Goal of ${id}.`,
    steps,
    ...overrides,
  };
}

/** Two short lessons in one unit and one in another, enough to see grouping and "next". */
export const FIXTURE_COURSE: readonly Lesson[] = [
  lesson('alpha', [{ kind: 'text', body: ['Hello.'] }, CHECK], { title: 'Alpha lesson', goal: 'Name the strings.' }),
  lesson('beta', [{ kind: 'text', body: ['Second.'] }, CHECK], { title: 'Beta lesson', goal: 'Tune up.' }),
  lesson('gamma', [{ kind: 'text', body: ['Third.'] }, CHECK], {
    unit: 'Chords',
    title: 'Gamma lesson',
    goal: 'Play a chord.',
  }),
];
