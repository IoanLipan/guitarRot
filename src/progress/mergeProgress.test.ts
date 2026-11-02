import { describe, expect, it } from 'vitest';
import { mergeProgress, syncSignature } from './mergeProgress';
import { migrate } from './migrate';
import { dayStreakFromDays } from './practice';
import { emptyProgressState, type ProgressState, type SrsItem } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A fresh state with some fields filled in. */
function state(patch: Partial<ProgressState> = {}): ProgressState {
  return { ...emptyProgressState(), ...patch };
}

function srsItem(id: string, patch: Partial<SrsItem> = {}): SrsItem {
  return { id, dueAt: 1_000_000, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0, ...patch };
}

/** An item as `reviewSrsItem` leaves it: due `intervalDays` after the moment of the review. */
function reviewed(id: string, at: number, patch: Partial<SrsItem> = {}): SrsItem {
  const intervalDays = patch.intervalDays ?? 1;
  return srsItem(id, { dueAt: at + intervalDays * DAY_MS, intervalDays, ...patch });
}

describe('mergeProgress: field by field', () => {
  it('xp: the bigger total, from either side', () => {
    expect(mergeProgress(state({ xp: 120 }), state({ xp: 450 })).xp).toBe(450);
    expect(mergeProgress(state({ xp: 450 }), state({ xp: 120 })).xp).toBe(450);
  });

  it('lessonsDone: everything from both, this phone’s order first, nothing twice', () => {
    const merged = mergeProgress(
      state({ lessonsDone: ['strings', 'frets', 'tuning'] }),
      state({ lessonsDone: ['frets', 'chords', 'strings', 'strum'] }),
    );
    expect(merged.lessonsDone).toEqual(['strings', 'frets', 'tuning', 'chords', 'strum']);
  });

  it('achievements: every unlock from both, on the earlier date when both have it', () => {
    const merged = mergeProgress(
      state({ achievements: { first: '2026-03-02', streak7: '2026-04-10' } }),
      state({ achievements: { first: '2026-03-01', songs5: '2026-05-05' } }),
    );
    expect(merged.achievements).toEqual({ first: '2026-03-01', streak7: '2026-04-10', songs5: '2026-05-05' });
  });

  it('practiceDays: the union, sorted, once each', () => {
    const merged = mergeProgress(
      state({ practiceDays: ['2026-05-01', '2026-05-03'] }),
      state({ practiceDays: ['2026-05-02', '2026-05-03', '2026-04-20'] }),
    );
    expect(merged.practiceDays).toEqual(['2026-04-20', '2026-05-01', '2026-05-02', '2026-05-03']);
  });

  it('practiceDays: drops days older than a streak can use, counted back from the newest day', () => {
    const merged = mergeProgress(
      state({ practiceDays: ['2024-01-01', '2026-05-01'] }),
      state({ practiceDays: ['2026-05-02'] }),
    );
    expect(merged.practiceDays).toEqual(['2026-05-01', '2026-05-02']);
  });

  it('dayStreak: rebuilt from the union, so days practised on two phones make one streak', () => {
    const phoneA = ['2026-05-01', '2026-05-02', '2026-05-05'];
    const phoneB = ['2026-05-03', '2026-05-04', '2026-05-05'];
    const merged = mergeProgress(
      state({ practiceDays: phoneA, dayStreak: dayStreakFromDays(phoneA) }),
      state({ practiceDays: phoneB, dayStreak: dayStreakFromDays(phoneB) }),
    );
    expect(merged.dayStreak).toEqual({ current: 5, longest: 5, lastDate: '2026-05-05' });
  });

  it('dayStreak: a longest run that is no longer in the days is kept', () => {
    const days = ['2026-05-01'];
    const merged = mergeProgress(
      state({ practiceDays: days, dayStreak: { current: 1, longest: 40, lastDate: '2026-05-01' } }),
      state({ practiceDays: ['2026-05-02'], dayStreak: { current: 1, longest: 3, lastDate: '2026-05-02' } }),
    );
    expect(merged.dayStreak).toEqual({ current: 2, longest: 40, lastDate: '2026-05-02' });
  });

  it('dayStreak: a stored streak with no days behind it is not zeroed', () => {
    const merged = mergeProgress(
      state({ dayStreak: { current: 4, longest: 9, lastDate: '2026-05-03' } }),
      state({ dayStreak: { current: 1, longest: 1, lastDate: '2026-05-01' } }),
    );
    expect(merged.dayStreak).toEqual({ current: 4, longest: 9, lastDate: '2026-05-03' });
  });

  it('streak: longest is the longest, current and last day come from the later side', () => {
    const merged = mergeProgress(
      state({ streak: { current: 3, longest: 12, lastActiveDate: '2026-05-01' } }),
      state({ streak: { current: 5, longest: 8, lastActiveDate: '2026-05-04' } }),
    );
    expect(merged.streak).toEqual({ current: 5, longest: 12, lastActiveDate: '2026-05-04' });
  });

  it('streak: on the same day the longer run is current, and a side that never answered loses', () => {
    const sameDay = mergeProgress(
      state({ streak: { current: 2, longest: 2, lastActiveDate: '2026-05-04' } }),
      state({ streak: { current: 6, longest: 6, lastActiveDate: '2026-05-04' } }),
    );
    expect(sameDay.streak).toEqual({ current: 6, longest: 6, lastActiveDate: '2026-05-04' });

    const never = mergeProgress(state(), state({ streak: { current: 1, longest: 4, lastActiveDate: '2026-05-04' } }));
    expect(never.streak).toEqual({ current: 1, longest: 4, lastActiveDate: '2026-05-04' });
  });

  it('daily: per date, the bigger answered and correct', () => {
    const merged = mergeProgress(
      state({
        daily: {
          '2026-05-01': { date: '2026-05-01', answered: 10, correct: 7 },
          '2026-05-02': { date: '2026-05-02', answered: 4, correct: 4 },
        },
      }),
      state({
        daily: {
          '2026-05-01': { date: '2026-05-01', answered: 12, correct: 6 },
          '2026-05-03': { date: '2026-05-03', answered: 1, correct: 0 },
        },
      }),
    );
    expect(merged.daily).toEqual({
      '2026-05-01': { date: '2026-05-01', answered: 12, correct: 7 },
      '2026-05-02': { date: '2026-05-02', answered: 4, correct: 4 },
      '2026-05-03': { date: '2026-05-03', answered: 1, correct: 0 },
    });
  });

  it('daily: forgets days older than the keep window, counted back from the newest day', () => {
    const merged = mergeProgress(
      state({ daily: { '2024-01-01': { date: '2024-01-01', answered: 3, correct: 3 } } }),
      state({ daily: { '2026-05-03': { date: '2026-05-03', answered: 1, correct: 1 } } }),
    );
    expect(Object.keys(merged.daily)).toEqual(['2026-05-03']);
  });

  it('quizBests: per difficulty, the best of best, stars and runs', () => {
    const a = state();
    const b = state();
    a.quizBests.easy = { best: 80, stars: 2, runs: 5 };
    a.quizBests.hard = { best: 10, stars: 0, runs: 1 };
    b.quizBests.easy = { best: 60, stars: 3, runs: 3 };
    b.quizBests.medium = { best: 45, stars: 1, runs: 2 };
    expect(mergeProgress(a, b).quizBests).toEqual({
      easy: { best: 80, stars: 3, runs: 5 },
      medium: { best: 45, stars: 1, runs: 2 },
      hard: { best: 10, stars: 0, runs: 1 },
    });
  });

  it('songsPlayed: ordered union', () => {
    const merged = mergeProgress(
      state({ songsPlayed: ['song-a', 'song-b'] }),
      state({ songsPlayed: ['song-c', 'song-a', 'song-d'] }),
    );
    expect(merged.songsPlayed).toEqual(['song-a', 'song-b', 'song-c', 'song-d']);
  });

  it('songsToday: the later day’s list; the same day’s lists are joined', () => {
    const later = mergeProgress(
      state({ songsToday: { date: '2026-05-02', ids: ['x'] } }),
      state({ songsToday: { date: '2026-05-03', ids: ['y'] } }),
    );
    expect(later.songsToday).toEqual({ date: '2026-05-03', ids: ['y'] });

    const same = mergeProgress(
      state({ songsToday: { date: '2026-05-03', ids: ['x', 'y'] } }),
      state({ songsToday: { date: '2026-05-03', ids: ['y', 'z'] } }),
    );
    expect(same.songsToday).toEqual({ date: '2026-05-03', ids: ['x', 'y', 'z'] });

    const none = mergeProgress(state(), state({ songsToday: { date: '2026-05-03', ids: ['y'] } }));
    expect(none.songsToday).toEqual({ date: '2026-05-03', ids: ['y'] });
  });

  it('tunedAllDate: the later date, and a date beats never', () => {
    expect(mergeProgress(state({ tunedAllDate: '2026-05-01' }), state({ tunedAllDate: '2026-05-09' })).tunedAllDate).toBe(
      '2026-05-09',
    );
    expect(mergeProgress(state({ tunedAllDate: '2026-05-09' }), state()).tunedAllDate).toBe('2026-05-09');
    expect(mergeProgress(state(), state()).tunedAllDate).toBeNull();
  });

  describe('srs', () => {
    it('keeps items only one side has', () => {
      const merged = mergeProgress(state({ srs: { a: srsItem('a') } }), state({ srs: { b: srsItem('b') } }));
      expect(Object.keys(merged.srs).sort()).toEqual(['a', 'b']);
    });

    it('per item takes the one reviewed more recently, even if it has fewer reps', () => {
      const old = reviewed('a', 1_000 * DAY_MS, { reps: 5, intervalDays: 14 });
      // Reviewed a day later and got it wrong: back to zero reps, but it is the latest word on the item.
      const fresh = reviewed('a', 1_001 * DAY_MS, { reps: 0, intervalDays: 1, lapses: 1 });
      expect(mergeProgress(state({ srs: { a: old } }), state({ srs: { a: fresh } })).srs.a).toMatchObject({
        reps: 0,
        intervalDays: 1,
      });
      expect(mergeProgress(state({ srs: { a: fresh } }), state({ srs: { a: old } })).srs.a).toMatchObject({
        reps: 0,
        intervalDays: 1,
      });
    });

    it('breaks a tie in review time by more reps, then the later due date', () => {
      const at = 2_000 * DAY_MS;
      const fewer = srsItem('a', { dueAt: at + DAY_MS, intervalDays: 1, reps: 1 });
      const more = srsItem('a', { dueAt: at + DAY_MS, intervalDays: 1, reps: 4 });
      expect(mergeProgress(state({ srs: { a: fewer } }), state({ srs: { a: more } })).srs.a?.reps).toBe(4);

      // The same moment and the same reps, but a longer interval ahead: the later due date.
      const short = srsItem('b', { dueAt: at + DAY_MS, intervalDays: 1, reps: 2 });
      const long = srsItem('b', { dueAt: at + 6 * DAY_MS, intervalDays: 6, reps: 2 });
      expect(mergeProgress(state({ srs: { b: short } }), state({ srs: { b: long } })).srs.b?.intervalDays).toBe(6);
      expect(mergeProgress(state({ srs: { b: long } }), state({ srs: { b: short } })).srs.b?.intervalDays).toBe(6);
    });

    it('keeps the larger lapse count, since lapses only go up', () => {
      const older = reviewed('a', 1_000 * DAY_MS, { reps: 3, lapses: 4, intervalDays: 6 });
      const newer = reviewed('a', 1_002 * DAY_MS, { reps: 4, lapses: 1, intervalDays: 6 });
      const merged = mergeProgress(state({ srs: { a: older } }), state({ srs: { a: newer } }));
      expect(merged.srs.a).toMatchObject({ reps: 4, lapses: 4 });
    });
  });

  it('seenContent stays this phone’s own', () => {
    const merged = mergeProgress(state({ seenContent: ['a', 'b'] }), state({ seenContent: ['c', 'd', 'e'] }));
    expect(merged.seenContent).toEqual(['a', 'b']);
  });

  describe('settings', () => {
    const local = (patch: Partial<ProgressState['settings']>) =>
      state({ settings: { ...emptyProgressState().settings, ...patch } });

    it('stay this phone’s own', () => {
      const merged = mergeProgress(
        // Played a little, so not a new phone.
        {
          ...local({ instrument: 'guitar', instrumentChosen: true, toneId: 'clean', preferFlats: true, defaultSpeed: 0.5 }),
          xp: 10,
        },
        local({ instrument: 'ukulele', instrumentChosen: true, toneId: 'acoustic', preferFlats: false, defaultSpeed: 1.5 }),
      );
      expect(merged.settings).toMatchObject({
        instrument: 'guitar',
        toneId: 'clean',
        preferFlats: true,
        defaultSpeed: 0.5,
        instrumentChosen: true,
      });
    });

    it('a phone that has never chosen an instrument takes the account’s instrument and voicings, not its other preferences', () => {
      const fresh = local({ instrumentChosen: false, preferFlats: true, defaultSpeed: 0.75 });
      const account = local({
        instrument: 'ukulele',
        instrumentChosen: true,
        toneId: 'uke-soft',
        toneByInstrument: { guitar: 'clean' },
        preferFlats: false,
        defaultSpeed: 1.25,
      });
      const merged = mergeProgress(fresh, account);
      expect(merged.settings).toEqual({
        instrument: 'ukulele',
        instrumentChosen: true,
        toneId: 'uke-soft',
        toneByInstrument: { guitar: 'clean' },
        preferFlats: true,
        defaultSpeed: 0.75,
      });
    });

    it('a phone that chose a moment ago but has played nothing takes the account’s instrument too', () => {
      const newPhone = local({ instrument: 'guitar', instrumentChosen: true, toneId: 'acoustic' });
      const account = local({ instrument: 'ukulele', instrumentChosen: true, toneId: 'uke-soft' });
      const merged = mergeProgress(newPhone, { ...account, xp: 300, lessonsDone: ['a'] });
      expect(merged.settings).toMatchObject({ instrument: 'ukulele', instrumentChosen: true, toneId: 'uke-soft' });
    });

    it('a phone that has played anything keeps its own instrument', () => {
      const played = { ...local({ instrument: 'guitar', instrumentChosen: true }), xp: 5 };
      const account = { ...local({ instrument: 'ukulele', instrumentChosen: true }), xp: 300 };
      expect(mergeProgress(played, account).settings.instrument).toBe('guitar');
    });

    it('a phone that chose, merged with an account that never did, stays chosen on its own instrument', () => {
      const merged = mergeProgress(
        local({ instrument: 'ukulele', instrumentChosen: true }),
        local({ instrument: 'guitar', instrumentChosen: false }),
      );
      expect(merged.settings).toMatchObject({ instrument: 'ukulele', instrumentChosen: true });
    });

    it('two phones that never chose stay unchosen', () => {
      expect(mergeProgress(local({}), local({})).settings.instrumentChosen).toBe(false);
    });

    it('does not share the shelf of voicings with its input', () => {
      const mine = local({ instrumentChosen: true, toneByInstrument: { ukulele: 'x' } });
      const merged = mergeProgress(mine, local({}));
      merged.settings.toneByInstrument.guitar = 'changed';
      expect(mine.settings.toneByInstrument).toEqual({ ukulele: 'x' });
    });
  });
});

