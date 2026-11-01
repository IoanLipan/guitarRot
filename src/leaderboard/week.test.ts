import { describe, expect, it } from 'vitest';
import { isoWeekKey, WEEK_KEY } from './week';

const at = (iso: string) => isoWeekKey(new Date(iso));

describe('isoWeekKey', () => {
  it('names an ordinary week', () => {
    expect(at('2026-11-01T12:00:00Z')).toBe('2026-W44'); // a Sunday
    expect(at('2026-11-02T00:00:00Z')).toBe('2026-W45'); // the Monday after
  });

  it('turns the week over at Monday 00:00 UTC, not before', () => {
    expect(at('2026-11-01T23:59:59Z')).toBe('2026-W44');
    expect(at('2026-11-02T00:00:00Z')).toBe('2026-W45');
  });

  it('gives the last days of December to week 1 of the next year when the week has its Thursday there', () => {
    // 1 January 2026 is a Thursday, so 2025-12-29 .. 2026-01-04 is 2026-W01.
    expect(at('2025-12-29T10:00:00Z')).toBe('2026-W01');
    expect(at('2025-12-31T23:59:59Z')).toBe('2026-W01');
    expect(at('2026-01-04T23:59:59Z')).toBe('2026-W01');
    expect(at('2026-01-05T00:00:00Z')).toBe('2026-W02');
  });

  it('gives the first days of January to the old year when the week has its Thursday there', () => {
    // 2027-01-01 is a Friday: it is still the last week of 2026, which has 53 weeks.
    expect(at('2027-01-01T08:00:00Z')).toBe('2026-W53');
    expect(at('2027-01-03T23:59:59Z')).toBe('2026-W53');
    expect(at('2027-01-04T00:00:00Z')).toBe('2027-W01');
    // 2021-01-01 is a Friday too, and 2020 has 53 weeks.
    expect(at('2021-01-01T00:00:00Z')).toBe('2020-W53');
    // 2022-01-01 is a Saturday: the last week of 2021.
    expect(at('2022-01-01T00:00:00Z')).toBe('2021-W52');
  });

  it('counts a 53-week year and a 52-week year correctly', () => {
    expect(at('2020-12-31T12:00:00Z')).toBe('2020-W53');
    expect(at('2019-12-31T12:00:00Z')).toBe('2020-W01');
  });

  it('is the same for any time of day in UTC, whatever the local zone', () => {
    expect(isoWeekKey(new Date(Date.UTC(2026, 10, 1, 23, 30)))).toBe('2026-W44');
    expect(isoWeekKey(new Date(Date.UTC(2026, 10, 2, 0, 30)))).toBe('2026-W45');
  });

  it('always makes a key the rules accept', () => {
    for (let day = 0; day < 800; day += 1) {
      expect(isoWeekKey(new Date(Date.UTC(2025, 0, 1 + day, 13)))).toMatch(WEEK_KEY);
    }
  });
});

describe('WEEK_KEY', () => {
  it('refuses what is not a week', () => {
    for (const bad of ['2026-W00', '2026-W54', '2026-44', '26-W44', '2026-W4', ' 2026-W44', '2026-W44 ', '2026-w44']) {
      expect(WEEK_KEY.test(bad)).toBe(false);
    }
  });
});
