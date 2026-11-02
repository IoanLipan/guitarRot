/**
 * Everything usernames say to Firestore, in one place. Loaded on demand like the
 * rest of the cloud code: each call fetches the Firestore SDK when it first needs it.
 *
 * Two collections hold a username, and they only ever change together:
 *
 *   usernames/{handle}  = { uid, createdAt }                    the claim; the handle is the id
 *   profiles/{uid}      = { username, createdAt, updatedAt }    the person's side of it
 *
 * Being the document id is what makes a handle unique: two people claiming `ada`
 * at once write the same document, and only one write can create it. The security
 * rules (firestore.rules) finish the job: a handle is created only together with
 * the caller's own profile naming it, a profile may only name a handle its owner
 * holds, and a changed name must free the old handle in the same commit. So there
 * is no state in which a handle is claimed by nobody's profile, or one profile
 * names a handle that is somebody else's.
 */
import type { Firestore } from 'firebase/firestore';
import { onBeforeAccountDelete } from './deleteHooks';
import { getFirestoreDb, loadFirestoreSdk } from './firebase';
import { AccountError, type ProfileState } from './types';
import { normalizeUsername, suggestUsernames, validateUsername } from './username';

/** The Firestore SDK as `loadFirestoreSdk()` hands it out. */
export type FirestoreSdk = Awaited<ReturnType<typeof loadFirestoreSdk>>;

export const USERNAMES_COLLECTION = 'usernames';
export const PROFILES_COLLECTION = 'profiles';

/** How long a username step waits for the server before it says there is no connection. */
const TIMEOUT_MS = 12_000;

const OFFLINE = new AccountError('auth/network-request-failed', 'No connection. Check your internet and try again.');

async function open() {
  const [db, sdk] = await Promise.all([getFirestoreDb(), loadFirestoreSdk()]);
  return { db, sdk };
}

/** The server's answer, or the same "no connection" the rest of sign-in says when it takes too long. */
function withinTime<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(OFFLINE), TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function firestoreCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : '';
}

/** Firestore's trouble reaching the server, in words a person can act on. */
function toUsernameError(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  const code = firestoreCode(error);
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'failed-precondition' || code === 'cancelled') {
    return OFFLINE;
  }
  if (/offline|network|failed to fetch|importing a module/i.test(error instanceof Error ? error.message : '')) {
    return OFFLINE;
  }
  return new AccountError('username-failed', 'We couldn’t save your username. Please try again.', 'username');
}

const TAKEN = (): AccountError => new AccountError('username-taken', 'That username is taken.', 'username');

export type Availability = 'available' | 'taken' | 'yours';

/**
 * Is this handle free? Asks the server (a saved copy could be hours old), and works before
 * anyone is signed in, because the sign-up form asks while the person is still typing.
 * `uid`, when given, makes a handle the person already holds come back as `yours`.
 * Rejects when the server can't be reached; the form then says it couldn't check.
 */
export async function checkUsername(rawHandle: string, uid?: string): Promise<Availability> {
  const handle = normalizeUsername(rawHandle);
  try {
    const { db, sdk } = await open();
    const snapshot = await withinTime(sdk.getDocFromServer(sdk.doc(db, USERNAMES_COLLECTION, handle)));
    if (!snapshot.exists()) return 'available';
    return uid !== undefined && (snapshot.data() as { uid?: unknown }).uid === uid ? 'yours' : 'taken';
  } catch (error) {
    throw toUsernameError(error);
  }
}

/** Up to `count` free usernames close to `base`, found by asking the server about a handful of candidates. */
export async function freeUsernames(base: string, uid?: string, count = 3): Promise<string[]> {
  const candidates = suggestUsernames(base, count * 2);
  const answers = await Promise.all(
    candidates.map((candidate) => checkUsername(candidate, uid).then((state) => (state === 'taken' ? null : candidate)).catch(() => null)),
  );
  return answers.flatMap((candidate) => (candidate === null ? [] : [candidate])).slice(0, count);
}

/**
 * Makes `rawHandle` this person's username: claims it, and gives up the one they had, in one
 * transaction. Doing it again with the handle they already hold changes nothing. Rejects with
 * `username-taken` when somebody else holds it (also when somebody else got there first, at the
 * same instant: the transaction retries and sees their claim), `username-invalid` for a handle
 * that breaks the shape, and the usual "no connection" when the server can't be reached.
 */
