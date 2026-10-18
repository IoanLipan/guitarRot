import type { ComponentType } from 'react';
import type { IllustrationName } from '@/content';

/** Every illustration renders full-width, scales with its container, and takes no props. */
export type Illustration = ComponentType;
export type IllustrationSet = Partial<Record<IllustrationName, Illustration>>;
