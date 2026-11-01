import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  deleteAccount,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  toAccountUser,
  watchAccount,
} from './auth';
import { onBeforeAccountDelete } from './deleteHooks';
import { AccountError, type AccountState } from './types';

// The Firebase SDK is stood in for: these tests are about what the service asks of it, and in what order.
const sdk = vi.hoisted(() => {
  class GoogleAuthProvider {
    static credential = vi.fn((idToken: string) => ({ kind: 'google-credential', idToken }));
    setCustomParameters = vi.fn();
  }
  return {
    GoogleAuthProvider,
    EmailAuthProvider: { credential: vi.fn((email: string, password: string) => ({ kind: 'email-credential', email, password })) },
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendEmailVerification: vi.fn(),
    updateProfile: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    signInWithCredential: vi.fn(),
    reauthenticateWithCredential: vi.fn(),
    reauthenticateWithPopup: vi.fn(),
    getRedirectResult: vi.fn(),
    deleteUser: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});
const auth = vi.hoisted(() => ({ currentUser: null as unknown }));
const plugin = vi.hoisted(() => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }));

vi.mock('./firebase', () => ({
  getFirebaseAuth: async () => auth,
  loadAuthSdk: async () => sdk,
}));
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: { signInWithGoogle: plugin.signInWithGoogle, signOut: plugin.signOut },
}));
vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return { ...original, Capacitor: { ...original.Capacitor, isNativePlatform: vi.fn(() => false) } };
});

type FakeUser = ReturnType<typeof makeUser>;

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'u1',
    email: 'ada@example.com',
    displayName: 'Ada',
    photoURL: null as string | null,
    emailVerified: false,
    providerData: [{ providerId: 'password' }],
    getIdTokenResult: vi.fn(async () => ({ authTime: new Date().toISOString() })),
    ...overrides,
  };
}

/** A person who signed in `minutes` ago. */
function userSignedInAgo(minutes: number, overrides: Record<string, unknown> = {}): FakeUser {
  return makeUser({
    getIdTokenResult: vi.fn(async () => ({ authTime: new Date(Date.now() - minutes * 60_000).toISOString() })),
    ...overrides,
  });
}

async function failure(action: Promise<unknown>): Promise<AccountError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(AccountError);
    return error as AccountError;
  }
  throw new Error('Expected the action to fail.');
}

function firebaseError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

beforeEach(() => {
  for (const fn of Object.values(sdk)) if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  for (const fn of [...Object.values(plugin), sdk.EmailAuthProvider.credential, sdk.GoogleAuthProvider.credential]) fn.mockReset();
  sdk.EmailAuthProvider.credential.mockImplementation((email: string, password: string) => ({ kind: 'email-credential', email, password }));
  sdk.GoogleAuthProvider.credential.mockImplementation((idToken: string) => ({ kind: 'google-credential', idToken }));
  sdk.getRedirectResult.mockResolvedValue(null);
  sdk.updateProfile.mockResolvedValue(undefined);
  sdk.sendEmailVerification.mockResolvedValue(undefined);
  sdk.deleteUser.mockResolvedValue(undefined);
  plugin.signOut.mockResolvedValue(undefined);
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  auth.currentUser = null;
});

