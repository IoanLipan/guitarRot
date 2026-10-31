import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, COURSE, type Lesson } from '@/content';
import { ACHIEVEMENTS, courseUnits, getAchievement, unitsFinished, wholeCourseProgress } from './achievements';
import { emptyProgressState, type ProgressState } from './types';

const step = { kind: 'tuner' as const };
const guitarLesson = (id: string, unit: string): Lesson => ({ id, unit, title: id, goal: id, steps: [step] });
const ukuleleLesson = (id: string, unit: string): Lesson => ({
  id,
  unit,
  title: id,
  goal: id,
  instrument: 'ukulele',
  steps: [step],
});

const withDone = (lessonsDone: string[]): ProgressState => ({ ...emptyProgressState(), lessonsDone });
const earned = (id: string, state: ProgressState) => getAchievement(id)?.earned(state);

describe('course units across courses', () => {
  it('count a unit once per course: two courses that name a unit alike have two units', () => {
    const units = courseUnits([
      guitarLesson('g1', 'Getting started'),
      guitarLesson('g2', 'Getting started'),
      ukuleleLesson('uke-1', 'Getting started'),
    ]);

    expect(units).toEqual([
      { unit: 'Getting started', lessonIds: ['g1', 'g2'] },
      { unit: 'Getting started', lessonIds: ['uke-1'] },
    ]);
  });

  it('are the guitar course\'s units when that is the only course there is', () => {
    expect(courseUnits()).toEqual(courseUnits(COURSE));
    expect(ALL_LESSONS).toEqual(COURSE);
  });

  it('count units finished in any course', () => {
    const lessons = [guitarLesson('g1', 'A'), ukuleleLesson('uke-1', 'A'), ukuleleLesson('uke-2', 'B')];

    expect(unitsFinished(withDone(['g1']), lessons)).toBe(1);
    expect(unitsFinished(withDone(['uke-1']), lessons)).toBe(1);
    expect(unitsFinished(withDone(['g1', 'uke-1', 'uke-2']), lessons)).toBe(3);
  });
});

describe('the course achievements, with the lessons of either course', () => {
  it('first lesson counts any lesson done, a ukulele lesson as much as a guitar one', () => {
    expect(earned('first-lesson', withDone([]))).toBe(false);
    expect(earned('first-lesson', withDone(['uke-chords-c']))).toBe(true);
  });

  it('first unit still needs every lesson of a unit', () => {
    const [first] = courseUnits(COURSE);
    if (first === undefined) throw new Error('no units');
    expect(earned('first-unit', withDone(first.lessonIds.slice(0, -1)))).toBe(false);
    expect(earned('first-unit', withDone(first.lessonIds))).toBe(true);
  });

  it('is not earned by ids that match no lesson', () => {
    expect(earned('first-unit', withDone(['uke-not-a-lesson']))).toBe(false);
    expect(earned('whole-course', withDone(['uke-not-a-lesson']))).toBe(false);
  });

  it('the whole course is the guitar one when only that is written: it needs every unit, and says how far along', () => {
    const all = COURSE.map((lesson) => lesson.id);
    const units = courseUnits(COURSE).length;

    expect(earned('whole-course', withDone(all.slice(0, -1)))).toBe(false);
    expect(earned('whole-course', withDone(all))).toBe(true);
    expect(wholeCourseProgress(withDone([]))).toEqual({ have: 0, need: units });
    expect(getAchievement('whole-course')?.progress?.(withDone([]))).toEqual({ have: 0, need: units });
  });

  it('is not earned by an instrument with no course: nothing written is nothing finished', () => {
    // The ukulele course is empty today; it must not make "every unit of it" vacuously true.
    expect(wholeCourseProgress(withDone([])).need).toBeGreaterThan(0);
    expect(earned('whole-course', emptyProgressState())).toBe(false);
  });
});

describe('the tuner achievement', () => {
  it('is about every string of the instrument, whichever it is, and is earned by a tuned-all date alone', () => {
    const tuned = getAchievement('tuned-up');
    expect(tuned?.howTo).not.toMatch(/six/i);
    expect(tuned?.earned({ ...emptyProgressState(), tunedAllDate: null })).toBe(false);
    expect(tuned?.earned({ ...emptyProgressState(), tunedAllDate: '2026-10-31' })).toBe(true);
  });

  it('keeps every achievement id as it was: unlocks are stored against them', () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toContain('whole-course');
    expect(ACHIEVEMENTS.map((a) => a.id)).toContain('tuned-up');
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
