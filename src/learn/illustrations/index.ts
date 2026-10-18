import type { IllustrationName } from '@/content';
import { ILLUSTRATIONS_A } from './groupA';
import { ILLUSTRATIONS_B } from './groupB';
import type { Illustration } from './registry';

export type { Illustration, IllustrationSet } from './registry';

const ALL = { ...ILLUSTRATIONS_A, ...ILLUSTRATIONS_B };

/** The drawn component for a name, or undefined if it hasn't been drawn yet. */
export function illustrationFor(name: IllustrationName): Illustration | undefined {
  return ALL[name];
}
