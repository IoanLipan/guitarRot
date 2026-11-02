/**
 * The security rules in firestore.rules, against the Firestore emulator
 * (`npm run test:cloud`). `@firebase/rules-unit-testing` loads the real file
 * and makes requests "as" a signed-in user, another user, or nobody.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { emptyProgressState } from '@/progress';
import { EMULATOR_PROJECT_ID, FIRESTORE_EMULATOR } from './config';
import { remoteDocData } from './remoteProgress';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: EMULATOR_PROJECT_ID,
    firestore: {
      ...FIRESTORE_EMULATOR,
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

/** Each test gets people nobody has written for before. */
let counter = 0;
function newUid(label: string): string {
  counter += 1;
  return `${label}-${Date.now().toString(36)}-${counter}`;
}

const as = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const anonymous = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

/** A document exactly as the sync engine writes it. */
function valid(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...remoteDocData(emptyProgressState()), updatedAt: serverTimestamp(), ...extra };
}

/** `valid()` with the pieces of `progress` replaced. */
function withProgress(patch: Record<string, unknown>): Record<string, unknown> {
  const { progress } = remoteDocData(emptyProgressState());
  return valid({ progress: { ...progress, ...patch } });
}

/** Puts a valid document in place for `uid`, bypassing the rules. */
async function seed(uid: string): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, `users/${uid}`), {
      ...remoteDocData(emptyProgressState()),
      updatedAt: Timestamp.now(),
    });
  });
}

describe('users/{uid}: the owner', () => {
  it('can create, read, replace and delete their own document', async () => {
    const uid = newUid('owner');
    const db = as(uid);
    const ref = doc(db, `users/${uid}`);

    await assertSucceeds(setDoc(ref, valid()));
    const snapshot = await assertSucceeds(getDoc(ref));
    if (!snapshot.exists()) throw new Error('The document was not there.');
    if ((snapshot.data().progress as { version?: number }).version !== 2) throw new Error('Wrong progress read back.');

    await assertSucceeds(setDoc(ref, withProgress({ xp: 123 })));
    await assertSucceeds(deleteDoc(ref));
  });

  it('can read a document that does not exist yet', async () => {
    const uid = newUid('fresh');
    await assertSucceeds(getDoc(doc(as(uid), `users/${uid}`)));
  });

  it('can update the progress in place (a merge write is checked the same way)', async () => {
    const uid = newUid('merge');
    const ref = doc(as(uid), `users/${uid}`);
    await assertSucceeds(setDoc(ref, valid()));
    await assertSucceeds(updateDoc(ref, { updatedAt: serverTimestamp(), schemaVersion: 2 }));
    await assertFails(updateDoc(ref, { stray: 1, updatedAt: serverTimestamp() }));
  });
});

describe('users/{uid}: everybody else', () => {
  it('can not read, write, replace or delete somebody else’s document', async () => {
    const owner = newUid('owner');
    const intruder = newUid('intruder');
    await seed(owner);
    const theirs = doc(as(intruder), `users/${owner}`);

    await assertFails(getDoc(theirs));
    await assertFails(setDoc(theirs, valid()));
    await assertFails(updateDoc(theirs, { updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(theirs));
  });

  it('can not create a document under somebody else’s uid', async () => {
    const owner = newUid('owner');
    const intruder = newUid('intruder');
    await assertFails(setDoc(doc(as(intruder), `users/${owner}`), valid()));
  });

  it('nobody signed in can read or write anything', async () => {
    const uid = newUid('someone');
    await seed(uid);
    const ref = doc(anonymous(), `users/${uid}`);

    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, valid()));
    await assertFails(deleteDoc(ref));
  });

  it('nobody can list the users', async () => {
    const uid = newUid('lister');
    await seed(uid);
    await assertFails(getDocs(collection(as(uid), 'users')));
    await assertFails(getDocs(collection(anonymous(), 'users')));
  });
});

