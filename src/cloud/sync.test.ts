import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProgressState, PROGRESS_VERSION, type ProgressState } from '@/progress';
import { remoteDocData } from './remoteProgress';
import { FakeClient, FakeServer, LocalDevice } from './syncKit';
import type { SyncOptions, SyncSession, SyncStatus } from './sync';

// deleteCloudProgress and connectSync reach Firestore through ./firebase; here that is a fake device.
const world = vi.hoisted(() => ({ client: null as unknown as { db: unknown; sdk: unknown } }));
vi.mock('./firebase', () => ({
  getFirestoreDb: async () => world.client.db,
  loadFirestoreSdk: async () => world.client.sdk,
}));

const { connectSync, deleteCloudProgress, startSync } = await import('./sync');

const UID = 'ada';
const PATH = `users/${UID}`;

/** Lets everything that is due by `ms` from now happen, including the promises it starts. */
async function pass(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

function progress(patch: Partial<ProgressState> = {}): ProgressState {
  return { ...emptyProgressState(), settings: { ...emptyProgressState().settings, instrumentChosen: true }, ...patch };
}

/** The document as another phone (or an earlier session) left it. */
function cloudDoc(state: ProgressState, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...remoteDocData(state), updatedAt: 1, ...extra };
}

/** The progress the cloud holds, read back. */
function cloudProgress(server: FakeServer): ProgressState | undefined {
  const doc = server.docs.get(PATH);
  return doc === undefined ? undefined : (doc.progress as ProgressState);
}

/** A phone signed in as Ada with `local` on it, syncing against `server`. Not started until `start()`. */
function phone(server: FakeServer, local: ProgressState = progress(), options: Partial<SyncOptions> = {}) {
  const client = new FakeClient(server);
  const device = new LocalDevice(local);
  const statuses: SyncStatus[] = [];
  return {
    client,
    device,
    statuses,
    start(): SyncSession {
      return startSync({
        uid: UID,
        db: client.db,
        sdk: client.sdk as unknown as SyncOptions['sdk'],
        local: device,
        onStatus: (status) => statuses.push(status),
        ...options,
      });
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('signing in: the first merge', () => {
  it('merges the account into the device and writes the union back', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, cloudDoc(progress({ xp: 500, lessonsDone: ['frets'], achievements: { first: '2026-03-01' } })));
    const p = phone(server, progress({ xp: 120, lessonsDone: ['strings'], songsPlayed: ['s1'] }));
    p.start();
    await pass(1000);

    expect(p.device.state.xp).toBe(500);
    expect(p.device.state.lessonsDone).toEqual(['strings', 'frets']);
    expect(p.device.state.achievements).toEqual({ first: '2026-03-01' });

    const doc = server.docs.get(PATH);
    expect(doc).toMatchObject({ schemaVersion: PROGRESS_VERSION });
    expect(typeof doc?.updatedAt).toBe('number');
    expect(cloudProgress(server)).toMatchObject({ xp: 500, lessonsDone: ['strings', 'frets'], songsPlayed: ['s1'] });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('a new phone with nothing on it just receives the account, and writes nothing', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, cloudDoc(progress({ xp: 900, lessonsDone: ['a', 'b'] })));
    const p = phone(server, emptyProgressState());
    p.start();
    await pass(5000);

    expect(p.device.state).toMatchObject({ xp: 900, lessonsDone: ['a', 'b'] });
    expect(server.accepted).toBe(0);
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('a new account takes the device’s progress; with nothing to take, it creates no document', async () => {
    const server = new FakeServer();
    const full = phone(server, progress({ xp: 40, lessonsDone: ['strings'] }));
    full.start();
    await pass(1000);
    expect(server.accepted).toBe(1);
    expect(cloudProgress(server)).toMatchObject({ xp: 40 });

    const bare = new FakeServer();
    const empty = phone(bare, emptyProgressState());
    empty.start();
    await pass(10_000);
    expect(bare.accepted).toBe(0);
    expect(bare.docs.has(PATH)).toBe(false);
    expect(empty.statuses.at(-1)).toBe('synced');
  });

  it('is saved within a moment when the device and the account already agree, even if told of a change at once', async () => {
    const server = new FakeServer();
    const same = progress({ xp: 70, lessonsDone: ['a'] });
    server.docs.set(PATH, cloudDoc(same));
    const p = phone(server, same);
    const session = p.start();
    // What the app does the moment the sync has started.
    session.localChanged();
    await pass(600);
    expect(p.statuses.at(-1)).toBe('synced');
    expect(server.accepted).toBe(0);
  });

  it('writes nothing when the device already has everything the account has', async () => {
    const server = new FakeServer();
    const same = progress({ xp: 70, lessonsDone: ['a'] });
    server.docs.set(PATH, cloudDoc(same));
    const p = phone(server, { ...same, lessonsDone: ['a'] });
    p.start();
    await pass(10_000);
    expect(server.accepted).toBe(0);
  });

  it('survives an account document full of nonsense, and mends it', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, { progress: { version: 2, xp: 'lots', srs: 5, daily: [], lessonsDone: 'x', settings: 3 }, schemaVersion: 2, updatedAt: 1 });
    const p = phone(server, progress({ xp: 33 }));
    p.start();
    await pass(1000);

    expect(p.device.state.xp).toBe(33);
    expect(cloudProgress(server)).toMatchObject({ xp: 33 });
  });

  it('survives a document whose progress is not even a map', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, { progress: 'banana', schemaVersion: 2, updatedAt: 1 });
    const p = phone(server, progress({ xp: 8 }));
    p.start();
    await pass(1000);
    expect(p.device.state.xp).toBe(8);
    expect(cloudProgress(server)).toMatchObject({ xp: 8 });
  });

  it('leaves progress from a newer version of the app alone, and says so', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, { progress: { version: PROGRESS_VERSION + 1, xp: 99_999 }, schemaVersion: PROGRESS_VERSION + 1, updatedAt: 1 });
    const p = phone(server, progress({ xp: 5 }));
    const session = p.start();
    await pass(1000);
    p.device.play((s) => ({ ...s, xp: 6 }));
    session.localChanged();
    await pass(60_000);

    expect(p.device.state.xp).toBe(6);
    expect(server.accepted).toBe(0);
    expect(p.statuses.at(-1)).toBe('error');
  });
});

