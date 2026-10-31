import type { Lesson } from './lessons';

/**
 * The ukulele course, in teaching order. Empty until its lessons are written;
 * the Learn tab says so plainly meanwhile. Lesson ids are unique across every
 * course (progress stores them in one list), so each one starts with `uke-`
 * and names `instrument: 'ukulele'`; `validateLesson` and course.test.ts both
 * hold a lesson here to that.
 */
export const UKULELE_COURSE: readonly Lesson[] = [];
