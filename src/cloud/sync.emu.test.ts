/**
 * The progress sync against the real Auth and Firestore emulators
 * (`npm run test:cloud`): the real SDK, the real security rules, and two
 * "devices" for one person: two Firebase apps with their own sign-in, their
 * own Firestore connection and their own offline cache, each with its own
 * progress. Only the progress on the devices is a stand-in (`LocalDevice`).
 */
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  enableNetwork,
  getDocFromServer,
  initializeFirestore,
  memoryLocalCache,
  setDoc,
  terminate,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import { emptyProgressState, type ProgressState } from '@/progress';
import { deleteAccount, signOut, signUpWithEmail } from './auth';
import { AUTH_EMULATOR, cloud, EMULATOR_PROJECT_ID, FIRESTORE_EMULATOR } from './config';
import { onBeforeAccountDelete } from './deleteHooks';
import { uniqueEmail } from './emulatorKit';
import { getFirebaseAuth, getFirestoreDb, loadFirestoreSdk } from './firebase';
import { remoteDocData } from './remoteProgress';
import { connectSync, deleteCloudProgress, startSync, type SyncSession, type SyncStatus } from './sync';
import { LocalDevice } from './syncKit';

const PASSWORD = 'correct horse battery';
/// Quick enough to keep the tests short, slow enough to batch a burst of changes.
const FAST = { debounceMs: 150, maxWaitMs: 600, offlineAfterMs: 800 } as const;

let rulesOff: RulesTestEnvironment;
const apps: FirebaseApp[] = [];
const secondDbs: Firestore[] = [];
const sessions: SyncSession[] = [];

