import { getAchievement, type Achievement, type ProgressState } from '@/progress';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-10-12` as "12 Oct 2026". Done by hand: a locale's idea of a short date varies by phone. */
export function formatDay(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1] ?? ''} ${year}`;
}

/** The noun that goes after "9 of 15" for each achievement that counts something. */
const PROGRESS_NOUN: Record<string, string> = {
  'three-units': 'units',
  'whole-course': 'units',
  'streak-10': 'answers in a row',
  'streak-25': 'answers in a row',
  'streak-50': 'answers in a row',
  'runs-5': 'runs',
  'runs-25': 'runs',
  'songs-5': 'songs',
  'songs-15': 'songs',
  'songs-30': 'songs',
  'days-3': 'days',
  'days-7': 'days',
  'days-30': 'days',
  'level-5': 'levels',
  'level-10': 'levels',
};

export type PickProgress = { have: number; need: number; fraction: number; short: string; long: string };

/**
 * How far along a locked pick is, or null for the all-or-nothing ones and the
 * ones that take a single thing: "0 of 1" tells nobody anything.
 */
export function pickProgress(achievement: Achievement, state: ProgressState): PickProgress | null {
  if (achievement.progress === undefined) return null;
  const { have, need } = achievement.progress(state);
  if (need <= 1) return null;
  const noun = PROGRESS_NOUN[achievement.id];
  const short = `${have} of ${need}`;
  return {
    have,
    need,
    fraction: Math.min(1, have / need),
    short,
    long: noun === undefined ? short : `${short} ${noun}`,
  };
}

/** What a screen reader says for a pick in the case: "First song, earned" or "Thirty songs, locked, 9 of 30". */
export function pickLabel(id: string, state: ProgressState): string {
  const achievement = getAchievement(id);
  if (achievement === undefined) return id;
  if (state.achievements[id] !== undefined) return `${achievement.name}, earned`;
  const progress = pickProgress(achievement, state);
  return progress === null
    ? `${achievement.name}, locked`
    : `${achievement.name}, locked, ${progress.short}`;
}
