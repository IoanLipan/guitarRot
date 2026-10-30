/**
 * Total XP needed to reach `level`: 50 * L * (L - 1), so L1 is 0, L2 100,
 * L3 300, L4 600, L5 1000 and L10 4500. Each level costs 100 more than the
 * one before: quick enough early on to feel like moving, slower later.
 */
export function xpForLevel(level: number): number {
  const whole = Math.max(1, Math.floor(level));
  return 50 * whole * (whole - 1);
}

/** The level a running XP total has reached. Never below 1. */
export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  // The closed-form root of the curve; the loops absorb any float error at an exact boundary.
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2));
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;
  return level;
}

export type LevelProgress = {
  level: number;
  /** XP earned since this level began. */
  xpIntoLevel: number;
  /** The size of this level's band: what it takes to get from here to the next level. */
  xpForNext: number;
  /** `xpIntoLevel / xpForNext`, from 0 up to (not including) 1: the fill of a progress bar. */
  fraction: number;
};

export function levelProgress(xp: number): LevelProgress {
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const level = levelForXp(safe);
  const xpIntoLevel = safe - xpForLevel(level);
  const xpForNext = xpForLevel(level + 1) - xpForLevel(level);
  return { level, xpIntoLevel, xpForNext, fraction: xpIntoLevel / xpForNext };
}

/** Rank names for levels 1 to 10; every level after that keeps the last. */
export const RANK_TITLES: readonly string[] = [
  'Bedroom Strummer',
  'Chord Collector',
  'Riff Apprentice',
  'Open-Mic Regular',
  'Barre Breaker',
  'Session Hand',
  'Fretboard Navigator',
  'Stage Ready',
  'Headliner',
  'Road Legend',
];

export function rankTitle(level: number): string {
  const index = Math.min(RANK_TITLES.length, Math.max(1, Math.floor(level))) - 1;
  return RANK_TITLES[index] ?? 'Road Legend';
}
