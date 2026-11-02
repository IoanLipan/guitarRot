import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntryPatch } from './model';

/** A Firestore that only writes down what it was asked, so the payloads and queries can be read. */
const fake = vi.hoisted(() => {
  const calls: { fn: string; args: unknown[] }[] = [];
  const record = (fn: string, result: unknown = undefined) =>
    vi.fn((...args: unknown[]) => {
      calls.push({ fn, args });
      return typeof result === 'function' ? (result as (...a: unknown[]) => unknown)(...args) : result;
    });
  return {
    calls,
    answer: { docs: [] as { id: string; data: () => unknown }[], fromCache: false, count: 0 },
    sdk: null as unknown,
    record,
  };
});

vi.mock('@/cloud/firebase', () => {
  const { record, answer } = fake;
  fake.sdk = {
    doc: record('doc', (_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
    collection: record('collection', (_db: unknown, path: string) => ({ collection: path })),
    query: record('query', (source: unknown, ...constraints: unknown[]) => ({ source, constraints })),
    where: record('where', (field: string, op: string, value: unknown) => ({ where: [field, op, value] })),
    orderBy: record('orderBy', (field: string, direction: string) => ({ orderBy: [field, direction] })),
    limit: record('limit', (n: number) => ({ limit: n })),
    increment: record('increment', (n: number) => ({ increment: n })),
    serverTimestamp: record('serverTimestamp', 'SERVER_TIME'),
    setDoc: record('setDoc', () => Promise.resolve()),
    updateDoc: record('updateDoc', () => Promise.resolve()),
    deleteDoc: record('deleteDoc', () => Promise.resolve()),
    getDocs: record('getDocs', () => Promise.resolve({ docs: answer.docs, metadata: { fromCache: answer.fromCache } })),
    getCountFromServer: record('getCountFromServer', () => Promise.resolve({ data: () => ({ count: answer.count }) })),
    onSnapshot: record('onSnapshot', (_ref: unknown, _options: unknown, next: (snapshot: unknown) => void) => {
      next({ exists: () => true, data: () => ({ name: 'Ada', level: 3, xp: 340, weekKey: '2026-W44', weekXp: 40, instrument: 'guitar' }), metadata: { hasPendingWrites: true } });
      return () => {};
    }),
  };
  return {
    getFirestoreDb: vi.fn(async () => 'DB'),
    loadFirestoreSdk: vi.fn(async () => fake.sdk),
  };
});

const { fetchBoard, fetchRank, joinBoard, OfflineError, removeEntry, renameEntry, watchOwnEntry, writePatches } = await import('./service');

const last = (fn: string) => fake.calls.filter((call) => call.fn === fn).at(-1)?.args;

beforeEach(() => {
  fake.calls.length = 0;
  fake.answer.docs = [];
  fake.answer.fromCache = false;
  fake.answer.count = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
});

const patch = (week: EntryPatch['week'], xpDelta = 10): EntryPatch => ({ xpDelta, level: 3, instrument: 'guitar', week });

describe('writePatches', () => {
  it('adds to the week with an increment, and to the all-time XP with one too', async () => {
    await writePatches('u1', [patch({ kind: 'add', xp: 10 })]);
    expect(last('doc')).toEqual(['DB', 'leaderboard', 'u1']);
    expect(last('updateDoc')?.[1]).toEqual({
      xp: { increment: 10 },
      level: 3,
      instrument: 'guitar',
      updatedAt: 'SERVER_TIME',
      weekXp: { increment: 10 },
    });
  });

  it('starts a new week with the week key and a plain count, not an increment', async () => {
    await writePatches('u1', [patch({ kind: 'start', weekKey: '2026-W45', xp: 7 }, 7)]);
    expect(last('updateDoc')?.[1]).toEqual({
      xp: { increment: 7 },
      level: 3,
      instrument: 'guitar',
      updatedAt: 'SERVER_TIME',
      weekKey: '2026-W45',
      weekXp: 7,
    });
  });

  it('leaves the week alone when the patch has nothing for it', async () => {
    await writePatches('u1', [patch({ kind: 'none' }, 2000)]);
    const fields = last('updateDoc')?.[1] as Record<string, unknown>;
    expect(Object.keys(fields).sort()).toEqual(['instrument', 'level', 'updatedAt', 'xp']);
  });

  it('sends a catch-up as several writes, in order, all at once', async () => {
    await writePatches('u1', [patch({ kind: 'none' }, 2000), patch({ kind: 'none' }, 2000), patch({ kind: 'none' }, 100)]);
    const sent = fake.calls.filter((call) => call.fn === 'updateDoc').map((call) => (call.args[1] as { xp: { increment: number } }).xp.increment);
    expect(sent).toEqual([2000, 2000, 100]);
  });

  it('does nothing for nothing', async () => {
    await writePatches('u1', []);
    expect(fake.calls).toEqual([]);
  });
});

describe('joining, renaming and leaving', () => {
  it('joins with a clean name, this week, nothing earned in it yet, and the XP they already have', async () => {
    await joinBoard('u1', { name: '  Ada   L ', xp: 340.9, instrument: 'ukulele' });
    expect(last('setDoc')?.[1]).toEqual({
      name: 'Ada L',
      level: 3,
      xp: 340,
      weekKey: '2026-W45',
      weekXp: 0,
      instrument: 'ukulele',
      updatedAt: 'SERVER_TIME',
    });
  });

  it('renames with the time stamped', async () => {
    await renameEntry('u1', ' Countess ');
    expect(last('updateDoc')?.[1]).toEqual({ name: 'Countess', updatedAt: 'SERVER_TIME' });
  });

  it('leaves by deleting the row', async () => {
    await removeEntry('u1');
    expect(last('deleteDoc')?.[0]).toEqual({ path: 'leaderboard/u1' });
  });
});

describe('the lists', () => {
  const stored = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    data: () => ({ name: id, level: 2, xp: 120, weekKey: '2026-W45', weekXp: 20, instrument: 'guitar', ...over }),
  });

  it('asks for the best 25 of this week among those who earned something in it', async () => {
    fake.answer.docs = [stored('Ada')];
    const rows = await fetchBoard('week', '2026-W45');
    expect(rows.map((row) => row.uid)).toEqual(['Ada']);
    expect(last('query')?.slice(1)).toEqual([
      { where: ['weekKey', '==', '2026-W45'] },
      { where: ['weekXp', '>', 0] },
      { orderBy: ['weekXp', 'desc'] },
      { limit: 25 },
    ]);
  });

  it('asks for the best 25 of all time', async () => {
    await fetchBoard('all', '2026-W45');
    expect(last('query')?.slice(1)).toEqual([{ orderBy: ['xp', 'desc'] }, { limit: 25 }]);
  });

  it('skips documents that are not leaderboard rows', async () => {
    fake.answer.docs = [stored('Ada'), stored('bad', { name: 'x' }), stored('worse', { xp: 'lots' })];
    expect((await fetchBoard('all', '2026-W45')).map((row) => row.uid)).toEqual(['Ada']);
  });

  it('will not call an answer from the saved copy a leaderboard', async () => {
    fake.answer.docs = [stored('Ada')];
    fake.answer.fromCache = true;
    await expect(fetchBoard('all', '2026-W45')).rejects.toBeInstanceOf(OfflineError);
  });

  it('counts the players ahead on the server, and adds one', async () => {
    fake.answer.count = 26;
    expect(await fetchRank('week', '2026-W45', 40)).toBe(27);
    expect(last('query')?.slice(1)).toEqual([{ where: ['weekKey', '==', '2026-W45'] }, { where: ['weekXp', '>', 40] }]);
    expect(await fetchRank('all', '2026-W45', 340)).toBe(27);
    expect(last('query')?.slice(1)).toEqual([{ where: ['xp', '>', 340] }]);
  });
});

describe('watchOwnEntry', () => {
  it('reads the row, and says when a write of this phone has not reached the server', async () => {
    const seen = await new Promise<unknown>((resolve) => {
      watchOwnEntry('u1', resolve, () => {});
    });
    expect(seen).toMatchObject({ pending: true, entry: { uid: 'u1', name: 'Ada', xp: 340 } });
    expect(last('onSnapshot')?.[1]).toEqual({ includeMetadataChanges: true });
  });
});
