import type { SrsItem } from '@/progress';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const START_EASE = 2.5;

/** SM-2-lite: right answer pushes the interval out, wrong answer resets it to tomorrow. */
export function reviewSrsItem(id: string, item: SrsItem | undefined, correct: boolean, now: number): SrsItem {
  const prev = item ?? { id, dueAt: now, intervalDays: 0, ease: START_EASE, reps: 0, lapses: 0 };

  if (!correct) {
    return {
      id,
      dueAt: now + ONE_DAY_MS,
      intervalDays: 1,
      ease: Math.max(MIN_EASE, prev.ease - 0.2),
      reps: 0,
      lapses: prev.lapses + 1,
    };
  }

  const reps = prev.reps + 1;
  const ease = Math.min(START_EASE, prev.ease + 0.05);
  const intervalDays = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(prev.intervalDays * ease);

  return { id, dueAt: now + intervalDays * ONE_DAY_MS, intervalDays, ease, reps, lapses: prev.lapses };
}

/** Ids whose review is due, most overdue first — what the feed should quiz next. */
export function dueSrsIds(srs: Record<string, SrsItem>, now: number): string[] {
  return Object.values(srs)
    .filter((item) => item.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .map((item) => item.id);
}