export async function claimUsername(uid: string, rawHandle: string): Promise<string> {
  const handle = normalizeUsername(rawHandle);
  const problem = validateUsername(handle);
  if (problem !== null) throw new AccountError('username-invalid', problem, 'username');
  try {
    const { db, sdk } = await open();
    await withinTime(claimIn(db, sdk, uid, handle));
    return handle;
  } catch (error) {
    // The rules refuse a handle that is held by someone else even if our read was stale.
    if (firestoreCode(error) === 'permission-denied') {
      const state = await checkUsername(handle, uid).catch(() => null);
      throw state === 'taken' ? TAKEN() : new AccountError('username-failed', 'We couldn’t save your username. Please try again.', 'username');
    }
    throw toUsernameError(error);
  }
}

/**
 * The transaction itself, on whichever Firestore it is given (the tests run it as two different
 * people at once). `handle` is already normalised and valid. Rejects with `username-taken` or
 * with Firestore's own error.
 */
export function claimIn(db: Firestore, sdk: FirestoreSdk, uid: string, handle: string): Promise<void> {
  const handleRef = sdk.doc(db, USERNAMES_COLLECTION, handle);
  const profileRef = sdk.doc(db, PROFILES_COLLECTION, uid);
  return sdk.runTransaction(db, async (transaction) => {
    const profile = await transaction.get(profileRef);
    const held = await transaction.get(handleRef);
    const previous = profile.exists() ? (profile.data() as { username?: unknown }).username : undefined;
    const owner = held.exists() ? (held.data() as { uid?: unknown }).uid : undefined;
    if (held.exists() && owner !== uid) throw TAKEN();

    // The name they are leaving: its claim goes in the same commit, if it is really theirs.
    const leaving = typeof previous === 'string' && previous !== handle ? previous : null;
    const leavingRef = leaving === null ? null : sdk.doc(db, USERNAMES_COLLECTION, leaving);
    const leavingClaim = leavingRef === null ? null : await transaction.get(leavingRef);

    if (previous === handle && held.exists()) return; // already theirs: nothing to write
    if (!held.exists()) transaction.set(handleRef, { uid, createdAt: sdk.serverTimestamp() });
    if (leavingRef !== null && leavingClaim?.exists() === true && (leavingClaim.data() as { uid?: unknown }).uid === uid) {
      transaction.delete(leavingRef);
    }
    transaction.set(profileRef, {
      username: handle,
      createdAt: profile.exists() ? (profile.data() as { createdAt?: unknown }).createdAt : sdk.serverTimestamp(),
      updatedAt: sdk.serverTimestamp(),
    });
  });
}

/**
 * Removes the profile and frees the handle, together. Nothing to do (and no error) for a person
 * who never picked one. This is what runs when an account is deleted.
 */
export async function removeUsername(uid: string): Promise<void> {
  const { db, sdk } = await open();
  const profileRef = sdk.doc(db, PROFILES_COLLECTION, uid);
  await withinTime(
    sdk.runTransaction(db, async (transaction) => {
      const profile = await transaction.get(profileRef);
      if (!profile.exists()) return;
      const username = (profile.data() as { username?: unknown }).username;
      const claimRef = typeof username === 'string' ? sdk.doc(db, USERNAMES_COLLECTION, username) : null;
      const claim = claimRef === null ? null : await transaction.get(claimRef);
      if (claimRef !== null && claim?.exists() === true && (claim.data() as { uid?: unknown }).uid === uid) {
        transaction.delete(claimRef);
      }
      transaction.delete(profileRef);
    }),
  );
}

/** Cleans up the profile and the handle when an account is deleted (see ./deleteHooks), after every other clean-up has worked. */
export function registerProfileCleanup(): () => void {
  return onBeforeAccountDelete((user) => removeUsername(user.uid), { last: true });
}

/**
 * Follows the person's profile, live, and answers from the saved copy at once when it has one.
 * An empty saved copy proves nothing (the phone may just not have fetched it yet), so that stays
 * `unknown` until the server has answered. Returns the way to stop.
 */
export function watchProfile(uid: string, onChange: (profile: ProfileState) => void): () => void {
  let stop: (() => void) | undefined;
  let stopped = false;
  void open()
    .then(({ db, sdk }) => {
      if (stopped) return;
      stop = sdk.onSnapshot(
        sdk.doc(db, PROFILES_COLLECTION, uid),
        { includeMetadataChanges: true },
        (snapshot) => {
          const username = snapshot.exists() ? (snapshot.data() as { username?: unknown }).username : undefined;
          if (typeof username === 'string') onChange({ status: 'ready', username });
          else if (snapshot.exists() || !snapshot.metadata.fromCache) onChange({ status: 'ready', username: null });
          else onChange({ status: 'unknown', username: null });
        },
        () => onChange({ status: 'unknown', username: null }),
      );
    })
    .catch(() => onChange({ status: 'unknown', username: null }));
  return () => {
    stopped = true;
    stop?.();
  };
}