describe('mergeProgress: the whole state', () => {
  it('merging with a fresh state changes nothing that matters', () => {
    const progress = busyState(7);
    expect(mergeProgress(progress, emptyProgressState())).toEqual(progress);
  });

  it('settles the same way whichever way round a new phone and its account are merged', () => {
    const newPhone = { ...emptyProgressState(), settings: { ...emptyProgressState().settings, instrumentChosen: true } };
    const account = busyState(5);
    account.settings = { ...account.settings, instrument: 'ukulele', instrumentChosen: true };
    const once = mergeProgress(newPhone, account);
    expect(once.settings.instrument).toBe('ukulele');
    expect(mergeProgress(account, newPhone).settings.instrument).toBe('ukulele');
    expect(mergeProgress(newPhone, once)).toEqual(once);
  });

  it('merging into a fresh state brings everything over (a new phone signing in)', () => {
    const cloud = busyState(3);
    cloud.settings = { ...cloud.settings, instrument: 'ukulele', instrumentChosen: true };
    const merged = mergeProgress(emptyProgressState(), cloud);
    expect(syncSignature(merged)).toBe(syncSignature(cloud));
    expect(merged.settings.instrument).toBe(cloud.settings.instrument);
  });

  it('does not change either input', () => {
    const [a, b] = [busyState(1), busyState(2)];
    const [copyA, copyB] = [structuredClone(a), structuredClone(b)];
    mergeProgress(a, b);
    expect(a).toEqual(copyA);
    expect(b).toEqual(copyB);
  });

  it('is idempotent: merge(a, merge(a, b)) equals merge(a, b), field for field', () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const messy = seed % 2 === 0;
      const [a, b] = [busyState(seed, messy), busyState(seed * 7919, messy)];
      const once = mergeProgress(a, b);
      expect(mergeProgress(a, once)).toEqual(once);
      expect(mergeProgress(once, b)).toEqual(once);
      expect(mergeProgress(once, once)).toEqual(once);
    }
  });

  it('agrees on everything synced whichever way round the two are merged', () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const messy = seed % 2 === 0;
      const [a, b] = [busyState(seed, messy), busyState(seed * 104_729, messy)];
      expect(syncSignature(mergeProgress(a, b))).toBe(syncSignature(mergeProgress(b, a)));
    }
  });

  it('is associative on everything synced, so any order of merging settles on the same progress', () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const messy = seed % 2 === 0;
      const [a, b, c] = [busyState(seed, messy), busyState(seed * 31, messy), busyState(seed * 977, messy)];
      const left = mergeProgress(mergeProgress(a, b), c);
      const right = mergeProgress(a, mergeProgress(b, c));
      expect(syncSignature(left)).toBe(syncSignature(right));
      expect(syncSignature(mergeProgress(c, mergeProgress(b, a)))).toBe(syncSignature(left));
    }
  });

  it('never loses anything either side had', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const messy = seed % 2 === 0;
      const [a, b] = [busyState(seed, messy), busyState(seed + 5000, messy)];
      const merged = mergeProgress(a, b);
      expect(merged.xp).toBeGreaterThanOrEqual(Math.max(a.xp, b.xp));
      for (const source of [a, b]) {
        for (const id of source.lessonsDone) expect(merged.lessonsDone).toContain(id);
        for (const id of source.songsPlayed) expect(merged.songsPlayed).toContain(id);
        for (const id of Object.keys(source.achievements)) expect(merged.achievements).toHaveProperty(id);
        for (const id of Object.keys(source.srs)) expect(merged.srs).toHaveProperty(id);
        for (const day of source.practiceDays) expect(merged.practiceDays).toContain(day);
        expect(merged.dayStreak.longest).toBeGreaterThanOrEqual(source.dayStreak.longest);
        expect(merged.streak.longest).toBeGreaterThanOrEqual(source.streak.longest);
      }
    }
  });

  it('accepts what migrate makes of garbage from the cloud, and changes nothing for it', () => {
    const mine = busyState(11);
    const garbage: unknown[] = [
      null,
      undefined,
      42,
      'progress',
      [],
      {},
      { version: 99, xp: 5000 },
      { version: 2, xp: 'lots', srs: 5, daily: [], lessonsDone: 'strings', settings: 12, quizBests: { easy: 'x' } },
      { version: 2, practiceDays: ['nope', 3, '2026-13-45'], achievements: { x: 4 }, songsToday: { date: 5 } },
    ];
    for (const raw of garbage) {
      const merged = mergeProgress(mine, migrate(raw));
      expect(syncSignature(merged)).toBe(syncSignature(mine));
      expect(merged.settings).toEqual(mine.settings);
    }
  });
});

