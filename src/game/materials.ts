import type { AchievementCategory, AchievementTier } from '@/progress';

/**
 * The materials a pick is struck in. The numbers here are the same ones as
 * the `--color-*` tokens in index.css (a test keeps them in step); they live
 * in code as well because a celluloid pick mixes its lights and darks from its
 * category colour, which an SVG gradient stop cannot do for itself.
 */

export type PickTier = AchievementTier;

/** The colour of a celluloid pick, by what it was earned for. */
export const CATEGORY_COLOR: Record<AchievementCategory, string> = {
  learn: '#3ddc84',
  quiz: '#5b8cff',
  songs: '#ff6b6b',
  streak: '#ffb020',
  milestone: '#b17cff',
};

/** The heading each group of picks sits under, in the order the case shows them. */
export const CATEGORY_HEADING: Record<AchievementCategory, string> = {
  learn: 'Learning',
  quiz: 'Quiz',
  songs: 'Songs',
  streak: 'Day streaks',
  milestone: 'Milestones',
};

export const CATEGORY_ORDER: readonly AchievementCategory[] = ['learn', 'quiz', 'songs', 'streak', 'milestone'];

/** Stops of the two metal sweeps, light to dark and back, top-left to bottom-right. */
export const STEEL = {
  stops: ['#f1f3f7', '#9aa3b2', '#dfe4ea', '#6e7787'],
  engrave: '#3b404a',
  rim: '#4a5160',
  edge: 'rgba(255,255,255,0.75)',
} as const;

export const GOLD = {
  stops: ['#fff1b8', '#e2b13c', '#a8701a', '#f7d774'],
  engrave: '#6b4410',
  rim: '#7a4f12',
  edge: 'rgba(255,243,196,0.8)',
} as const;

/** Not earned yet: a smoked, empty pick. */
export const LOCKED = {
  fill: '#1a1a22',
  rim: '#2c2c38',
  glyph: '#3a3a48',
} as const;

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16)) as [number, number, number];
}

function toHex(parts: readonly number[]): string {
  return `#${parts.map((part) => Math.round(Math.max(0, Math.min(255, part))).toString(16).padStart(2, '0')).join('')}`;
}

/** `hex` moved `amount` (0 to 1) of the way toward white. */
export function lighten(hex: string, amount: number): string {
  return toHex(channels(hex).map((part) => part + (255 - part) * amount));
}

/** `hex` moved `amount` (0 to 1) of the way toward black. */
export function darken(hex: string, amount: number): string {
  return toHex(channels(hex).map((part) => part * (1 - amount)));
}

/** The material a level's emblem is struck in: plain, then steel from level 5, gold from level 10. */
export function tierForLevel(level: number): PickTier {
  if (level >= 10) return 'gold';
  if (level >= 5) return 'steel';
  return 'celluloid';
}
