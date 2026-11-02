/**
 * Usernames through the app's own code (the account service and ./usernames), against the
 * Auth and Firestore emulators (`npm run test:cloud`). Nothing is mocked: the real Firebase
 * SDK signs real (emulated) people up and the real rules in firestore.rules accept or refuse
 * what the code writes. The rules on their own, and the race between two people, are in
 * usernames.rules.emu.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { deleteAccount, setUsername, signInWithApple, signOut, signUpWithEmail } from './auth';
import { EMULATOR_PROJECT_ID, FIRESTORE_EMULATOR } from './config';
import { uniqueEmail, uniqueUsername, waitForAccount } from './emulatorKit';
import { onBeforeAccountDelete } from './deleteHooks';
import { getFirebaseAuth, loadAuthSdk } from './firebase';
import { AccountError, type ProfileState } from './types';
import { checkUsername, freeUsernames, watchProfile } from './usernames';

const PASSWORD = 'correct horse battery';

// Apple on Android: the plugin (which needs a phone) is stood in for by a function that returns the
// ID token and nonce a real Apple sign-in would. The page believes it is native.
const plugin = vi.hoisted(() => ({ signInWithApple: vi.fn(), signOut: vi.fn(async () => undefined) }));
vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return { ...original, Capacitor: { ...original.Capacitor, isNativePlatform: () => true } };
});
vi.mock('@capacitor-firebase/authentication', () => ({ FirebaseAuthentication: plugin }));

async function failure(action: Promise<unknown>): Promise<AccountError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(AccountError);
    return error as AccountError;
  }
  throw new Error('Expected the action to fail.');
}

async function currentUid(): Promise<string> {
  const uid = (await getFirebaseAuth()).currentUser?.uid;
  if (uid === undefined) throw new Error('Nobody is signed in.');
  return uid;
}

/** What is stored for a person and a handle right now, read with the rules out of the way. */
let rulesEnv: RulesTestEnvironment | undefined;
async function stored(path: string): Promise<Record<string, unknown> | null> {
  rulesEnv ??= await initializeTestEnvironment({
    projectId: EMULATOR_PROJECT_ID,
    firestore: { ...FIRESTORE_EMULATOR, rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
  let data: Record<string, unknown> | null = null;
  await rulesEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await getDoc(doc(context.firestore() as unknown as Firestore, path));
    data = snapshot.exists() ? snapshot.data() : null;
  });
  return data;
}

afterEach(async () => {
  plugin.signInWithApple.mockReset();
  await signOut();
});

describe('signing up with a username', () => {
  it('creates the account, the claim and the profile together, and names the account after the username', async () => {
    const username = uniqueUsername('ada');
    await signUpWithEmail({ email: uniqueEmail('ada'), password: PASSWORD, username: `  ${username.toUpperCase()} ` });
    const uid = await currentUid();

    expect(await stored(`usernames/${username}`)).toMatchObject({ uid });
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username });
    const state = await waitForAccount((s) => s.status === 'signed-in' && s.user.displayName === username);
    expect(state.user?.displayName).toBe(username);
  });

  it('says a username is taken, in either case, and does not make the account', async () => {
    const username = uniqueUsername('grace');
    await signUpWithEmail({ email: uniqueEmail('first'), password: PASSWORD, username });
    await signOut();

    const email = uniqueEmail('second');
    const error = await failure(signUpWithEmail({ email, password: PASSWORD, username: username.toUpperCase() }));
    expect(error).toMatchObject({ code: 'username-taken', field: 'username' });
    expect(error.message).toBe('That username is taken.');
    // No half-made account: the email can still be used for a sign-up with a free name.
    expect((await getFirebaseAuth()).currentUser).toBeNull();
    await expect(signUpWithEmail({ email, password: PASSWORD, username: uniqueUsername('grace') })).resolves.toBeUndefined();
  });

  it('refuses a username that breaks the shape without making an account', async () => {
    for (const bad of ['no spaces', 'ab', 'x'.repeat(21), 'guitarrot']) {
      const error = await failure(signUpWithEmail({ email: uniqueEmail('bad'), password: PASSWORD, username: bad }));
      expect(error).toMatchObject({ code: 'username-invalid', field: 'username' });
    }
    expect((await getFirebaseAuth()).currentUser).toBeNull();
  });

  it('keeps the account when the name is lost in the last moment, and lets the person pick another', async () => {
    const wanted = uniqueUsername('close');
    const rival = uniqueUsername('close');
    // A rival signs up first and takes the name; ours slipped past the availability check (simulated by
    // claiming after the check would have answered: the claim itself is what must refuse).
    await signUpWithEmail({ email: uniqueEmail('rival'), password: PASSWORD, username: wanted });
    await signOut();
    const email = uniqueEmail('late');
    await signUpWithEmail({ email, password: PASSWORD, username: rival });
    const uid = await currentUid();

    const error = await failure(setUsername(wanted));
    expect(error).toMatchObject({ code: 'username-taken', field: 'username' });
    // Still signed in, still the old username.
    expect(await currentUid()).toBe(uid);
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username: rival });
  });
});