describe('syncSignature', () => {
  it('ignores this phone’s own settings, what it has seen, and the order of the lists that are sets', () => {
    const a = busyState(21);
    const b: ProgressState = {
      ...structuredClone(a),
      seenContent: ['somewhere', 'else'],
      lessonsDone: [...a.lessonsDone].reverse(),
      songsPlayed: [...a.songsPlayed].reverse(),
      settings: { ...a.settings, preferFlats: !a.settings.preferFlats, defaultSpeed: 0.25, toneId: 'other' },
    };
    expect(syncSignature(b)).toBe(syncSignature(a));
  });

  it('does not depend on the order object keys were added in', () => {
    const a = state({ achievements: { x: '2026-01-01', y: '2026-01-02' } });
    const b = state({ achievements: { y: '2026-01-02', x: '2026-01-01' } });
    expect(syncSignature(a)).toBe(syncSignature(b));
  });

  it('changes with any progress', () => {
    const base = busyState(9);
    expect(syncSignature({ ...base, xp: base.xp + 1 })).not.toBe(syncSignature(base));
    expect(syncSignature({ ...base, lessonsDone: [...base.lessonsDone, 'extra'] })).not.toBe(syncSignature(base));
    expect(syncSignature({ ...base, tunedAllDate: '2031-01-01' })).not.toBe(syncSignature(base));
  });
});