describe('watching the account', () => {
  it('reports signed-out, then the signed-in user, from what Firebase tells it', async () => {
    const states: AccountState[] = [];
    let report: (user: unknown) => void = () => undefined;
    sdk.onAuthStateChanged.mockImplementation((_auth: unknown, next: (user: unknown) => void) => {
      report = next;
      return vi.fn();
    });

    const stop = watchAccount((state) => states.push(state));
    await vi.waitFor(() => expect(sdk.onAuthStateChanged).toHaveBeenCalled());

    report(null);
    report(makeUser({ photoURL: 'https://example.com/a.png', providerData: [{ providerId: 'google.com' }], emailVerified: true }));
    stop();

    expect(states).toEqual([
      { status: 'signed-out', user: null },
      {
        status: 'signed-in',
        user: {
          uid: 'u1',
          email: 'ada@example.com',
          displayName: 'Ada',
          photoURL: 'https://example.com/a.png',
          providers: ['google.com'],
          emailVerified: true,
        },
      },
    ]);
  });

  it('stops listening when told to, and says nothing after', async () => {
    const unsubscribe = vi.fn();
    sdk.onAuthStateChanged.mockReturnValue(unsubscribe);
    const stop = watchAccount(() => undefined);
    await vi.waitFor(() => expect(sdk.onAuthStateChanged).toHaveBeenCalled());
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('leaves out a photo the user does not have', () => {
    expect(toAccountUser(makeUser() as never)).not.toHaveProperty('photoURL');
  });
});

describe('email and password', () => {
  it('signs up, names the user, and sends the verification email without waiting on it', async () => {
    const user = makeUser({ displayName: null });
    sdk.createUserWithEmailAndPassword.mockResolvedValue({ user });

    await signUpWithEmail({ email: '  ada@example.com ', password: 'secret1', displayName: '  Ada L  ' });

    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ada@example.com', 'secret1');
    expect(sdk.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Ada L' });
    expect(sdk.sendEmailVerification).toHaveBeenCalledWith(user);
  });

  it('still signs up when the name or the verification email fails to go through', async () => {
    sdk.createUserWithEmailAndPassword.mockResolvedValue({ user: makeUser() });
    sdk.updateProfile.mockRejectedValue(firebaseError('auth/network-request-failed'));
    sdk.sendEmailVerification.mockRejectedValue(firebaseError('auth/too-many-requests'));

    await expect(signUpWithEmail({ email: 'a@b.co', password: 'secret1', displayName: 'A' })).resolves.toBeUndefined();
  });

  it('turns a Firebase failure into a sentence for the right field', async () => {
    sdk.createUserWithEmailAndPassword.mockRejectedValue(firebaseError('auth/email-already-in-use'));
    const error = await failure(signUpWithEmail({ email: 'a@b.co', password: 'secret1', displayName: 'A' }));
    expect(error).toMatchObject({ code: 'auth/email-already-in-use', field: 'email' });
    expect(error.message).not.toContain('auth/');
  });

  it('signs in with the trimmed email', async () => {
    sdk.signInWithEmailAndPassword.mockResolvedValue({ user: makeUser() });
    await signInWithEmail({ email: ' ada@example.com ', password: 'secret1' });
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ada@example.com', 'secret1');
  });

  it('resets a password, and keeps quiet about an address that has no account', async () => {
    sdk.sendPasswordResetEmail.mockResolvedValueOnce(undefined);
    await sendPasswordReset(' ada@example.com ');
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'ada@example.com');

    sdk.sendPasswordResetEmail.mockRejectedValueOnce(firebaseError('auth/user-not-found'));
    await expect(sendPasswordReset('ghost@example.com')).resolves.toBeUndefined();

    sdk.sendPasswordResetEmail.mockRejectedValueOnce(firebaseError('auth/network-request-failed'));
    expect((await failure(sendPasswordReset('ada@example.com'))).code).toBe('auth/network-request-failed');
  });
});

describe('Google', () => {
  it('opens the popup in a browser', async () => {
    sdk.signInWithPopup.mockResolvedValue({ user: makeUser() });
    await signInWithGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(plugin.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('falls back to a full-page redirect where the popup is blocked', async () => {
    sdk.signInWithPopup.mockRejectedValue(firebaseError('auth/popup-blocked'));
    sdk.signInWithRedirect.mockResolvedValue(undefined);
    await signInWithGoogle();
    expect(sdk.signInWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('does not redirect for a closed popup, which is the person changing their mind', async () => {
    sdk.signInWithPopup.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
    const error = await failure(signInWithGoogle());
    expect(error.cancelled).toBe(true);
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('on Android takes Google’s ID token from the native dialog and signs the JS SDK in with it', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithGoogle.mockResolvedValue({ user: null, credential: { idToken: 'google-id-token' } });
    sdk.signInWithCredential.mockResolvedValue({ user: makeUser() });

    await signInWithGoogle();

    expect(sdk.GoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token');
    expect(sdk.signInWithCredential).toHaveBeenCalledWith(auth, { kind: 'google-credential', idToken: 'google-id-token' });
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
  });

  it('on Android fails clearly when the dialog hands back no token', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithGoogle.mockResolvedValue({ user: null, credential: null });
    expect((await failure(signInWithGoogle())).code).toBe('auth/missing-id-token');
    expect(sdk.signInWithCredential).not.toHaveBeenCalled();
  });

  it('on Android treats a dismissed dialog as cancelled, and a phone with no Google account as a sentence', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithGoogle.mockRejectedValueOnce(new Error('activity is cancelled by the user.'));
    expect((await failure(signInWithGoogle())).cancelled).toBe(true);

    plugin.signInWithGoogle.mockRejectedValueOnce(new Error('No credential available'));
    expect((await failure(signInWithGoogle())).message).toMatch(/No Google account is on this phone/);
  });
});

describe('signing out', () => {
  it('signs the JS SDK out, and in the Android app the native Google choice too', async () => {
    sdk.signOut.mockResolvedValue(undefined);
    await signOut();
    expect(sdk.signOut).toHaveBeenCalledWith(auth);
    expect(plugin.signOut).not.toHaveBeenCalled();

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    await signOut();
    expect(plugin.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('deleting the account', () => {
  it('runs the hooks first, in order, and only then deletes the user', async () => {
    const user = userSignedInAgo(1);
    auth.currentUser = user;
    const calls: string[] = [];
    const offFirst = onBeforeAccountDelete(async (who) => {
      calls.push(`first:${who.uid}`);
    });
    const offSecond = onBeforeAccountDelete(() => {
      calls.push('second');
    });
    sdk.deleteUser.mockImplementation(async () => {
      calls.push('delete');
    });

    await deleteAccount();
    offFirst();
    offSecond();

    expect(calls).toEqual(['first:u1', 'second', 'delete']);
    expect(sdk.deleteUser).toHaveBeenCalledWith(user);
    expect(sdk.reauthenticateWithCredential).not.toHaveBeenCalled();
  });

  it('keeps the account when a hook fails, and says so', async () => {
    auth.currentUser = userSignedInAgo(1);
    const off = onBeforeAccountDelete(() => {
      throw new Error('firestore unavailable');
    });
    const error = await failure(deleteAccount());
    off();
    expect(error.code).toBe('cleanup-failed');
    expect(error.message).toMatch(/account was kept/);
    expect(sdk.deleteUser).not.toHaveBeenCalled();
  });

  it('after a long session asks a password account for the password BEFORE touching any data', async () => {
    auth.currentUser = userSignedInAgo(30);
    const hook = vi.fn();
    const off = onBeforeAccountDelete(hook);

    const error = await failure(deleteAccount());
    expect(error).toMatchObject({ code: 'password-needed', field: 'password' });
    expect(hook).not.toHaveBeenCalled();
    expect(sdk.deleteUser).not.toHaveBeenCalled();

    sdk.reauthenticateWithCredential.mockResolvedValue({});
    await deleteAccount({ password: 'secret1' });
    off();

    expect(sdk.EmailAuthProvider.credential).toHaveBeenCalledWith('ada@example.com', 'secret1');
    expect(sdk.reauthenticateWithCredential).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
  });

  it('after a long session signs a Google account in again through the popup', async () => {
    auth.currentUser = userSignedInAgo(30, { providerData: [{ providerId: 'google.com' }] });
    sdk.reauthenticateWithPopup.mockResolvedValue({});
    await deleteAccount();
    expect(sdk.reauthenticateWithPopup).toHaveBeenCalledTimes(1);
    expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
  });

  it('on Android signs a Google account in again with a fresh native ID token, then clears the native choice', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    auth.currentUser = userSignedInAgo(30, { providerData: [{ providerId: 'google.com' }] });
    plugin.signInWithGoogle.mockResolvedValue({ user: null, credential: { idToken: 'fresh-token' } });
    sdk.reauthenticateWithCredential.mockResolvedValue({});

    await deleteAccount();

    expect(sdk.reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, { kind: 'google-credential', idToken: 'fresh-token' });
    expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
    expect(plugin.signOut).toHaveBeenCalledTimes(1);
  });

  it('signs in again and retries if Firebase still asks for a recent login', async () => {
    auth.currentUser = userSignedInAgo(1);
    sdk.deleteUser.mockRejectedValueOnce(firebaseError('auth/requires-recent-login')).mockResolvedValueOnce(undefined);
    sdk.reauthenticateWithCredential.mockResolvedValue({});

    await deleteAccount({ password: 'secret1' });

    expect(sdk.reauthenticateWithCredential).toHaveBeenCalledTimes(1);
    expect(sdk.deleteUser).toHaveBeenCalledTimes(2);
  });

  it('asks for the password when Firebase wants a fresh login the age check did not foresee', async () => {
    auth.currentUser = userSignedInAgo(1);
    sdk.deleteUser.mockRejectedValueOnce(firebaseError('auth/requires-recent-login'));
    expect((await failure(deleteAccount())).code).toBe('password-needed');
  });

  it('says a wrong password under the password field, and deletes nothing', async () => {
    auth.currentUser = userSignedInAgo(30);
    sdk.reauthenticateWithCredential.mockRejectedValue(firebaseError('auth/wrong-password'));
    const error = await failure(deleteAccount({ password: 'nope' }));
    expect(error.field).toBe('password');
    expect(sdk.deleteUser).not.toHaveBeenCalled();
  });

  it('does nothing for someone who is not signed in', async () => {
    expect((await failure(deleteAccount())).code).toBe('signed-out');
    expect(sdk.deleteUser).not.toHaveBeenCalled();
  });
});
