/**
 * The username and profile rules in firestore.rules, against the Firestore emulator
 * (`npm run test:cloud`). `@firebase/rules-unit-testing` loads the real file and
 * makes requests "as" a signed-in person, another one, or nobody.
 *
 * The promises being tested: a handle belongs to one person; it can only be created
 * together with that person's profile; a profile can only name a handle its owner holds;
 * changing the name frees the old handle in the same commit; and a handle can't be
 * taken from, or written over for, anybody else.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { EMULATOR_PROJECT_ID, FIRESTORE_EMULATOR } from './config';
import { uniqueUsername } from './emulatorKit';
import { loadFirestoreSdk } from './firebase';
import { AccountError } from './types';
import { claimIn } from './usernames';
import { RESERVED_USERNAMES, validateUsername } from './username';

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

let counter = 0;
function newUid(label: string): string {
  counter += 1;
  return `${label}-${Date.now().toString(36)}-${counter}`;
}

/** One connection per person, so a document made through it can be used in the same batch as another. */
const connections = new Map<string, Firestore>();
function as(uid: string): Firestore {
  let db = connections.get(uid);
  if (db === undefined) {
    db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
    connections.set(uid, db);
  }
  return db;
}
let signedOut: Firestore | undefined;
function anonymous(): Firestore {
  signedOut ??= env.unauthenticatedContext().firestore() as unknown as Firestore;
  return signedOut;
}

/** What the client writes to claim `handle`, as one commit: the claim and the profile that names it. */
function claim(db: Firestore, uid: string, handle: string, extra: { leaving?: string; keepCreatedAt?: Timestamp } = {}) {
  const batch = writeBatch(db);
  batch.set(doc(db, `usernames/${handle}`), { uid, createdAt: serverTimestamp() });
  if (extra.leaving !== undefined) batch.delete(doc(db, `usernames/${extra.leaving}`));
  batch.set(doc(db, `profiles/${uid}`), {
    username: handle,
    createdAt: extra.keepCreatedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

/** Puts a person and their handle in place, bypassing the rules. */
async function seed(uid: string, handle: string): Promise<Timestamp> {
  const createdAt = Timestamp.now();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, `usernames/${handle}`), { uid, createdAt });
    await setDoc(doc(db, `profiles/${uid}`), { username: handle, createdAt, updatedAt: createdAt });
  });
  return createdAt;
}

async function exists(path: string): Promise<boolean> {
  let found = false;
  await env.withSecurityRulesDisabled(async (context) => {
    found = (await getDoc(doc(context.firestore() as unknown as Firestore, path))).exists();
  });
  return found;
}