// --- A deterministic source of varied states ---------------------------------

/** mulberry32: a tiny seeded generator, so a failing seed can be replayed. */
function random(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A varied state for the seed. Normally one that hangs together (the streaks agree with the days and
 * the longest is not shorter than the current); `messy` states do not, which the merge must still cope with.
 */
function busyState(seed: number, messy = false): ProgressState {
  const next = random(seed);
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T,>(items: readonly T[]): T => items[int(items.length)]!;
  const some = <T,>(items: readonly T[]): T[] => items.filter(() => next() < 0.5).sort(() => next() - 0.5);
  const date = () => `2026-0${1 + int(5)}-${String(1 + int(28)).padStart(2, '0')}`;

  const practiceDays = [...new Set(Array.from({ length: int(15) }, date))].sort();
  const sameDay = next() < 0.3 ? date() : '';
  const streakNow = int(8);
  const base = emptyProgressState();

  const srs: Record<string, SrsItem> = {};
  for (const id of some(['n1', 'n2', 'n3', 'n4', 'n5', 'n6'])) {
    const intervalDays = pick([1, 1, 6, 15]);
    srs[id] = {
      id,
      dueAt: (20_000 + int(60)) * DAY_MS + intervalDays * DAY_MS,
      intervalDays,
      ease: pick([1.3, 2, 2.5]),
      reps: int(6),
      lapses: int(4),
    };
  }

  const daily: ProgressState['daily'] = {};
  for (const day of some(practiceDays)) daily[day] = { date: day, answered: 1 + int(20), correct: int(10) };

  const achievements: Record<string, string> = {};
  for (const id of some(['first', 'streak3', 'songs5', 'quiz10'])) achievements[id] = date();

  return {
    ...base,
    xp: int(900),
    lessonsDone: some(['strings', 'frets', 'tuning', 'chords', 'strum', 'rhythm']),
    songsPlayed: some(['s1', 's2', 's3', 's4']),
    practiceDays,
    dayStreak: messy ? { current: int(5), longest: int(30), lastDate: date() } : dayStreakFromDays(practiceDays),
    streak: messy
      ? { current: int(8), longest: int(20), lastActiveDate: next() < 0.2 ? null : date() }
      : { current: streakNow, longest: streakNow + int(10), lastActiveDate: streakNow === 0 ? null : date() },
    daily,
    achievements,
    srs,
    quizBests: {
      easy: { best: int(100), stars: pick([0, 1, 2, 3] as const), runs: int(9) },
      medium: { best: int(100), stars: pick([0, 1, 2, 3] as const), runs: int(9) },
      hard: { best: int(100), stars: pick([0, 1, 2, 3] as const), runs: int(9) },
    },
    songsToday: sameDay === '' ? { date: '', ids: [] } : { date: sameDay, ids: some(['s1', 's2', 's3']) },
    tunedAllDate: next() < 0.4 ? null : date(),
    seenContent: some(['c1', 'c2', 'c3', 'c4']),
    settings: {
      ...base.settings,
      instrument: pick(['guitar', 'ukulele'] as const),
      instrumentChosen: next() < 0.8,
      toneId: pick(['acoustic', 'clean']),
      preferFlats: next() < 0.5,
      toneByInstrument: next() < 0.5 ? { guitar: 'clean' } : {},
    },
  };
}
