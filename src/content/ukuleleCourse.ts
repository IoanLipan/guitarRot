import type { Lesson } from './lessons';
import { UKE_UNITS } from './course/uke';

/**
 * The ukulele course, in teaching order, written to follow the guitar course's
 * arc on four re-entrant strings (G C E A, the G above the C): meet the
 * instrument, first chords, more chords and rhythm, notes and melody, then the
 * tricks the ukulele is made for. Lesson ids are unique across every course
 * (progress stores them in one list), so each one starts with `uke-` and names
 * `instrument: 'ukulele'`; `validateLesson` and ukuleleCourse.test.ts both
 * hold a lesson here to that.
 *
 * Every musical claim a lesson makes (which fret is which note, which notes are
 * in a chord, which finger goes where) is written down in the matching
 * `course/uke/unitN.facts.ts` and recomputed from the theory core against the
 * ukulele's GCEA tuning by ukuleleCourse.test.ts: a fret that is right on a
 * guitar is not right here, and nothing else would notice.
 */
export const UKULELE_COURSE: readonly Lesson[] = UKE_UNITS.flat();