describe('claiming a handle', () => {
  it('lets a person create their handle and profile together', async () => {
    const uid = newUid('ada');
    const handle = uniqueUsername('ada');
    await assertSucceeds(claim(as(uid), uid, handle));
    expect(await exists(`usernames/${handle}`)).toBe(true);
    expect(await exists(`profiles/${uid}`)).toBe(true);
  });

  it('refuses a handle that somebody else already holds, and writes nothing', async () => {
    const owner = newUid('owner');
    const rival = newUid('rival');
    const handle = uniqueUsername('taken');
    await seed(owner, handle);

    await assertFails(claim(as(rival), rival, handle));
    expect(await exists(`profiles/${rival}`)).toBe(false);
    await assertFails(setDoc(doc(as(rival), `usernames/${handle}`), { uid: rival, createdAt: serverTimestamp() }));
  });

  it('refuses a handle on its own, with no profile naming it', async () => {
    const uid = newUid('lonely');
    await assertFails(setDoc(doc(as(uid), `usernames/${uniqueUsername('lonely')}`), { uid, createdAt: serverTimestamp() }));
  });

  it('refuses a profile on its own, naming a handle that does not exist', async () => {
    const uid = newUid('dangling');
    await assertFails(
      setDoc(doc(as(uid), `profiles/${uid}`), { username: uniqueUsername('nothing'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it('refuses a profile that names a handle held by somebody else, even though the handle exists', async () => {
    const owner = newUid('owner');
    const thief = newUid('thief');
    const handle = uniqueUsername('theirs');
    await seed(owner, handle);
    await assertFails(
      setDoc(doc(as(thief), `profiles/${thief}`), { username: handle, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it('refuses a claim written in someone else’s name', async () => {
    const me = newUid('me');
    const victim = newUid('victim');
    const handle = uniqueUsername('forged');
    // The handle says it is the victim's, with the victim's profile: not mine to write.
    await assertFails(claim(as(me), victim, handle));
    // The handle says it is mine, but the profile that names it is the victim's.
    const batch = writeBatch(as(me));
    batch.set(doc(as(me), `usernames/${handle}`), { uid: me, createdAt: serverTimestamp() });
    batch.set(doc(as(me), `profiles/${victim}`), { username: handle, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  it('refuses a claim whose profile names a different handle', async () => {
    const uid = newUid('mismatch');
    const batch = writeBatch(as(uid));
    batch.set(doc(as(uid), `usernames/${uniqueUsername('one')}`), { uid, createdAt: serverTimestamp() });
    batch.set(doc(as(uid), `profiles/${uid}`), { username: uniqueUsername('two'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  it('refuses to hold two handles at once', async () => {
    const uid = newUid('hoarder');
    const first = uniqueUsername('first');
    const second = uniqueUsername('second');
    await assertSucceeds(claim(as(uid), uid, first));

    // A second handle, with the profile moved onto it, but the first one left standing.
    await assertFails(claim(as(uid), uid, second));
    // Two new handles in one go, the profile naming only one.
    const batch = writeBatch(as(uid));
    batch.set(doc(as(uid), `usernames/${uniqueUsername('x')}`), { uid, createdAt: serverTimestamp() });
    batch.set(doc(as(uid), `usernames/${second}`), { uid, createdAt: serverTimestamp() });
    batch.update(doc(as(uid), `profiles/${uid}`), { username: second, updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  it('wants a claim with exactly a uid and the server’s time', async () => {
    const uid = newUid('shape');
    const handle = uniqueUsername('shape');
    for (const bad of [
      { uid, createdAt: serverTimestamp(), admin: true },
      { uid },
      { uid, createdAt: Timestamp.now() },
      { uid, createdAt: new Date() },
    ]) {
      const batch = writeBatch(as(uid));
      batch.set(doc(as(uid), `usernames/${handle}`), bad);
      batch.set(doc(as(uid), `profiles/${uid}`), { username: handle, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await assertFails(batch.commit());
    }
  });

  it('wants a profile with exactly a username, a created time and an updated time, the server’s', async () => {
    const uid = newUid('profile');
    const handle = uniqueUsername('profile');
    for (const bad of [
      { username: handle, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), role: 'admin' },
      { username: handle, createdAt: serverTimestamp() },
      { username: handle, createdAt: serverTimestamp(), updatedAt: Timestamp.now() },
      { username: handle, createdAt: 'yesterday', updatedAt: serverTimestamp() },
    ]) {
      const batch = writeBatch(as(uid));
      batch.set(doc(as(uid), `usernames/${handle}`), { uid, createdAt: serverTimestamp() });
      batch.set(doc(as(uid), `profiles/${uid}`), bad);
      await assertFails(batch.commit());
    }
  });
});

describe('what a handle may look like', () => {
  /** Whether the rules let a person claim `handle` (a fresh person each time). */
  async function rulesAccept(handle: string): Promise<boolean> {
    const uid = newUid('shape');
    try {
      await assertSucceeds(claim(as(uid), uid, handle));
      return true;
    } catch {
      return false;
    }
  }

  const SHAPES = [
    'ada', 'ada_l', 'ada.l', 'a1b', '007', 'a'.repeat(20), 'a_b.c_d.e',
    'ab', 'a'.repeat(21), '', 'a b', 'a-b', 'adă', 'ada!', '.ada', 'ada.', '_ada', 'ada_', '__ada__', '...', 'ada@b', 'a/b',
    ...RESERVED_USERNAMES,
  ];

  it('agrees with the app on every handle (src/cloud/username.ts)', async () => {
    for (const handle of SHAPES) {
      expect(await rulesAccept(handle), JSON.stringify(handle)).toBe(validateUsername(handle) === null);
    }
  });

  it('refuses capital letters, which the app lowercases before it asks', async () => {
    expect(await rulesAccept(`Ada${Math.random().toString(36).slice(2, 8)}`)).toBe(false);
  });

  it('refuses every reserved word', async () => {
    for (const word of RESERVED_USERNAMES) expect(await rulesAccept(word), word).toBe(false);
  });
});

describe('changing the username', () => {
  it('claims the new handle and frees the old one in the same commit', async () => {
    const uid = newUid('change');
    const oldHandle = uniqueUsername('old');
    const newHandle = uniqueUsername('new');
    await seed(uid, oldHandle);

    await assertSucceeds(
      (async () => {
        const db = as(uid);
        const batch = writeBatch(db);
        batch.set(doc(db, `usernames/${newHandle}`), { uid, createdAt: serverTimestamp() });
        batch.delete(doc(db, `usernames/${oldHandle}`));
        batch.update(doc(db, `profiles/${uid}`), { username: newHandle, updatedAt: serverTimestamp() });
        return batch.commit();
      })(),
    );

    expect(await exists(`usernames/${oldHandle}`)).toBe(false);
    expect(await exists(`usernames/${newHandle}`)).toBe(true);
    // The old name is free for anyone, at once.
    const other = newUid('other');
    await assertSucceeds(claim(as(other), other, oldHandle));
  });

  it('keeps the profile’s created time when it is written whole again', async () => {
    const uid = newUid('whole');
    const oldHandle = uniqueUsername('old');
    const newHandle = uniqueUsername('new');
    const createdAt = await seed(uid, oldHandle);
    await assertSucceeds(claim(as(uid), uid, newHandle, { leaving: oldHandle, keepCreatedAt: createdAt }));
    // A made-up created time is not allowed.
    const again = uniqueUsername('again');
    await assertFails(claim(as(uid), uid, again, { leaving: newHandle, keepCreatedAt: Timestamp.fromMillis(1) }));
  });

  it('refuses to move to a new handle and leave the old one claimed', async () => {
    const uid = newUid('keeper');
    const oldHandle = uniqueUsername('old');
    await seed(uid, oldHandle);
    await assertFails(claim(as(uid), uid, uniqueUsername('new')));
    expect(await exists(`usernames/${oldHandle}`)).toBe(true);
  });

  it('refuses to free a handle while the profile still names it', async () => {
    const uid = newUid('freeing');
    const handle = uniqueUsername('mine');
    await seed(uid, handle);
    await assertFails(deleteDoc(doc(as(uid), `usernames/${handle}`)));
    expect(await exists(`usernames/${handle}`)).toBe(true);
  });

  it('refuses to move onto a handle somebody else holds, and keeps the old one', async () => {
    const uid = newUid('mover');
    const owner = newUid('owner');
    const mine = uniqueUsername('mine');
    const theirs = uniqueUsername('theirs');
    await seed(uid, mine);
    await seed(owner, theirs);
    await assertFails(claim(as(uid), uid, theirs, { leaving: mine }));
    expect(await exists(`usernames/${mine}`)).toBe(true);
  });

  it('allows a profile to be touched without changing its handle', async () => {
    const uid = newUid('touch');
    const handle = uniqueUsername('touch');
    await seed(uid, handle);
    await assertSucceeds(updateDoc(doc(as(uid), `profiles/${uid}`), { updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(uid), `profiles/${uid}`), { updatedAt: serverTimestamp(), extra: 1 }));
  });
});

describe('leaving', () => {
  it('lets a person delete their profile and free their handle together', async () => {
    const uid = newUid('leaver');
    const handle = uniqueUsername('leaver');
    await seed(uid, handle);
    const db = as(uid);
    const batch = writeBatch(db);
    batch.delete(doc(db, `usernames/${handle}`));
    batch.delete(doc(db, `profiles/${uid}`));
    await assertSucceeds(batch.commit());
    expect(await exists(`usernames/${handle}`)).toBe(false);
    expect(await exists(`profiles/${uid}`)).toBe(false);
  });

  it('lets a person delete the profile first and the handle after, so nothing is stuck', async () => {
    const uid = newUid('stuck');
    const handle = uniqueUsername('stuck');
    await seed(uid, handle);
    await assertSucceeds(deleteDoc(doc(as(uid), `profiles/${uid}`)));
    await assertSucceeds(deleteDoc(doc(as(uid), `usernames/${handle}`)));
  });

  it('does not let anybody else delete a handle or a profile', async () => {
    const owner = newUid('owner');
    const intruder = newUid('intruder');
    const handle = uniqueUsername('safe');
    await seed(owner, handle);
    await assertFails(deleteDoc(doc(as(intruder), `usernames/${handle}`)));
    await assertFails(deleteDoc(doc(as(intruder), `profiles/${owner}`)));
    await assertFails(deleteDoc(doc(anonymous(), `usernames/${handle}`)));
    // Not even together with the intruder's own profile moving on.
    const batch = writeBatch(as(intruder));
    batch.delete(doc(as(intruder), `usernames/${handle}`));
    batch.set(doc(as(intruder), `usernames/${handle}-x`), { uid: intruder, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
    expect(await exists(`usernames/${handle}`)).toBe(true);
  });

  it('does not let a claim be rewritten to another person', async () => {
    const owner = newUid('owner');
    const intruder = newUid('intruder');
    const handle = uniqueUsername('fixed');
    await seed(owner, handle);
    await assertFails(setDoc(doc(as(intruder), `usernames/${handle}`), { uid: intruder, createdAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(owner), `usernames/${handle}`), { uid: intruder }));
  });
});

describe('who can read', () => {
  it('lets anyone look a single handle up, signed in or not, so the sign-up form can ask', async () => {
    const owner = newUid('owner');
    const handle = uniqueUsername('lookup');
    await seed(owner, handle);
    for (const db of [anonymous(), as(newUid('stranger')), as(owner)]) {
      const snapshot = await assertSucceeds(getDoc(doc(db, `usernames/${handle}`)));
      expect(snapshot.exists()).toBe(true);
    }
    expect((await assertSucceeds(getDoc(doc(anonymous(), `usernames/${uniqueUsername('free')}`)))).exists()).toBe(false);
  });

  it('lets nobody list the handles or the profiles', async () => {
    const uid = newUid('lister');
    await seed(uid, uniqueUsername('lister'));
    await assertFails(getDocs(collection(as(uid), 'usernames')));
    await assertFails(getDocs(collection(anonymous(), 'usernames')));
    await assertFails(getDocs(collection(as(uid), 'profiles')));
  });

  it('shows a profile to its owner only', async () => {
    const owner = newUid('owner');
    await seed(owner, uniqueUsername('private'));
    await assertSucceeds(getDoc(doc(as(owner), `profiles/${owner}`)));
    await assertFails(getDoc(doc(as(newUid('stranger')), `profiles/${owner}`)));
    await assertFails(getDoc(doc(anonymous(), `profiles/${owner}`)));
  });

  it('keeps nobody signed in from writing anything', async () => {
    const handle = uniqueUsername('anon');
    await assertFails(setDoc(doc(anonymous(), `usernames/${handle}`), { uid: 'x', createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(anonymous(), `profiles/x`), { username: handle, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  });
});

describe('a race for one handle', () => {
  it('has exactly one winner when two people commit the same claim at once', async () => {
    for (let round = 0; round < 4; round += 1) {
      const handle = uniqueUsername('race');
      const people = [newUid('racer'), newUid('racer'), newUid('racer')];
      const results = await Promise.allSettled(people.map((uid) => claim(as(uid), uid, handle)));
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(2);
    }
  });

  it('has exactly one winner when two people run the app’s transaction at once, and the loser is told it is taken', async () => {
    for (let round = 0; round < 4; round += 1) {
      const handle = uniqueUsername('race');
      const people = [newUid('racer'), newUid('racer')];
      const sdk = await loadFirestoreSdk();
      const results = await Promise.allSettled(people.map((uid) => claimIn(as(uid), sdk, uid, handle)));

      const winners = people.filter((_, index) => results[index]?.status === 'fulfilled');
      expect(winners).toHaveLength(1);
      const loser = results.find((result) => result.status === 'rejected');
      expect(loser?.status === 'rejected' && loser.reason).toBeInstanceOf(AccountError);
      expect(loser?.status === 'rejected' && (loser.reason as AccountError).code).toBe('username-taken');

      // The handle is the winner's, and only the winner has a profile.
      expect(await exists(`usernames/${handle}`)).toBe(true);
      for (const uid of people) expect(await exists(`profiles/${uid}`)).toBe(winners.includes(uid));
    }
  });
});
