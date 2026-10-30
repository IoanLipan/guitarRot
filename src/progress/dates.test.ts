import { afterEach, describe, expect, it } from 'vitest';
import { addDays, daysBetween, isIsoDate, localDateIso } from './dates';

describe('localDateIso', () => {
  it('writes the local calendar date, zero padded', () => {
    expect(localDateIso(new Date(2026, 0, 5, 9))).toBe('2026-01-05');
    expect(localDateIso(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('takes the local day, not the UTC one, at the edges of the day', () => {
    expect(localDateIso(new Date(2026, 5, 15, 0, 0, 1))).toBe('2026-06-15');
    expect(localDateIso(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
  });
});

describe('isIsoDate', () => {
  it('accepts real dates, leap day included', () => {
    expect(isIsoDate('2026-10-30')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '26-10-30', '2026-10-3', 'today', '', 20261030, null])(
    'rejects %j',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe('daysBetween', () => {
  it('counts across a month boundary', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetween('2026-04-28', '2026-05-03')).toBe(5);
  });

  it('counts across a year boundary', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('knows February has 29 days in a leap year and 28 otherwise', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
  });

  it('is zero for the same day and negative looking backwards', () => {
    expect(daysBetween('2026-10-30', '2026-10-30')).toBe(0);
    expect(daysBetween('2026-10-30', '2026-10-28')).toBe(-2);
  });

  it('counts whole days through the clock changes, where a day is 23 or 25 hours', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // Europe springs forward on the 29th
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // the US on the 8th
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // Europe falls back on the 25th
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2); // the US on 1 November
  });
});

describe('addDays', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('agrees with daysBetween', () => {
    expect(addDays('2026-10-30', -400)).toBe('2025-09-25');
    expect(daysBetween(addDays('2026-10-30', -400), '2026-10-30')).toBe(400);
  });
});

describe('in a time zone with daylight saving', () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it('still sees consecutive local days as one apart over the spring-forward night', () => {
    process.env.TZ = 'America/New_York';
    // 8 March 2026, 2am: the clocks jump, so that local day is only 23 hours long.
    const saturday = localDateIso(new Date(2026, 2, 7, 23, 30));
    const sunday = localDateIso(new Date(2026, 2, 8, 23, 30));
    const monday = localDateIso(new Date(2026, 2, 9, 0, 30));
    expect([saturday, sunday, monday]).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
    expect(daysBetween(saturday, sunday)).toBe(1);
    expect(daysBetween(sunday, monday)).toBe(1);
  });

  it('and over the fall-back night, when a day is 25 hours', () => {
    process.env.TZ = 'America/New_York';
    const saturday = localDateIso(new Date(2026, 10, 1, 0, 30));
    const sunday = localDateIso(new Date(2026, 10, 1, 23, 30));
    const monday = localDateIso(new Date(2026, 10, 2, 0, 30));
    expect(saturday).toBe('2026-11-01');
    expect(daysBetween(sunday, monday)).toBe(1);
  });
});
