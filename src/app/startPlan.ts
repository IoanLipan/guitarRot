import { COURSE, type Lesson } from '@/content';

/** What the start screen's learning button should offer. */
export type StartPlan =
  /** Progress has not been read yet, so we do not know whether this is a first run. */
  | { kind: 'loading' }
  /** Nothing done yet: begin at the first lesson. */
  | { kind: 'first'; lesson: Lesson }
  /** Some done: pick up at the first lesson not yet done. */
  | { kind: 'continue'; lesson: Lesson }
  /** Every lesson done: open the course, not a lesson. */
  | { kind: 'finished' };

export function planStart(
  loaded: boolean,
  lessonsDone: readonly string[],
  lessons: readonly Lesson[] = COURSE,
): StartPlan {
  if (!loaded) return { kind: 'loading' };
  const done = new Set(lessonsDone);
  const next = lessons.find((lesson) => !done.has(lesson.id));
  if (next === undefined) return { kind: 'finished' };
  // Ids saved for lessons that no longer exist do not count as progress.
  const anyDone = lessons.some((lesson) => done.has(lesson.id));
  return { kind: anyDone ? 'continue' : 'first', lesson: next };
}

/** The label on the start screen's learning button. */
export function startLabel(plan: StartPlan): string {
  switch (plan.kind) {
    case 'loading':
      return 'Start learning';
    case 'first':
      return 'Start lesson 1';
    case 'continue':
      return `Continue: ${plan.lesson.title}`;
    case 'finished':
      return 'Open the course';
  }
}