describe('looking a username up', () => {
  it('answers available, taken and yours, ignoring case, before anyone is signed in', async () => {
    const username = uniqueUsername('lookup');
    expect(await checkUsername(username)).toBe('available');

    await signUpWithEmail({ email: uniqueEmail('lookup'), password: PASSWORD, username });
    const uid = await currentUid();
    expect(await checkUsername(username.toUpperCase())).toBe('taken');
    expect(await checkUsername(username, uid)).toBe('yours');
    expect(await checkUsername(username, 'someone-else')).toBe('taken');

    await signOut();
    expect(await checkUsername(username)).toBe('taken');
  });

  it('finds free usernames near one that is taken', async () => {
    const username = uniqueUsername('busy');
    await signUpWithEmail({ email: uniqueEmail('busy'), password: PASSWORD, username });
    const free = await freeUsernames(username);
    expect(free.length).toBeGreaterThan(0);
    for (const candidate of free) {
      expect(candidate.startsWith(username.slice(0, 5))).toBe(true);
      expect(await checkUsername(candidate)).toBe('available');
    }
  });
});

describe('changing the username', () => {
  it('claims the new one and frees the old one at the same moment', async () => {
    const first = uniqueUsername('first');
    const second = uniqueUsername('second');
    await signUpWithEmail({ email: uniqueEmail('change'), password: PASSWORD, username: first });
    const uid = await currentUid();
    const created = (await stored(`profiles/${uid}`))?.createdAt;

    await setUsername(second);

    expect(await stored(`usernames/${first}`)).toBeNull();
    expect(await stored(`usernames/${second}`)).toMatchObject({ uid });
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username: second, createdAt: created });
    expect(await checkUsername(first)).toBe('available');
    const state = await waitForAccount((s) => s.status === 'signed-in' && s.user.displayName === second);
    expect(state.user?.displayName).toBe(second);

    // The freed name is anyone's: another person takes it.
    await signOut();
    await signUpWithEmail({ email: uniqueEmail('heir'), password: PASSWORD, username: first });
    expect(await stored(`usernames/${first}`)).not.toBeNull();
  });

  it('is a quiet no-op to choose the username you already have', async () => {
    const username = uniqueUsername('same');
    await signUpWithEmail({ email: uniqueEmail('same'), password: PASSWORD, username });
    const uid = await currentUid();
    const before = await stored(`profiles/${uid}`);
    await expect(setUsername(username)).resolves.toBeUndefined();
    expect(await stored(`profiles/${uid}`)).toEqual(before);
  });

  it('keeps the old username when the new one is somebody else’s', async () => {
    const taken = uniqueUsername('theirs');
    const mine = uniqueUsername('mine');
    await signUpWithEmail({ email: uniqueEmail('theirs'), password: PASSWORD, username: taken });
    await signOut();
    await signUpWithEmail({ email: uniqueEmail('mine'), password: PASSWORD, username: mine });
    const uid = await currentUid();

    expect(await failure(setUsername(taken))).toMatchObject({ code: 'username-taken' });
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username: mine });
    expect(await stored(`usernames/${mine}`)).toMatchObject({ uid });
  });
});