beforeAll(async () => {
  rulesOff = await initializeTestEnvironment({
    projectId: EMULATOR_PROJECT_ID,
    firestore: { ...FIRESTORE_EMULATOR, rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});

/** Closes the extra devices' connections. */
async function closeDevices(): Promise<void> {
  for (const db of secondDbs.splice(0)) await terminate(db).catch(() => undefined);
  for (const app of apps.splice(0)) await deleteApp(app).catch(() => undefined);
}

afterEach(async () => {
  for (const session of sessions.splice(0)) session.stop();
  await closeDevices();
  await signOut();
});

afterAll(async () => {
  await rulesOff.cleanup();
  await closeDevices();
});

function progress(patch: Partial<ProgressState> = {}): ProgressState {
  const base = emptyProgressState();
  return { ...base, settings: { ...base.settings, instrumentChosen: true }, ...patch };
}

type Device = {
  db: Firestore;
  local: LocalDevice;
  statuses: SyncStatus[];
  session: SyncSession;
  play: (change: (state: ProgressState) => ProgressState) => void;
};

/** Makes a person, signed in on this process's default app (device A). */
async function newPerson(): Promise<{ uid: string; email: string }> {
  const email = uniqueEmail('sync');
  await signUpWithEmail({ email, password: PASSWORD, displayName: 'Ada' });
  const uid = (await getFirebaseAuth()).currentUser?.uid;
  if (uid === undefined) throw new Error('Not signed in after sign-up.');
  return { uid, email };
}

/**
 * A device for the person: its own Firebase app, sign-in, connection and cache. Every test makes its
 * own, because switching the network off and on under a connection that other tests also use trips an
 * internal assertion in the Firestore SDK and leaves that connection unusable.
 */
async function newDevice(email: string): Promise<Firestore> {
  const config = cloud.firebase;
  if (config === null) throw new Error('The emulators are not on.');
  const app = initializeApp(config, `device-${apps.length}-${Date.now()}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_EMULATOR.host}:${AUTH_EMULATOR.port}`, { disableWarnings: true });
  await signInWithEmailAndPassword(auth, email, PASSWORD);
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  secondDbs.push(db);
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR.host, FIRESTORE_EMULATOR.port);
  return db;
}

async function startDevice(uid: string, db: Firestore, initial: ProgressState): Promise<Device> {
  const sdk = await loadFirestoreSdk();
  const local = new LocalDevice(initial);
  const statuses: SyncStatus[] = [];
  const session = startSync({ uid, db, sdk, local, onStatus: (status) => statuses.push(status), ...FAST });
  sessions.push(session);
  return {
    db,
    local,
    statuses,
    session,
    play(change) {
      local.play(change);
      session.localChanged();
    },
  };
}

/** What the cloud holds for `uid`, read from the server (bypassing every cache). */
async function inTheCloud(uid: string, db: Firestore) {
  const snapshot = await getDocFromServer(doc(db, `users/${uid}`));
  return snapshot.exists() ? (snapshot.data() as { progress: ProgressState; schemaVersion: number; updatedAt: Timestamp }) : undefined;
}

const sorted = (list: readonly string[]) => [...list].sort();

describe('two devices, one person', () => {
  it('each plays offline; once both are back, both end with everything, and then nothing more is written', async () => {
    const { uid, email } = await newPerson();
    const dbA = await newDevice(email);
    const dbB = await newDevice(email);
    await disableNetwork(dbA);
    await disableNetwork(dbB);

    const a = await startDevice(uid, dbA, progress({ xp: 100, lessonsDone: ['strings'], songsPlayed: ['s1'] }));
    const b = await startDevice(uid, dbB, progress({ xp: 80, lessonsDone: ['frets'], songsPlayed: ['s2'], achievements: { first: '2026-03-01' } }));
    // Offline-style play: each keeps going on its own.
    a.play((s) => ({ ...s, xp: 130, lessonsDone: [...s.lessonsDone, 'tuning'], practiceDays: ['2026-05-01', '2026-05-02'] }));
    b.play((s) => ({ ...s, xp: 95, lessonsDone: [...s.lessonsDone, 'chords'], practiceDays: ['2026-05-02', '2026-05-03'] }));
    await vi.waitFor(() => expect(a.statuses.at(-1)).toBe('offline'), { timeout: 5000 });
    await vi.waitFor(() => expect(b.statuses.at(-1)).toBe('offline'), { timeout: 5000 });

    await enableNetwork(dbA);
    await enableNetwork(dbB);

    const everything = {
      lessons: ['chords', 'frets', 'strings', 'tuning'],
      songs: ['s1', 's2'],
    };
    await vi.waitFor(
      () => {
        for (const device of [a, b]) {
          expect(device.local.state.xp).toBe(130);
          expect(sorted(device.local.state.lessonsDone)).toEqual(everything.lessons);
          expect(sorted(device.local.state.songsPlayed)).toEqual(everything.songs);
          expect(device.local.state.achievements).toEqual({ first: '2026-03-01' });
          expect(device.local.state.practiceDays).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
          expect(device.local.state.dayStreak).toMatchObject({ current: 3, lastDate: '2026-05-03' });
          expect(device.statuses.at(-1)).toBe('synced');
        }
      },
      { timeout: 20_000, interval: 100 },
    );

    const settled = await inTheCloud(uid, dbA);
    expect(settled?.progress).toMatchObject({ xp: 130 });
    expect(sorted(settled?.progress.lessonsDone ?? [])).toEqual(everything.lessons);
    expect(settled?.schemaVersion).toBe(2);

    // No write loop: a good while later the document has not been written again.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const later = await inTheCloud(uid, dbB);
    expect(later?.updatedAt.toMillis()).toBe(settled?.updatedAt.toMillis());
  });

  it('while both are open, what one plays turns up on the other', async () => {
    const { uid, email } = await newPerson();
    const dbA = await newDevice(email);
    const dbB = await newDevice(email);
    const a = await startDevice(uid, dbA, progress({ xp: 10 }));
    const b = await startDevice(uid, dbB, emptyProgressState());

    await vi.waitFor(() => expect(b.local.state.xp).toBe(10), { timeout: 10_000 });
    expect(a.statuses.at(-1)).toBe('synced');

    a.play((s) => ({ ...s, xp: 40, lessonsDone: ['strings'] }));
    await vi.waitFor(() => expect(b.local.state).toMatchObject({ xp: 40, lessonsDone: ['strings'] }), { timeout: 10_000 });

    b.play((s) => ({ ...s, xp: 70, songsPlayed: ['s9'] }));
    await vi.waitFor(() => expect(a.local.state).toMatchObject({ xp: 70, songsPlayed: ['s9'], lessonsDone: ['strings'] }), {
      timeout: 10_000,
    });
    await vi.waitFor(() => expect(b.statuses.at(-1)).toBe('synced'));
  });

  it('a new phone signing in gets the account’s progress, and keeps its own settings', async () => {
    const { uid, email } = await newPerson();
    const dbA = await newDevice(email);
    const dbB = await newDevice(email);
    await startDevice(uid, dbA, progress({ xp: 500, lessonsDone: ['strings', 'frets'], settings: { ...progress().settings, instrument: 'ukulele' } }));
    await vi.waitFor(async () => expect((await inTheCloud(uid, dbA))?.progress.xp).toBe(500), { timeout: 10_000 });

    const fresh = await startDevice(uid, dbB, emptyProgressState());
    await vi.waitFor(() => expect(fresh.local.state).toMatchObject({ xp: 500, lessonsDone: ['strings', 'frets'] }), {
      timeout: 10_000,
    });
    // The phone had never been asked what it plays; the account knows.
    expect(fresh.local.state.settings).toMatchObject({ instrument: 'ukulele', instrumentChosen: true });
  });
});

describe('the connection', () => {
  it('says offline while the connection is down with something to send, and sends it when it is back', async () => {
    const { uid, email } = await newPerson();
    const db = await newDevice(email);
    const device = await startDevice(uid, db, progress({ xp: 5 }));
    await vi.waitFor(() => expect(device.statuses.at(-1)).toBe('synced'), { timeout: 10_000 });

    await disableNetwork(db);
    device.play((s) => ({ ...s, xp: 25, lessonsDone: ['rhythm'] }));
    await vi.waitFor(() => expect(device.statuses.at(-1)).toBe('offline'), { timeout: 5000 });

    await enableNetwork(db);
    await vi.waitFor(() => expect(device.statuses.at(-1)).toBe('synced'), { timeout: 10_000 });
    expect((await inTheCloud(uid, db))?.progress).toMatchObject({ xp: 25, lessonsDone: ['rhythm'] });
  });

  it('a phone that starts offline writes nothing over an account it has not seen', async () => {
    const { uid, email } = await newPerson();
    const db = await newDevice(email);
    await rulesOff.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore() as unknown as Firestore, `users/${uid}`), {
        ...remoteDocData(progress({ xp: 9000, lessonsDone: ['everything'] })),
        updatedAt: Timestamp.now(),
      });
    });

    await disableNetwork(db);
    const device = await startDevice(uid, db, progress({ xp: 1 }));
    device.play((s) => ({ ...s, xp: 2 }));
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(device.statuses.at(-1)).toBe('offline');

    await enableNetwork(db);
    await vi.waitFor(() => expect(device.local.state).toMatchObject({ xp: 9000, lessonsDone: ['everything'] }), { timeout: 10_000 });
    await vi.waitFor(() => expect(device.statuses.at(-1)).toBe('synced'));
    expect((await inTheCloud(uid, db))?.progress).toMatchObject({ xp: 9000, lessonsDone: ['everything'] });
  });
});