describe('local changes', () => {
  it('writes once, a quiet 4 seconds after the last change', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);

    for (let xp = 1; xp <= 5; xp += 1) {
      p.device.play((s) => ({ ...s, xp }));
      session.localChanged();
      await pass(1000);
    }
    expect(server.accepted).toBe(0);
    expect(p.statuses.at(-1)).toBe('syncing');

    await pass(3100);
    expect(server.accepted).toBe(1);
    expect(cloudProgress(server)).toMatchObject({ xp: 5 });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('a phone that is never quiet still writes every 30 seconds', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);

    for (let second = 1; second <= 65; second += 1) {
      p.device.play((s) => ({ ...s, xp: s.xp + 1 }));
      session.localChanged();
      await pass(1000);
    }
    expect(server.accepted).toBeGreaterThanOrEqual(2);
    expect(server.accepted).toBeLessThanOrEqual(3);
  });

  it('flush writes at once; flushing with nothing waiting does nothing', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);

    await session.flush();
    expect(server.accepted).toBe(0);

    p.device.play((s) => ({ ...s, xp: 12 }));
    session.localChanged();
    const flushed = session.flush();
    await pass(0);
    await flushed;
    expect(cloudProgress(server)).toMatchObject({ xp: 12 });
    expect(server.accepted).toBe(1);

    void session.flush();
    await pass(10_000);
    expect(server.accepted).toBe(1);
  });

  it('a flush waits for the server to take the write, but not for ever when offline', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);

    p.client.setOnline(false);
    p.device.play((s) => ({ ...s, xp: 12 }));
    session.localChanged();
    let done = false;
    void session.flush().then(() => {
      done = true;
    });
    await pass(2000);
    expect(done).toBe(false);
    await pass(1500);
    expect(done).toBe(true);
    // Still queued for when the connection returns.
    expect(p.client.queued).toBe(1);
  });

  it('does not write a change that was undone before its turn came', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ xp: 3 }));
    const session = p.start();
    await pass(2000);
    expect(server.accepted).toBe(1);

    const before = p.device.state;
    p.device.play((s) => ({ ...s, xp: 4 }));
    session.localChanged();
    p.device.state = before;
    session.localChanged();
    await pass(60_000);
    expect(server.accepted).toBe(1);
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('does not write for what stays on the device: settings and the feed’s memory', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ xp: 3 }));
    const session = p.start();
    await pass(2000);
    expect(server.accepted).toBe(1);

    p.device.play((s) => ({ ...s, settings: { ...s.settings, toneId: 'clean', preferFlats: true }, seenContent: ['a', 'b'] }));
    session.localChanged();
    await pass(60_000);
    expect(server.accepted).toBe(1);
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('does not write for a different order of the same lessons', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ lessonsDone: ['a', 'b'] }));
    const session = p.start();
    await pass(2000);
    expect(server.accepted).toBe(1);

    p.device.play((s) => ({ ...s, lessonsDone: ['b', 'a'] }));
    session.localChanged();
    await pass(60_000);
    expect(server.accepted).toBe(1);
  });
});

