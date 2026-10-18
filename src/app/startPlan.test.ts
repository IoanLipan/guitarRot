import { describe, expect, it } from 'vitest';
import { COURSE } from '@/content';
import { FIXTURE_COURSE } from '@/learn/testkit';
import { planStart, startLabel } from './startPlan';

describe('planStart', () => {
  it('waits for progress to load rather than guessing', () => {
    expect(planStart(false, [], FIXTURE_COURSE)).toEqual({ kind: 'loading' });
    // Even when the (still empty) list of done lessons looks like a first run.
    expect(startLabel(planStart(false, [], FIXTURE_COURSE))).toBe('Start learning');
  });

  it('starts a new learner on the first lesson', () => {
    const plan = planStart(true, [], FIXTURE_COURSE);
    expect(plan).toEqual({ kind: 'first', lesson: FIXTURE_COURSE[0] });
    expect(startLabel(plan)).toBe('Start lesson 1');
  });

  it('continues a returning learner at the first lesson not done, by title', () => {
    const plan = planStart(true, ['alpha'], FIXTURE_COURSE);
    expect(plan).toEqual({ kind: 'continue', lesson: FIXTURE_COURSE[1] });
    expect(startLabel(plan)).toBe('Continue: Beta lesson');
  });

  it('picks the earliest gap, not the lesson after the last one done', () => {
    const plan = planStart(true, ['alpha', 'gamma'], FIXTURE_COURSE);
    expect(plan).toMatchObject({ kind: 'continue', lesson: { id: 'beta' } });
  });

  it('opens the course itself once every lesson is done', () => {
    const plan = planStart(true, ['alpha', 'beta', 'gamma'], FIXTURE_COURSE);
    expect(plan).toEqual({ kind: 'finished' });
    expect(startLabel(plan)).toBe('Open the course');
  });

  it('does not count saved ids that match no lesson as progress', () => {
    expect(planStart(true, ['retired-lesson'], FIXTURE_COURSE).kind).toBe('first');
  });

  it('defaults to the shipped course', () => {
    expect(planStart(true, [])).toEqual({ kind: 'first', lesson: COURSE[0] });
  });
});
