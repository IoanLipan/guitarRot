/**
 * The account service against the real Firebase Auth emulator
 * (`npm run test:cloud`). Nothing here is mocked except the Android plugin in
 * the last block: the SDK, the emulator and our service are the real ones.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteAccount,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  toAccountUser,
} from './auth';
import { onBeforeAccountDelete } from './deleteHooks';
import { sentEmails, uniqueEmail, waitForAccount } from './emulatorKit';
import { getFirebaseAuth, loadAuthSdk } from './firebase';
import { AccountError } from './types';

const PASSWORD = 'correct horse battery';

async function currentUser() {
  return (await getFirebaseAuth()).currentUser;
}

/** Runs `action` and gives back the AccountError it rejected with. */
async function failure(action: Promise<unknown>): Promise<AccountError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(AccountError);
    return error as AccountError;
  }
  throw new Error('Expected the action to fail.');
}

afterEach(async () => {
  vi.useRealTimers();
  await signOut();
});

describe('email and password, against the Auth emulator', () => {
  it('signs up with a display name, signs the person in and sends the verification email', async () => {
    const email = uniqueEmail('signup');
    await signUpWithEmail({ email, password: PASSWORD, displayName: '  Ada Lovelace ' });

    const state = await waitForAccount((s) => s.status === 'signed-in');
    expect(state.user).toMatchObject({ email, displayName: 'Ada Lovelace', providers: ['password'], emailVerified: false });
    expect(state.user?.uid).toBeTruthy();

    // Sent in the background, so it may land a moment after sign-up returns.
    await vi.waitFor(async () => {
      const sent = (await sentEmails()).filter((mail) => mail.email === email);
      expect(sent.map((mail) => mail.requestType)).toContain('VERIFY_EMAIL');
    });
  });

  it('signs out, and signs in again with the same details', async () => {
    const email = uniqueEmail('cycle');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Cycle' });
    await signOut();
    expect(await currentUser()).toBeNull();
    expect((await waitForAccount((s) => s.status === 'signed-out')).user).toBeNull();

    await signInWithEmail({ email: `  ${email}  `, password: PASSWORD });
    const state = await waitForAccount((s) => s.status === 'signed-in');
    expect(state.user).toMatchObject({ email, displayName: 'Cycle' });
  });

  it('says a wrong password in plain words, under the password field', async () => {
    const email = uniqueEmail('wrong');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Wrong' });
    await signOut();

    const error = await failure(signInWithEmail({ email, password: 'not the password' }));
    expect(error.field).toBe('password');
    expect(error.message).toMatch(/don’t match|isn’t right/);
    expect(error.message).not.toMatch(/auth\//);
    expect(await currentUser()).toBeNull();
  });

  it('does not tell a stranger whether an email has an account when signing in', async () => {
    const error = await failure(signInWithEmail({ email: uniqueEmail('nobody'), password: PASSWORD }));
    expect(error.message).toMatch(/don’t match|no account/i);
    expect(error.code).toMatch(/^auth\/(invalid-credential|user-not-found)$/);
  });

  it('refuses a second account on the same email, and a weak password', async () => {
    const email = uniqueEmail('twice');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Twice' });
    await signOut();

    const taken = await failure(signUpWithEmail({ email, password: PASSWORD, displayName: 'Twice' }));
    expect(taken.code).toBe('auth/email-already-in-use');
    expect(taken.field).toBe('email');

    const weak = await failure(signUpWithEmail({ email: uniqueEmail('weak'), password: '123', displayName: 'Weak' }));
    expect(weak.code).toBe('auth/weak-password');
    expect(weak.field).toBe('password');
  });

  it('sends a password reset email, and answers the same for an address with no account', async () => {
    const email = uniqueEmail('reset');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Reset' });
    await signOut();

    await expect(sendPasswordReset(email)).resolves.toBeUndefined();
    const sent = (await sentEmails()).filter((mail) => mail.email === email);
    expect(sent.map((mail) => mail.requestType)).toContain('PASSWORD_RESET');

    await expect(sendPasswordReset(uniqueEmail('ghost'))).resolves.toBeUndefined();
  });
});

describe('Google, against the emulator’s fake Google provider', () => {
  it('signs in with a Google ID token and maps the user', async () => {
    const auth = await getFirebaseAuth();
    const { GoogleAuthProvider, signInWithCredential } = await loadAuthSdk();
    const email = uniqueEmail('google');
    // The emulator accepts a JSON document where Google's real ID token would go.
    const idToken = JSON.stringify({ sub: `g-${email}`, email, email_verified: true, name: 'Grace Hopper' });

    const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));

    expect(toAccountUser(user)).toMatchObject({ email, emailVerified: true, providers: ['google.com'] });
    expect((await waitForAccount((s) => s.status === 'signed-in')).user?.email).toBe(email);
  });
});

describe('deleting the account, against the Auth emulator', () => {
  it('runs the registered hooks while the account still exists, then deletes it for good', async () => {
    const email = uniqueEmail('delete');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Delete Me' });
    const seen: { uid: string; stillSignedIn: boolean }[] = [];
    const unregister = onBeforeAccountDelete(async (user) => {
      seen.push({ uid: user.uid, stillSignedIn: (await currentUser())?.uid === user.uid });
    });
    const uid = (await currentUser())?.uid;

    await deleteAccount();
    unregister();

    expect(seen).toEqual([{ uid, stillSignedIn: true }]);
    expect(await currentUser()).toBeNull();
    // The user is really gone from the project, not just signed out here.
    const again = await failure(signInWithEmail({ email, password: PASSWORD }));
    expect(again.code).toMatch(/^auth\/(invalid-credential|user-not-found)$/);
  });

  it('keeps the account if a hook fails, so no cloud data is orphaned', async () => {
    const email = uniqueEmail('hookfail');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Hook Fail' });
    const unregister = onBeforeAccountDelete(() => {
      throw new Error('offline');
    });

    const error = await failure(deleteAccount());
    unregister();

    expect(error.code).toBe('cleanup-failed');
    expect(await currentUser()).not.toBeNull();
    await signOut();
    await expect(signInWithEmail({ email, password: PASSWORD })).resolves.toBeUndefined();
  });

  it('asks for a fresh sign-in after a long session, before anything is deleted', async () => {
    const email = uniqueEmail('stale');
    await signUpWithEmail({ email, password: PASSWORD, displayName: 'Stale' });
    const hook = vi.fn();
    const unregister = onBeforeAccountDelete(hook);

    // Ten minutes later the sign-in is too old for Firebase to delete the account on its say-so.
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 10 * 60_000 });

    const needsPassword = await failure(deleteAccount());
    expect(needsPassword.code).toBe('password-needed');
    expect(hook).not.toHaveBeenCalled();
    expect(await currentUser()).not.toBeNull();

    const wrong = await failure(deleteAccount({ password: 'wrong password' }));
    expect(wrong.field).toBe('password');
    expect(hook).not.toHaveBeenCalled();

    await deleteAccount({ password: PASSWORD });
    unregister();
    expect(hook).toHaveBeenCalledTimes(1);
    expect(await currentUser()).toBeNull();
  });
});