describe('what the rules and the data can throw at it', () => {
  it('merges a document of nonsense without crashing, and mends it', async () => {
    const { uid, email } = await newPerson();
    const db = await newDevice(email);
    await rulesOff.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore() as unknown as Firestore, `users/${uid}`), {
        progress: { version: 2, xp: 'many', srs: [1, 2], lessonsDone: 'x', daily: 5, settings: null },
        schemaVersion: 2,
        updatedAt: Timestamp.now(),
      });
    });

    const device = await startDevice(uid, db, progress({ xp: 33, lessonsDone: ['strings'] }));
    await vi.waitFor(async () => expect((await inTheCloud(uid, db))?.progress).toMatchObject({ xp: 33, lessonsDone: ['strings'] }), {
      timeout: 10_000,
    });
    expect(device.local.state.xp).toBe(33);
  });

  it('leaves progress from a newer app alone', async () => {
    const { uid, email } = await newPerson();
    const db = await newDevice(email);
    await rulesOff.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore() as unknown as Firestore, `users/${uid}`), {
        progress: { version: 3, xp: 99_999 },
        schemaVersion: 3,
        updatedAt: Timestamp.now(),
      });
    });

    const device = await startDevice(uid, db, progress({ xp: 5 }));
    device.play((s) => ({ ...s, xp: 6 }));
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(device.statuses.at(-1)).toBe('error');
    expect((await inTheCloud(uid, db))?.progress).toMatchObject({ version: 3, xp: 99_999 });
    expect(device.local.state.xp).toBe(6);
  });
});

describe('deleting the account', () => {
  it('removes the saved progress first, and it does not come back', async () => {
    const { uid } = await newPerson();
    const db = await getFirestoreDb();
    const local = new LocalDevice(progress({ xp: 77 }));
    const session = await connectSync({ uid, local, onStatus: () => {}, ...FAST });
    sessions.push(session);
    await vi.waitFor(async () => expect((await inTheCloud(uid, db))?.progress.xp).toBe(77), { timeout: 10_000 });

    // What the app does when somebody deletes their account.
    const unregister = onBeforeAccountDelete((user) => deleteCloudProgress(user.uid));
    try {
      await deleteAccount();
    } finally {
      unregister();
    }

    await rulesOff.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDocFromServer(doc(context.firestore() as unknown as Firestore, `users/${uid}`));
      expect(snapshot.exists()).toBe(false);
    });

    // The session was still running; the progress on the phone must not recreate it.
    session.localChanged();
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await rulesOff.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDocFromServer(doc(context.firestore() as unknown as Firestore, `users/${uid}`));
      expect(snapshot.exists()).toBe(false);
    });
  });
});
