import type { Lesson } from './lessons';

/**
 * The course, in teaching order: each lesson assumes only what the ones
 * before it taught. Lesson ids are stored in progress, so never rename one
 * that has shipped.
 */
export const COURSE: readonly Lesson[] = [];
