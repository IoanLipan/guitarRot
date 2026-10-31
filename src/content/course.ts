import { instrumentIdOf, type InstrumentId } from '@/music';
import type { Lesson } from './lessons';
import { UKULELE_COURSE } from './ukuleleCourse';
import { UNIT_1 } from './course/unit1';
import { UNIT_2 } from './course/unit2';
import { UNIT_3 } from './course/unit3';
import { UNIT_4 } from './course/unit4';
import { UNIT_5 } from './course/unit5';
import { UNIT_6 } from './course/unit6';

/**
 * The course, in teaching order: each lesson assumes only what the ones
 * before it taught. Lesson ids are stored in progress, so never rename one
 * that has shipped.
 *
 * Every musical claim a lesson makes (which fret is which note, which notes
 * are in a chord, what a key's I-IV-V is) is written down in the matching
 * `course/unitN.facts.ts` and recomputed from the theory core by
 * `course.test.ts`, because a wrong note here would teach a wrong note and
 * nothing else would notice.
 */
export const COURSE: readonly Lesson[] = [
  ...UNIT_1,
  ...UNIT_2,
  ...UNIT_3,
  ...UNIT_4,
  ...UNIT_5,
  ...UNIT_6,
];

/** Every lesson of every instrument's course. Ids are unique across all of it. */
export const ALL_LESSONS: readonly Lesson[] = [...COURSE, ...UKULELE_COURSE];

/** One instrument's course, in teaching order. */
export function courseFor(instrument: InstrumentId): readonly Lesson[] {
  return ALL_LESSONS.filter((lesson) => instrumentIdOf(lesson) === instrument);
}
