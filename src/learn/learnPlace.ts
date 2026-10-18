export type LearnSection = 'course' | 'tuner' | 'explore';

/**
 * Where the learner is inside the Learn tab. It lives in the app shell, not in
 * `Learn`, so switching to another tab and back (which unmounts `Learn`)
 * returns to the same section, the same lesson and the same step, and so the
 * Android Back button can close an open lesson.
 */
export type LearnPlace = {
  section: LearnSection;
  /** The open lesson, or null while the course list (or Tuner, Explore) shows. */
  lessonId: string | null;
  /** The step reached in the open lesson. */
  step: number;
  /** Steps of the open lesson whose question was answered, so Next stays unlocked. */
  passed: readonly number[];
};

export const START_PLACE: LearnPlace = { section: 'course', lessonId: null, step: 0, passed: [] };

/** The Course section with `lessonId` open at its first step. */
export function placeAtLesson(lessonId: string): LearnPlace {
  return { section: 'course', lessonId, step: 0, passed: [] };
}

/** The same section with no lesson open. */
export function placeWithoutLesson(place: LearnPlace): LearnPlace {
  return { ...place, lessonId: null, step: 0, passed: [] };
}