describe('a person who signed in with a provider and has no username yet', () => {
  /** Signs in as a fresh Google person through the Auth emulator's fake provider. */
  async function newGooglePerson(name: string) {
    const auth = await getFirebaseAuth();
    const { GoogleAuthProvider, signInWithCredential } = await loadAuthSdk();
    const email = uniqueEmail('google');
    const idToken = JSON.stringify({ sub: `g-${email}`, email, email_verified: true, name });
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return { uid: await currentUid(), email };
  }

  function profileOf(uid: string): { states: ProfileState[]; stop: () => void } {
    const states: ProfileState[] = [];
    const stop = watchProfile(uid, (state) => states.push(state));
    return { states, stop };
  }

  it('is told by the server that there is no profile, and has one after picking a username', async () => {
    const { uid } = await newGooglePerson('Grace Hopper');
    const { states, stop } = profileOf(uid);
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ status: 'ready', username: null }));

    const username = uniqueUsername('grace');
    await setUsername(username);
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ status: 'ready', username }));
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username });
    stop();
  });

  it('can sign in through Apple on Android, then pick a username like anyone else', async () => {
    const email = uniqueEmail('apple');
    plugin.signOut.mockClear();
    plugin.signInWithApple.mockResolvedValue({
      user: { displayName: 'Ada Lovelace' },
      credential: { providerId: 'apple.com', idToken: JSON.stringify({ sub: `a-${email}`, email, email_verified: true }), nonce: 'raw-nonce' },
    });

    await signInWithApple();

    const state = await waitForAccount((s) => s.status === 'signed-in' && s.user.providers.includes('apple.com'));
    expect(state.user).toMatchObject({ email, providers: ['apple.com'], displayName: 'Ada Lovelace' });
    // The plugin's own native user was signed out again: one auth state for the app.
    expect(plugin.signOut).toHaveBeenCalledTimes(1);

    const uid = await currentUid();
    expect(await stored(`profiles/${uid}`)).toBeNull();
    const username = uniqueUsername('ada');
    await setUsername(username);
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username });
    expect((await waitForAccount((s) => s.status === 'signed-in' && s.user.displayName === username)).user?.displayName).toBe(username);
  });
});

describe('deleting the account', () => {
  it('removes the profile and frees the username, so the name can be used again', async () => {
    const username = uniqueUsername('gone');
    const email = uniqueEmail('gone');
    await signUpWithEmail({ email, password: PASSWORD, username });
    const uid = await currentUid();
    expect(await stored(`usernames/${username}`)).not.toBeNull();

    await deleteAccount();

    expect(await stored(`usernames/${username}`)).toBeNull();
    expect(await stored(`profiles/${uid}`)).toBeNull();
    expect(await checkUsername(username)).toBe('available');
    await expect(signUpWithEmail({ email: uniqueEmail('heir'), password: PASSWORD, username })).resolves.toBeUndefined();
  });

  it('deletes an account that never picked a username without complaint', async () => {
    const auth = await getFirebaseAuth();
    const { GoogleAuthProvider, signInWithCredential } = await loadAuthSdk();
    const email = uniqueEmail('nameless');
    await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: `g-${email}`, email, email_verified: true })));
    await expect(deleteAccount()).resolves.toBeUndefined();
    expect((await getFirebaseAuth()).currentUser).toBeNull();
  });

  it('keeps the account, its profile and its username when another clean-up fails', async () => {
    const username = uniqueUsername('kept');
    const email = uniqueEmail('kept');
    await signUpWithEmail({ email, password: PASSWORD, username });
    const uid = await currentUid();
    // Another part of the app (the leaderboard, the sync) cannot finish its clean-up.
    const off = onBeforeAccountDelete(() => {
      throw new Error('offline');
    });
    expect(await failure(deleteAccount())).toMatchObject({ code: 'cleanup-failed' });
    off();

    expect((await getFirebaseAuth()).currentUser).not.toBeNull();
    expect(await stored(`profiles/${uid}`)).toMatchObject({ username });
    expect(await stored(`usernames/${username}`)).toMatchObject({ uid });

    // A later attempt, with everything working, takes the lot.
    await deleteAccount();
    expect(await stored(`profiles/${uid}`)).toBeNull();
    expect(await stored(`usernames/${username}`)).toBeNull();
  });
});
