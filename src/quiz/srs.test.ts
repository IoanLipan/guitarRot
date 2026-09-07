import { describe, expect, it } from 'vitest';
import { dueSrsIds, reviewSrsItem } from './srs';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('reviewSrsItem', () => {
  it('schedules a new item one day out on its first correct answer', () => {
    const item = reviewSrsItem('note-s0f3', undefined, true, NOW);
    expect(item.reps).toBe(1);
    expect(item.dueAt).toBe(NOW + DAY);
  });

  it('grows the interval as correct answers pile up', () => {
    let item = reviewSrsItem('note-s0f3', undefined, true, NOW);
    item = reviewSrsItem('note-s0f3', item, true, NOW);
    item = reviewSrsItem('note-s0f3', item, true, NOW);
    expect(item.reps).toBe(3);
    expect(item.intervalDays).toBeGreaterThan(6);
  });

  it('resets to tomorrow and lowers ease on a wrong answer', () => {
    const learned = reviewSrsItem('note-s0f3', undefined, true, NOW);
    const missed = reviewSrsItem('note-s0f3', learned, false, NOW);
    expect(missed.reps).toBe(0);
    expect(missed.dueAt).toBe(NOW + DAY);
    expect(missed.ease).toBeLessThan(learned.ease);
    expect(missed.lapses).toBe(1);
  });

  it('never drops ease below the SM-2 floor', () => {
    let item = reviewSrsItem('x', undefined, false, NOW);
    for (let i = 0; i < 10; i += 1) item = reviewSrsItem('x', item, false, NOW);
    expect(item.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe('dueSrsIds', () => {
  it('returns nothing when nothing is due yet', () => {
    const srs = { a: reviewSrsItem('a', undefined, true, NOW) };
    expect(dueSrsIds(srs, NOW)).toEqual([]);
  });

  it('orders the most overdue item first', () => {
    const srs = {
      soon: { id: 'soon', dueAt: NOW - DAY, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 },
      late: { id: 'late', dueAt: NOW - 5 * DAY, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 },
    };
    expect(dueSrsIds(srs, NOW)).toEqual(['late', 'soon']);
  });
});
