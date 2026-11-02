import { describe, expect, it } from 'vitest';
import {
  addDays,
  emptyProgressState,
  localDateIso,
  PROGRESS_VERSION,
  syncSignature,
  type ProgressState,
} from '@/progress';
import { canonicalProgress, MAX_PROGRESS_CHARS, readRemoteDoc, remoteDocData, toRemoteProgress } from './remoteProgress';

function state(patch: Partial<ProgressState> = {}): ProgressState {
  return { ...emptyProgressState(), ...patch };
}

describe('toRemoteProgress', () => {
  it('is plain JSON data, the same shape as the progress itself', () => {
    const progress = state({ xp: 12, lessonsDone: ['a'], tunedAllDate: null });
    const remote = toRemoteProgress(progress);
    expect(remote).toEqual(JSON.parse(JSON.stringify(progress)));
    expect(JSON.stringify(remote)).not.toContain('undefined');
  });

  it('leaves out undefined values, which Firestore refuses', () => {
    const progress = state({ settings: { ...emptyProgressState().settings, toneByInstrument: { guitar: undefined } } });
    const remote = toRemoteProgress(progress) as { settings: { toneByInstrument: object } };
    expect(remote.settings.toneByInstrument).toEqual({});
  });

  it('drops map keys Firestore would refuse, so one odd id can not stop every save', () => {
    const item = { id: 'x', dueAt: 1, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 };
    const remote = toRemoteProgress(
      state({
        srs: { fine: item, '': item, __reserved__: item },
        achievements: { ok: '2026-01-01', __x__: '2026-01-01' },
      }),
    ) as { srs: object; achievements: object };
    expect(Object.keys(remote.srs)).toEqual(['fine']);
    expect(Object.keys(remote.achievements)).toEqual(['ok']);
  });

  it('trims the two things that can grow without a limit if the document would get near 1 MiB', () => {
    const today = localDateIso(new Date());
    const daily: ProgressState['daily'] = {};
    for (let back = 0; back < 300; back += 1) {
      const date = addDays(today, -back);
      daily[date] = { date, answered: 5, correct: 3 };
    }
    const huge = state({
      daily,
      seenContent: Array.from({ length: 40_000 }, (_, i) => `card-${String(i).padStart(12, '0')}`),
    });
    expect(JSON.stringify(huge).length).toBeGreaterThan(MAX_PROGRESS_CHARS);

    const remote = toRemoteProgress(huge) as { daily: object; seenContent: string[] };
    expect(JSON.stringify(remote).length).toBeLessThan(MAX_PROGRESS_CHARS);
    expect(remote.seenContent).toHaveLength(50);
    expect(Object.keys(remote.daily).length).toBeLessThanOrEqual(61);
  });

  it('does not trim ordinary progress', () => {
    const progress = state({ seenContent: ['a', 'b'], xp: 9 });
    expect(toRemoteProgress(progress)).toMatchObject({ seenContent: ['a', 'b'], xp: 9 });
  });
});

describe('remoteDocData', () => {
  it('is the progress and its schema version, and nothing else (the server adds the time)', () => {
    const data = remoteDocData(state({ xp: 3 }));
    expect(Object.keys(data).sort()).toEqual(['progress', 'schemaVersion']);
    expect(data.schemaVersion).toBe(PROGRESS_VERSION);
    expect(data.progress).toMatchObject({ xp: 3, version: PROGRESS_VERSION });
  });
});

describe('readRemoteDoc', () => {
  it('reads what remoteDocData wrote', () => {
    const progress = state({ xp: 70, lessonsDone: ['strings'], achievements: { first: '2026-03-01' } });
    const read = readRemoteDoc({ ...remoteDocData(progress), updatedAt: 123 });
    expect(read.kind).toBe('progress');
    if (read.kind === 'progress') expect(syncSignature(read.progress)).toBe(syncSignature(progress));
  });

  it.each([undefined, null, 5, 'text', [], {}])('finds nothing in %j', (data) => {
    expect(readRemoteDoc(data)).toEqual({ kind: 'none' });
  });

  it.each([{ progress: 'banana' }, { progress: [1, 2] }, { progress: null }, { schemaVersion: 2 }])(
    'finds nothing in a document whose progress is %j',
    (data) => {
      expect(readRemoteDoc(data)).toEqual({ kind: 'none' });
    },
  );

  it('knows a newer app wrote it, by the document’s version or the progress’s', () => {
    expect(readRemoteDoc({ progress: { version: 2 }, schemaVersion: PROGRESS_VERSION + 1 })).toEqual({ kind: 'newer' });
    expect(readRemoteDoc({ progress: { version: PROGRESS_VERSION + 1 }, schemaVersion: PROGRESS_VERSION })).toEqual({
      kind: 'newer',
    });
  });

  it('turns nonsense inside the progress into a valid, empty-ish state instead of throwing', () => {
    const read = readRemoteDoc({
      progress: { version: 2, xp: 'lots', srs: 7, daily: [], lessonsDone: { a: 1 }, settings: 'x', quizBests: 3 },
      schemaVersion: 2,
    });
    expect(read.kind).toBe('progress');
    if (read.kind === 'progress') {
      expect(read.progress.xp).toBe(0);
      expect(read.progress.lessonsDone).toEqual([]);
      expect(read.progress.srs).toEqual({});
    }
  });

  it('an unknown progress version is read as nothing usable, not trusted', () => {
    const read = readRemoteDoc({ progress: { version: 0, xp: 5 }, schemaVersion: 2 });
    expect(read.kind).toBe('progress');
    if (read.kind === 'progress') expect(read.progress.xp).toBe(0);
  });
});

describe('canonicalProgress', () => {
  it('leaves ordinary progress as it is, as far as syncing can tell', () => {
    const progress = state({
      xp: 40,
      lessonsDone: ['a', 'b'],
      practiceDays: [localDateIso(new Date())],
      achievements: { first: '2026-01-01' },
    });
    expect(syncSignature(canonicalProgress(progress))).toBe(syncSignature(progress));
  });

  it('settles: canonicalising twice is canonicalising once', () => {
    const today = localDateIso(new Date());
    const progress = state({
      xp: 40,
      // Past the window a streak can use: reading prunes it.
      practiceDays: [addDays(today, -500), addDays(today, -2), today],
      daily: { [addDays(today, -800)]: { date: addDays(today, -800), answered: 1, correct: 1 } },
    });
    const once = canonicalProgress(progress);
    expect(once.practiceDays).toEqual([addDays(today, -2), today]);
    expect(syncSignature(canonicalProgress(once))).toBe(syncSignature(once));
  });
});