describe('two phones', () => {
  it('another phone’s progress arrives while this one is open, and nothing is written back for it', async () => {
    const server = new FakeServer();
    const mine = phone(server, progress({ xp: 10 }));
    mine.start();
    await pass(2000);
    const writes = server.accepted;

    // The other phone plays and writes; it is not running the engine here, only its write counts.
    const other = new FakeClient(server);
    const played = progress({ xp: 60, lessonsDone: ['rhythm'] });
    void other.sdk.setDoc(other.sdk.doc(null, 'users', UID), {
      ...remoteDocData(played),
      updatedAt: other.sdk.serverTimestamp(),
    });
    await pass(1000);

    expect(mine.device.state).toMatchObject({ xp: 60, lessonsDone: ['rhythm'] });
    expect(mine.statuses.at(-1)).toBe('synced');
    // Only the other phone's one write: this phone had nothing to add.
    expect(server.accepted).toBe(writes + 1);
    await pass(60_000);
    expect(server.accepted).toBe(writes + 1);
  });

  it('phones that played apart both end with the union, and then fall silent', async () => {
    const server = new FakeServer();
    const a = phone(server, progress({ xp: 100, lessonsDone: ['strings'], songsPlayed: ['s1'] }));
    const b = phone(server, progress({ xp: 80, lessonsDone: ['frets'], songsPlayed: ['s2'] }));
    const sessionA = a.start();
    const sessionB = b.start();
    await pass(30_000);

    for (const phoneState of [a.device.state, b.device.state]) {
      expect(phoneState.xp).toBe(100);
      expect([...phoneState.lessonsDone].sort()).toEqual(['frets', 'strings']);
      expect([...phoneState.songsPlayed].sort()).toEqual(['s1', 's2']);
    }
    expect(cloudProgress(server)).toMatchObject({ xp: 100 });

    const settled = server.accepted;
    expect(settled).toBeLessThanOrEqual(4);
    sessionA.localChanged();
    sessionB.localChanged();
    await pass(10 * 60_000);
    expect(server.accepted).toBe(settled);
    expect(a.statuses.at(-1)).toBe('synced');
    expect(b.statuses.at(-1)).toBe('synced');
  });

  it('phones with different settings and list orders do not write to each other for ever', async () => {
    const server = new FakeServer();
    const a = phone(
      server,
      progress({
        xp: 50,
        lessonsDone: ['a', 'b', 'c'],
        settings: { ...progress().settings, instrument: 'guitar', toneId: 'acoustic', preferFlats: true },
        seenContent: ['x'],
      }),
    );
    const b = phone(
      server,
      progress({
        xp: 50,
        lessonsDone: ['c', 'b', 'a', 'd'],
        settings: { ...progress().settings, instrument: 'ukulele', toneId: 'clean', preferFlats: false },
        seenContent: ['y'],
      }),
    );
    a.start();
    b.start();
    await pass(10 * 60_000);

    expect(server.accepted).toBeLessThanOrEqual(4);
    // Each keeps its own settings and its own feed history.
    expect(a.device.state.settings.instrument).toBe('guitar');
    expect(b.device.state.settings.instrument).toBe('ukulele');
    expect(a.device.state.seenContent).toEqual(['x']);
    expect([...a.device.state.lessonsDone].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('stops after a few writes of the same progress if the cloud keeps losing it', async () => {
    const server = new FakeServer();
    // A server that throws the XP away every time.
    server.rewrite = (data) => ({ ...data, progress: { ...(data.progress as object), xp: 0 } });
    const p = phone(server, progress({ xp: 77 }));
    p.start();
    await pass(10 * 60_000);

    expect(server.accepted).toBeLessThanOrEqual(5);
    expect(p.statuses.at(-1)).toBe('error');
    expect(p.device.state.xp).toBe(77);
  });
});

describe('offline', () => {
  it('queues the write while offline, says so, and sends it when the connection is back', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);
    expect(p.statuses.at(-1)).toBe('synced');

    p.client.setOnline(false);
    p.device.play((s) => ({ ...s, xp: 25, lessonsDone: ['strings'] }));
    session.localChanged();
    await pass(5000);

    expect(p.client.queued).toBe(1);
    expect(server.accepted).toBe(0);
    expect(p.statuses.at(-1)).toBe('offline');

    p.client.setOnline(true);
    await pass(1000);
    expect(p.client.queued).toBe(0);
    expect(cloudProgress(server)).toMatchObject({ xp: 25, lessonsDone: ['strings'] });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('being offline with nothing to send is not worth mentioning', async () => {
    const server = new FakeServer();
    const p = phone(server);
    p.start();
    await pass(1000);
    p.client.setOnline(false);
    await pass(1000);
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('starting offline, it holds off writing until the server has been heard from, then merges and writes', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, cloudDoc(progress({ xp: 400, lessonsDone: ['rhythm'] })));
    const p = phone(server, progress({ xp: 10, lessonsDone: ['strings'] }), { offlineAfterMs: 5000 });
    p.client.setOnline(false);
    const session = p.start();
    await pass(1000);
    expect(p.statuses.at(-1)).toBe('syncing');

    p.device.play((s) => ({ ...s, xp: 30 }));
    session.localChanged();
    await pass(10_000);
    // Silence from the server, and something unsent: waiting for a connection.
    expect(p.statuses.at(-1)).toBe('offline');
    expect(p.client.queued).toBe(0);
    expect(server.accepted).toBe(0);

    p.client.setOnline(true);
    await pass(2000);
    expect(p.device.state).toMatchObject({ xp: 400, lessonsDone: ['strings', 'rhythm'] });
    expect(cloudProgress(server)).toMatchObject({ xp: 400, lessonsDone: ['strings', 'rhythm'] });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('even with the account in its cache, an offline phone holds its writes until the server answers', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, cloudDoc(progress({ xp: 100 })));
    const p = phone(server, progress({ xp: 100 }), { offlineAfterMs: 1000 });
    const earlier = p.start();
    await pass(1000);
    earlier.stop();

    // A later session starts with no connection, with the cached account and progress played since.
    p.client.setOnline(false);
    p.device.play((s) => ({ ...s, xp: 150 }));
    const session = p.start();
    session.localChanged();
    await pass(30_000);
    expect(p.client.queued).toBe(0);
    expect(server.accepted).toBe(0);
    expect(p.statuses.at(-1)).toBe('offline');

    p.client.setOnline(true);
    await pass(2000);
    expect(cloudProgress(server)).toMatchObject({ xp: 150 });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('an offline phone cannot overwrite an account it never saw', async () => {
    const server = new FakeServer();
    server.docs.set(PATH, cloudDoc(progress({ xp: 9000 })));
    const p = phone(server, progress({ xp: 1 }), { offlineAfterMs: 1000 });
    p.client.setOnline(false);
    p.start();
    await pass(5 * 60_000);
    expect(server.accepted).toBe(0);
    expect(server.docs.get(PATH)).toMatchObject({ progress: { xp: 9000 } });
  });
});

describe('when Firestore says no', () => {
  it('a refused write shows as an error, is retried later, and goes through once it is allowed', async () => {
    const server = new FakeServer();
    server.refuseWritesWith = 'permission-denied';
    const p = phone(server, progress({ xp: 5 }));
    p.start();
    await pass(1000);
    expect(p.statuses.at(-1)).toBe('error');
    expect(server.accepted).toBe(0);

    server.refuseWritesWith = null;
    await pass(20_000);
    expect(cloudProgress(server)).toMatchObject({ xp: 5 });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('keeps retrying a refused write, further apart each time, and never in a tight loop', async () => {
    const server = new FakeServer();
    server.refuseWritesWith = 'permission-denied';
    const p = phone(server, progress({ xp: 5 }));
    const attempts = vi.spyOn(p.client.sdk, 'setDoc');
    p.start();
    await pass(10 * 60_000);
    expect(attempts.mock.calls.length).toBeGreaterThan(2);
    expect(attempts.mock.calls.length).toBeLessThan(10);
  });

  it('new progress after a failure is tried straight away', async () => {
    const server = new FakeServer();
    server.refuseWritesWith = 'permission-denied';
    const p = phone(server, progress({ xp: 5 }));
    const session = p.start();
    await pass(1000);
    expect(p.statuses.at(-1)).toBe('error');

    server.refuseWritesWith = null;
    p.device.play((s) => ({ ...s, xp: 6 }));
    session.localChanged();
    await pass(5000);
    expect(cloudProgress(server)).toMatchObject({ xp: 6 });
    expect(p.statuses.at(-1)).toBe('synced');
  });

  it('a listener the rules refuse is an error, and is tried again later without a stampede', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ xp: 5 }));
    p.client.listenError = 'permission-denied';
    p.start();
    await pass(1000);
    expect(p.statuses.at(-1)).toBe('error');
    expect(p.client.listensStarted).toBe(1);

    p.client.listenError = null;
    await pass(20_000);
    expect(p.client.listensStarted).toBe(2);
    expect(p.statuses.at(-1)).toBe('synced');
    expect(cloudProgress(server)).toMatchObject({ xp: 5 });
  });
});

describe('stopping', () => {
  it('stop ends the listening and the writing', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);
    p.device.play((s) => ({ ...s, xp: 9 }));
    session.localChanged();
    session.stop();
    await pass(60_000);
    expect(server.accepted).toBe(0);

    // Nor does it listen any more.
    server.docs.set(PATH, cloudDoc(progress({ xp: 500 })));
    p.client.hear(PATH);
    await pass(1000);
    expect(p.device.state.xp).toBe(9);
  });

  it('what is unsent is not lost to a stop: it is merged again at the next sign-in', async () => {
    const server = new FakeServer();
    const p = phone(server);
    const session = p.start();
    await pass(1000);
    p.device.play((s) => ({ ...s, xp: 9 }));
    session.localChanged();
    session.stop();

    const later = phone(server, p.device.state);
    later.start();
    await pass(1000);
    expect(cloudProgress(server)).toMatchObject({ xp: 9 });
  });
});

describe('deleting the account’s progress', () => {
  it('removes the document and does not write it back', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ xp: 30 }));
    world.client = p.client;
    const session = await connectSync({ uid: UID, local: p.device, onStatus: (s) => p.statuses.push(s) });
    await pass(2000);
    expect(server.docs.has(PATH)).toBe(true);

    await deleteCloudProgress(UID);
    expect(server.docs.has(PATH)).toBe(false);

    session.localChanged();
    await pass(10 * 60_000);
    expect(server.docs.has(PATH)).toBe(false);
    session.stop();
  });

  it('works with no session at all, and with no document', async () => {
    const server = new FakeServer();
    const p = phone(server);
    world.client = p.client;
    await expect(deleteCloudProgress(UID)).resolves.toBeUndefined();
  });

  it('fails when it can not delete, and syncing carries on', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ xp: 30 }));
    world.client = p.client;
    const session = await connectSync({ uid: UID, local: p.device, onStatus: (s) => p.statuses.push(s) });
    await pass(2000);

    server.refuseWritesWith = 'permission-denied';
    await expect(deleteCloudProgress(UID)).rejects.toMatchObject({ code: 'permission-denied' });
    server.refuseWritesWith = null;

    p.device.play((s) => ({ ...s, xp: 31 }));
    session.localChanged();
    await pass(6000);
    expect(cloudProgress(server)).toMatchObject({ xp: 31 });
    session.stop();
  });

  it('gives up with an error when the connection never answers', async () => {
    const server = new FakeServer();
    const p = phone(server, progress({ xp: 30 }));
    world.client = p.client;
    const session = await connectSync({ uid: UID, local: p.device, onStatus: () => {} });
    await pass(2000);

    p.client.setOnline(false);
    const outcome = deleteCloudProgress(UID).then(
      () => 'deleted',
      (error: Error) => error.message,
    );
    await pass(20_000);
    expect(await outcome).toMatch(/too long/);
    session.stop();
  });
});