describe('users/{uid}: the shape of what is written', () => {
  async function refuses(data: Record<string, unknown>): Promise<void> {
    const uid = newUid('shape');
    await assertFails(setDoc(doc(as(uid), `users/${uid}`), data));
  }

  it('needs all three keys', async () => {
    const { updatedAt: _updatedAt, ...withoutTime } = valid();
    const { progress: _progress, ...withoutProgress } = valid();
    const { schemaVersion: _version, ...withoutVersion } = valid();
    await refuses(withoutTime);
    await refuses(withoutProgress);
    await refuses(withoutVersion);
  });

  it('allows no other top-level key', async () => {
    await refuses(valid({ admin: true }));
    await refuses(valid({ displayName: 'Ada' }));
  });

  it('wants the server’s clock for updatedAt, not the phone’s', async () => {
    await refuses(valid({ updatedAt: Timestamp.now() }));
    await refuses(valid({ updatedAt: new Date() }));
    await refuses(valid({ updatedAt: 12345 }));
    await refuses(valid({ updatedAt: null }));
  });

  it('wants progress to be a map', async () => {
    await refuses(valid({ progress: 'banana' }));
    await refuses(valid({ progress: ['xp', 5] }));
    await refuses(valid({ progress: 42 }));
    await refuses(valid({ progress: null }));
  });

  it('wants schemaVersion to be a whole number in a sane range', async () => {
    await refuses(valid({ schemaVersion: '2' }));
    await refuses(valid({ schemaVersion: 2.5 }));
    await refuses(valid({ schemaVersion: 0 }));
    await refuses(valid({ schemaVersion: 101 }));
    await refuses(valid({ schemaVersion: null }));
  });

  it('refuses a progress map with an absurd number of keys', async () => {
    const stuffed = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`field${i}`, i]));
    await refuses(withProgress(stuffed));
  });

  it('refuses collections far past anything the app produces', async () => {
    const many = (length: number) => Array.from({ length }, (_, i) => `id-${i}`);
    await refuses(withProgress({ lessonsDone: many(2001) }));
    await refuses(withProgress({ songsPlayed: many(2001) }));
    await refuses(withProgress({ seenContent: many(1001) }));
    await refuses(withProgress({ practiceDays: many(801) }));
    await refuses(withProgress({ srs: Object.fromEntries(many(5001).map((id) => [id, 1])) }));
    await refuses(withProgress({ daily: Object.fromEntries(many(801).map((id) => [id, 1])) }));
    await refuses(withProgress({ achievements: Object.fromEntries(many(501).map((id) => [id, 'x'])) }));
  });

  it('accepts a generous, realistic amount of progress', async () => {
    const uid = newUid('busy');
    const many = (length: number) => Array.from({ length }, (_, i) => `id-${i}`);
    await assertSucceeds(
      setDoc(
        doc(as(uid), `users/${uid}`),
        withProgress({
          lessonsDone: many(200),
          songsPlayed: many(100),
          seenContent: many(200),
          practiceDays: many(400),
          srs: Object.fromEntries(many(600).map((id) => [id, { id, dueAt: 1, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 }])),
          daily: Object.fromEntries(many(365).map((id) => [id, { date: id, answered: 1, correct: 1 }])),
        }),
      ),
    );
  });
});

describe('everything else', () => {
  it('is denied, even for a signed-in person', async () => {
    const uid = newUid('curious');
    const db = as(uid);
    await assertFails(setDoc(doc(db, 'notes/one'), { text: 'hello' }));
    await assertFails(getDoc(doc(db, 'notes/one')));
    await assertFails(setDoc(doc(db, 'config/app'), { open: true }));
  });

  it('includes anything nested under a user document', async () => {
    const uid = newUid('nested');
    const db = as(uid);
    await assertFails(setDoc(doc(db, `users/${uid}/private/stuff`), { text: 'hello' }));
    await assertFails(getDoc(doc(db, `users/${uid}/private/stuff`)));
  });
});
