import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  deleteAccount,
  sendPasswordReset,
  signInWithEmail,
  setUsername,
  signInWithApple,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  toAccountUser,
  watchAccount,
} from './auth';
import { onBeforeAccountDelete } from './deleteHooks';
import { AccountError, UsernameMissingError, type AccountState } from './types';

// The Firebase SDK is stood in for: these tests are about what the service asks of it, and in what order.
const sdk = vi.hoisted(() => {
  class GoogleAuthProvider {
    static credential = vi.fn((idToken: string) => ({ kind: 'google-credential', idToken }));
    setCustomParameters = vi.fn();
  }
  class OAuthProvider {
    static instances: OAuthProvider[] = [];
    scopes: string[] = [];
    providerId: string;
    constructor(providerId: string) {
      this.providerId = providerId;
      OAuthProvider.instances.push(this);
    }
    addScope = vi.fn((scope: string) => {
      this.scopes.push(scope);
      return this;
    });
    credential = vi.fn((init: { idToken: string; rawNonce: string }) => ({ kind: 'apple-credential', ...init }));
    static credentialFromResult = vi.fn();
  }
  return {
    GoogleAuthProvider,
    OAuthProvider,
    getAdditionalUserInfo: vi.fn(),
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
    revokeAccessToken: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});
const auth = vi.hoisted(() => ({ currentUser: null as unknown }));
const plugin = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  signOut: vi.fn(),
  deleteUser: vi.fn(),
  revokeAccessToken: vi.fn(),
}));
// The Firestore half of usernames has its own tests; here it is a stand-in that answers what these ask.
const usernames = vi.hoisted(() => ({
  checkUsername: vi.fn(),
  claimUsername: vi.fn(),
  registerProfileCleanup: vi.fn(() => () => undefined),
}));

vi.mock('./firebase', () => ({
  getFirebaseAuth: async () => auth,
  loadAuthSdk: async () => sdk,
}));
vi.mock('./usernames', () => usernames);
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: plugin.signInWithGoogle,
    signInWithApple: plugin.signInWithApple,
    signOut: plugin.signOut,
    deleteUser: plugin.deleteUser,
    revokeAccessToken: plugin.revokeAccessToken,
  },
}));
vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return { ...original, Capacitor: { ...original.Capacitor, isNativePlatform: vi.fn(() => false), getPlatform: vi.fn(() => 'web') } };
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
  usernames.checkUsername.mockReset().mockResolvedValue('available');
  usernames.claimUsername.mockReset().mockImplementation(async (_uid: string, handle: string) => handle.trim().toLowerCase());
  sdk.OAuthProvider.instances.length = 0;
  sdk.OAuthProvider.credentialFromResult.mockReset();
  sdk.EmailAuthProvider.credential.mockImplementation((email: string, password: string) => ({ kind: 'email-credential', email, password }));
  sdk.GoogleAuthProvider.credential.mockImplementation((idToken: string) => ({ kind: 'google-credential', idToken }));
  sdk.getRedirectResult.mockResolvedValue(null);
  sdk.updateProfile.mockResolvedValue(undefined);
  sdk.sendEmailVerification.mockResolvedValue(undefined);
  sdk.deleteUser.mockResolvedValue(undefined);
  plugin.signOut.mockResolvedValue(undefined);
  sdk.revokeAccessToken.mockResolvedValue(undefined);
  plugin.deleteUser.mockResolvedValue(undefined);
  plugin.revokeAccessToken.mockResolvedValue(undefined);
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
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
  it('signs up, claims the username as the name, and sends the verification email without waiting on it', async () => {
    const user = makeUser({ displayName: null });
    sdk.createUserWithEmailAndPassword.mockResolvedValue({ user });

    await signUpWithEmail({ email: '  ada@example.com ', password: 'secret12', username: '  Ada_L ' });

    expect(usernames.checkUsername).toHaveBeenCalledWith('ada_l');
    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ada@example.com', 'secret12');
    expect(usernames.claimUsername).toHaveBeenCalledWith('u1', 'ada_l');
    expect(sdk.updateProfile).toHaveBeenCalledWith(user, { displayName: 'ada_l' });
    expect(sdk.sendEmailVerification).toHaveBeenCalledWith(user);
  });

  it('refuses a username that breaks the shape before it asks anyone anything', async () => {
    const error = await failure(signUpWithEmail({ email: 'a@b.co', password: 'secret12', username: 'a b' }));
    expect(error).toMatchObject({ code: 'username-invalid', field: 'username' });
    expect(usernames.checkUsername).not.toHaveBeenCalled();
    expect(sdk.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('does not create an account for a username that is already taken', async () => {
    usernames.checkUsername.mockResolvedValue('taken');
    const error = await failure(signUpWithEmail({ email: 'a@b.co', password: 'secret12', username: 'ada' }));
    expect(error).toMatchObject({ code: 'username-taken', field: 'username' });
    // Refused up front: no account was made, so this is not the signed-in-without-a-name case.
    expect(error).not.toBeInstanceOf(UsernameMissingError);
    expect(sdk.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('goes ahead when the availability check itself cannot be made, and lets the claim decide', async () => {
    usernames.checkUsername.mockRejectedValue(new Error('offline'));
    sdk.createUserWithEmailAndPassword.mockResolvedValue({ user: makeUser() });
    await expect(signUpWithEmail({ email: 'a@b.co', password: 'secret12', username: 'ada' })).resolves.toBeUndefined();
    expect(usernames.claimUsername).toHaveBeenCalledTimes(1);
  });

  it('leaves the new account signed in, and says the username is taken, when someone claims it first', async () => {
    sdk.createUserWithEmailAndPassword.mockResolvedValue({ user: makeUser() });
    usernames.claimUsername.mockRejectedValue(new AccountError('username-taken', 'That username is taken.', 'username'));

    const error = await failure(signUpWithEmail({ email: 'a@b.co', password: 'secret12', username: 'ada' }));

    expect(error).toMatchObject({ code: 'username-taken', field: 'username' });
    expect(error).toBeInstanceOf(UsernameMissingError);
    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(sdk.deleteUser).not.toHaveBeenCalled();
    expect(sdk.updateProfile).not.toHaveBeenCalled();
  });

  it('still signs up when the name or the verification email fails to go through', async () => {
    sdk.createUserWithEmailAndPassword.mockResolvedValue({ user: makeUser() });
    sdk.updateProfile.mockRejectedValue(firebaseError('auth/network-request-failed'));
    sdk.sendEmailVerification.mockRejectedValue(firebaseError('auth/too-many-requests'));

    await expect(signUpWithEmail({ email: 'a@b.co', password: 'secret12', username: 'ada' })).resolves.toBeUndefined();
  });

  it('turns a Firebase failure into a sentence for the right field', async () => {
    sdk.createUserWithEmailAndPassword.mockRejectedValue(firebaseError('auth/email-already-in-use'));
    const error = await failure(signUpWithEmail({ email: 'a@b.co', password: 'secret12', username: 'ada' }));
    expect(error).toMatchObject({ code: 'auth/email-already-in-use', field: 'email' });
    expect(error.message).not.toContain('auth/');
    expect(usernames.claimUsername).not.toHaveBeenCalled();
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

describe('setting a username', () => {
  it('claims it for the signed-in user and makes it the account’s name', async () => {
    const user = makeUser({ displayName: 'Ada Lovelace' });
    auth.currentUser = user;
    await setUsername(' Ada_L ');
    expect(usernames.claimUsername).toHaveBeenCalledWith('u1', ' Ada_L ');
    expect(sdk.updateProfile).toHaveBeenCalledWith(user, { displayName: 'ada_l' });
  });

  it('leaves the name alone when it already is the username', async () => {
    auth.currentUser = makeUser({ displayName: 'ada_l' });
    await setUsername('ada_l');
    expect(sdk.updateProfile).not.toHaveBeenCalled();
  });

  it('says so when nobody is signed in, and passes a taken username on for the field', async () => {
    expect((await failure(setUsername('ada'))).code).toBe('signed-out');
    auth.currentUser = makeUser();
    usernames.claimUsername.mockRejectedValue(new AccountError('username-taken', 'That username is taken.', 'username'));
    expect(await failure(setUsername('ada'))).toMatchObject({ code: 'username-taken', field: 'username' });
  });
});

describe('Apple', () => {
  it('opens the popup in a browser, asking for the email and the name', async () => {
    sdk.signInWithPopup.mockResolvedValue({ user: makeUser() });
    await signInWithApple();
    expect(sdk.signInWithPopup).toHaveBeenCalledTimes(1);
    const provider = sdk.OAuthProvider.instances[0];
    expect(provider).toMatchObject({ providerId: 'apple.com', scopes: ['email', 'name'] });
    expect(sdk.signInWithPopup.mock.calls[0]?.[1]).toBe(provider);
    expect(plugin.signInWithApple).not.toHaveBeenCalled();
  });

  it('falls back to a full-page redirect where the popup is blocked', async () => {
    sdk.signInWithPopup.mockRejectedValue(firebaseError('auth/popup-blocked'));
    sdk.signInWithRedirect.mockResolvedValue(undefined);
    await signInWithApple();
    expect(sdk.signInWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('treats a closed popup as the person changing their mind', async () => {
    sdk.signInWithPopup.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
    expect((await failure(signInWithApple())).cancelled).toBe(true);
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('on Android signs the JS SDK in with Apple’s ID token and the raw nonce, then clears the native user', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithApple.mockResolvedValue({
      user: { displayName: 'Ada Lovelace' },
      credential: { providerId: 'apple.com', idToken: 'apple-id-token', nonce: 'raw-nonce' },
    });
    const user = makeUser({ displayName: null });
    sdk.signInWithCredential.mockResolvedValue({ user });

    await signInWithApple();

    expect(plugin.signInWithApple).toHaveBeenCalledWith({ scopes: ['email', 'name'] });
    const provider = sdk.OAuthProvider.instances[0];
    expect(provider?.credential).toHaveBeenCalledWith({ idToken: 'apple-id-token', rawNonce: 'raw-nonce' });
    expect(sdk.signInWithCredential).toHaveBeenCalledWith(auth, { kind: 'apple-credential', idToken: 'apple-id-token', rawNonce: 'raw-nonce' });
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
    // The plugin signed a native user in as well; there must be one auth state, so it goes.
    expect(plugin.signOut).toHaveBeenCalledTimes(1);
    // Apple's token has no name in it; the one Apple shared with the plugin is kept.
    expect(sdk.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Ada Lovelace' });
  });

  it('on Android does not overwrite a name the account already has', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithApple.mockResolvedValue({
      user: { displayName: 'Someone Else' },
      credential: { idToken: 'apple-id-token', nonce: 'raw-nonce' },
    });
    sdk.signInWithCredential.mockResolvedValue({ user: makeUser({ displayName: 'ada_l' }) });
    await signInWithApple();
    expect(sdk.updateProfile).not.toHaveBeenCalled();
  });

  it('on Android fails clearly when Apple hands back no token or no nonce, and still clears the native user', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithApple.mockResolvedValueOnce({ user: null, credential: { nonce: 'raw-nonce' } });
    expect((await failure(signInWithApple())).code).toBe('auth/missing-id-token');
    plugin.signInWithApple.mockResolvedValueOnce({ user: null, credential: { idToken: 'apple-id-token' } });
    expect((await failure(signInWithApple())).code).toBe('auth/missing-id-token');
    expect(sdk.signInWithCredential).not.toHaveBeenCalled();
    expect(plugin.signOut).toHaveBeenCalledTimes(2);
  });

  it('on Android treats a dismissed browser tab as cancelled', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    plugin.signInWithApple.mockRejectedValue(new Error('The user canceled the sign-in flow.'));
    expect((await failure(signInWithApple())).cancelled).toBe(true);
  });
});

// The same Apple code path serves iOS; what differs is what the plugin hands back. Its iOS handler runs the system's
// own Sign in with Apple sheet (ASAuthorization) and honours `skipNativeAuth`, so there is no native Firebase user to
// clear, the nonce it returns is the raw one (Apple was sent its SHA-256), and the name comes only on the first sign-in.
describe('Apple on iOS', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  it('signs the JS SDK in with the ID token and raw nonce of the system sheet, and saves the name from the first sign-in', async () => {
    plugin.signInWithApple.mockResolvedValue({
      user: { displayName: 'Ada Lovelace' },
      credential: { providerId: 'apple.com', idToken: 'apple-id-token', nonce: 'raw-nonce', authorizationCode: 'one-time-code' },
      additionalUserInfo: null,
    });
    const user = makeUser({ displayName: null });
    sdk.signInWithCredential.mockResolvedValue({ user });

    await signInWithApple();

    expect(sdk.OAuthProvider.instances[0]?.credential).toHaveBeenCalledWith({ idToken: 'apple-id-token', rawNonce: 'raw-nonce' });
    expect(sdk.signInWithCredential).toHaveBeenCalledWith(auth, { kind: 'apple-credential', idToken: 'apple-id-token', rawNonce: 'raw-nonce' });
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
    expect(sdk.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Ada Lovelace' });
  });

  it('signs in on a return visit, when Apple shares no name and the plugin reports no user at all', async () => {
    plugin.signInWithApple.mockResolvedValue({
      user: null,
      credential: { providerId: 'apple.com', idToken: 'apple-id-token', nonce: 'raw-nonce' },
      additionalUserInfo: null,
    });
    sdk.signInWithCredential.mockResolvedValue({ user: makeUser({ displayName: 'ada_l' }) });

    await signInWithApple();

    expect(sdk.signInWithCredential).toHaveBeenCalledTimes(1);
    expect(sdk.updateProfile).not.toHaveBeenCalled();
  });

  it('treats the person closing the Apple sheet as a choice, not an error to show', async () => {
    plugin.signInWithApple.mockRejectedValue(
      Object.assign(new Error('The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)'), {
        code: undefined,
      }),
    );
    const error = await failure(signInWithApple());
    expect(error.cancelled).toBe(true);
    expect(error.message).toBe('');
    expect(sdk.signInWithCredential).not.toHaveBeenCalled();
  });

  it('says something went wrong for Apple’s other failures, such as a phone with no Apple ID', async () => {
    plugin.signInWithApple.mockRejectedValue(
      new Error('The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)'),
    );
    const error = await failure(signInWithApple());
    expect(error.cancelled).toBe(false);
    expect(error.message).toBe('Something went wrong. Please try again.');
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

// App Store rule 5.1.1(v): an account made with Sign in with Apple must have Apple's token revoked when it is deleted.
// Revoking needs a fresh Apple credential, so the Apple person goes through Apple once more (which is also the fresh
// sign-in Firebase wants), and it happens BEFORE any data goes: a failed revoke keeps the account and can be retried.
describe('deleting an Apple account revokes Apple’s token first', () => {
  const appleUser = (minutes = 1, overrides: Record<string, unknown> = {}) =>
    userSignedInAgo(minutes, { providerData: [{ providerId: 'apple.com' }], ...overrides });

  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    vi.useRealTimers();
  });

  /** Records the order of the steps that matter. */
  function trace(): string[] {
    const calls: string[] = [];
    sdk.reauthenticateWithPopup.mockImplementation(async () => {
      calls.push('reauth');
      return { user: auth.currentUser };
    });
    sdk.reauthenticateWithCredential.mockImplementation(async () => {
      calls.push('reauth');
      return {};
    });
    sdk.revokeAccessToken.mockImplementation(async () => {
      calls.push('revoke');
    });
    plugin.revokeAccessToken.mockImplementation(async () => {
      calls.push('revoke');
    });
    sdk.deleteUser.mockImplementation(async () => {
      calls.push('delete');
    });
    return calls;
  }

  describe('on the web', () => {
    it('signs in with Apple again, revokes the access token it gets, and only then runs the hooks and deletes', async () => {
      auth.currentUser = appleUser(1);
      const calls = trace();
      sdk.OAuthProvider.credentialFromResult.mockReturnValue({ accessToken: 'apple-access-token' });
      const off = onBeforeAccountDelete(() => {
        calls.push('hook');
      });

      await deleteAccount();
      off();

      // Even a sign-in a minute old: revoking needs a fresh credential.
      expect(calls).toEqual(['reauth', 'revoke', 'hook', 'delete']);
      expect(sdk.revokeAccessToken).toHaveBeenCalledWith(auth, 'apple-access-token');
      expect(plugin.revokeAccessToken).not.toHaveBeenCalled();
    });

    it('stops with nothing deleted when the person closes Apple’s window', async () => {
      auth.currentUser = appleUser(1);
      sdk.reauthenticateWithPopup.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
      const hook = vi.fn();
      const off = onBeforeAccountDelete(hook);

      expect((await failure(deleteAccount())).cancelled).toBe(true);
      off();
      expect(sdk.revokeAccessToken).not.toHaveBeenCalled();
      expect(hook).not.toHaveBeenCalled();
      expect(sdk.deleteUser).not.toHaveBeenCalled();
    });

    it('refuses an Apple ID that is not the account’s, and deletes nothing', async () => {
      auth.currentUser = appleUser(1);
      sdk.reauthenticateWithPopup.mockRejectedValue(firebaseError('auth/user-mismatch'));
      const error = await failure(deleteAccount());
      expect(error.code).toBe('auth/user-mismatch');
      expect(sdk.revokeAccessToken).not.toHaveBeenCalled();
      expect(sdk.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('on Android (Firebase’s browser flow, through the plugin)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    });

    it('re-authenticates with the ID token and nonce, revokes the access token the plugin returned through the JS SDK, then clears the native user', async () => {
      auth.currentUser = appleUser(1);
      const calls = trace();
      plugin.signInWithApple.mockResolvedValue({
        user: { uid: 'u1' },
        credential: { idToken: 'fresh-apple', nonce: 'fresh-nonce', accessToken: 'android-access-token' },
      });

      await deleteAccount();

      expect(plugin.signInWithApple).toHaveBeenCalledWith({ scopes: ['email', 'name'] });
      expect(sdk.reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, {
        kind: 'apple-credential',
        idToken: 'fresh-apple',
        rawNonce: 'fresh-nonce',
      });
      expect(sdk.revokeAccessToken).toHaveBeenCalledWith(auth, 'android-access-token');
      expect(plugin.revokeAccessToken).not.toHaveBeenCalled();
      expect(calls).toEqual(['reauth', 'revoke', 'delete']);
      expect(plugin.signOut).toHaveBeenCalled();
    });
  });

  describe('on iOS (the system sheet, through the plugin)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    });

    const sheet = (overrides: Record<string, unknown> = {}) => ({
      user: { uid: 'u1', displayName: null },
      credential: { providerId: 'apple.com', idToken: 'ios-id-token', nonce: 'ios-raw-nonce', authorizationCode: 'one-time-code' },
      additionalUserInfo: { isNewUser: false },
      ...overrides,
    });

    it('keeps a native user for the sheet, re-authenticates, revokes the one-time code natively, then signs the native user out', async () => {
      auth.currentUser = appleUser(1);
      const calls = trace();
      plugin.signInWithApple.mockResolvedValue(sheet());
      const off = onBeforeAccountDelete(() => {
        calls.push('hook');
      });

      await deleteAccount();
      off();

      // The plugin's revoke asks the native SDK's current user for its token, so this one sign-in must make that user.
      expect(plugin.signInWithApple).toHaveBeenCalledWith({ scopes: ['email', 'name'], skipNativeAuth: false });
      expect(sdk.reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, {
        kind: 'apple-credential',
        idToken: 'ios-id-token',
        rawNonce: 'ios-raw-nonce',
      });
      expect(plugin.revokeAccessToken).toHaveBeenCalledWith({ token: 'one-time-code' });
      // The JS SDK's revoke only takes an access token, never the code.
      expect(sdk.revokeAccessToken).not.toHaveBeenCalled();
      expect(calls).toEqual(['reauth', 'revoke', 'hook', 'delete']);
      expect(plugin.signOut).toHaveBeenCalled();
      expect(plugin.deleteUser).not.toHaveBeenCalled();
    });

    it('does not trust a revoke that never answers, and keeps the account', async () => {
      vi.useFakeTimers();
      auth.currentUser = appleUser(1);
      plugin.signInWithApple.mockResolvedValue(sheet());
      sdk.reauthenticateWithCredential.mockResolvedValue({});
      plugin.revokeAccessToken.mockReturnValue(new Promise(() => undefined));

      const attempt = failure(deleteAccount());
      await vi.advanceTimersByTimeAsync(30_000);
      const error = await attempt;

      expect(error.code).toBe('apple-revoke-failed');
      expect(sdk.deleteUser).not.toHaveBeenCalled();
      expect(plugin.signOut).toHaveBeenCalled();
    });

    it('never calls the plugin’s revoke without a native user, which would wait for ever, and warns instead', async () => {
      auth.currentUser = appleUser(1);
      plugin.signInWithApple.mockResolvedValue(sheet({ user: { displayName: null } }));
      sdk.reauthenticateWithCredential.mockResolvedValue({});

      await deleteAccount();

      expect(plugin.revokeAccessToken).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
      expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
    });

    it('drops the empty account the sheet just made when the phone’s Apple ID is not the account’s, and deletes nothing', async () => {
      auth.currentUser = appleUser(1);
      plugin.signInWithApple.mockResolvedValue(sheet({ user: { uid: 'someone-else' }, additionalUserInfo: { isNewUser: true } }));

      const error = await failure(deleteAccount());

      expect(error.code).toBe('auth/user-mismatch');
      expect(plugin.deleteUser).toHaveBeenCalledTimes(1);
      expect(plugin.revokeAccessToken).not.toHaveBeenCalled();
      expect(sdk.reauthenticateWithCredential).not.toHaveBeenCalled();
      expect(sdk.deleteUser).not.toHaveBeenCalled();
      expect(plugin.signOut).toHaveBeenCalled();
    });

    it('only signs out, and deletes nobody, when the other Apple ID already had an account of its own', async () => {
      auth.currentUser = appleUser(1);
      plugin.signInWithApple.mockResolvedValue(sheet({ user: { uid: 'someone-else' }, additionalUserInfo: { isNewUser: false } }));

      expect((await failure(deleteAccount())).code).toBe('auth/user-mismatch');
      expect(plugin.deleteUser).not.toHaveBeenCalled();
      expect(plugin.signOut).toHaveBeenCalled();
    });

    it('stops with nothing deleted when the person dismisses the sheet', async () => {
      auth.currentUser = appleUser(1);
      plugin.signInWithApple.mockRejectedValue(
        new Error('The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)'),
      );
      expect((await failure(deleteAccount())).cancelled).toBe(true);
      expect(plugin.revokeAccessToken).not.toHaveBeenCalled();
      expect(sdk.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('when the revoke fails', () => {
    beforeEach(() => {
      auth.currentUser = appleUser(1);
      sdk.reauthenticateWithPopup.mockResolvedValue({});
      sdk.OAuthProvider.credentialFromResult.mockReturnValue({ accessToken: 'apple-access-token' });
    });

    it.each(['auth/network-request-failed', 'auth/too-many-requests', 'auth/internal-error'])(
      'keeps the account, runs no hook and says to try again, for %s',
      async (code) => {
        sdk.revokeAccessToken.mockRejectedValue(firebaseError(code));
        const hook = vi.fn();
        const off = onBeforeAccountDelete(hook);

        const error = await failure(deleteAccount());
        off();

        expect(error.code).toBe('apple-revoke-failed');
        expect(error.message).toMatch(/account was kept/);
        expect(hook).not.toHaveBeenCalled();
        expect(sdk.deleteUser).not.toHaveBeenCalled();
      },
    );

    it('can be retried: the next attempt revokes again and deletes', async () => {
      sdk.revokeAccessToken.mockRejectedValueOnce(firebaseError('auth/network-request-failed')).mockResolvedValueOnce(undefined);
      await failure(deleteAccount());
      await deleteAccount();
      expect(sdk.revokeAccessToken).toHaveBeenCalledTimes(2);
      expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
    });

    it.each(['auth/invalid-credential', 'auth/invalid-idp-response'])(
      'deletes anyway, and says so in the console, when Apple no longer knows the token (%s)',
      async (code) => {
        sdk.revokeAccessToken.mockRejectedValue(firebaseError(code));
        await deleteAccount();
        expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalled();
      },
    );

    it('deletes anyway, and says so in the console, when Firebase gave no token to revoke (the Apple key is not set up)', async () => {
      sdk.OAuthProvider.credentialFromResult.mockReturnValue({ accessToken: undefined });
      await deleteAccount();
      expect(sdk.revokeAccessToken).not.toHaveBeenCalled();
      expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalled();
    });
  });

  it('leaves the other ways of signing in alone: no Apple sign-in and no revoke for a password or a Google account', async () => {
    for (const providerId of ['password', 'google.com']) {
      auth.currentUser = userSignedInAgo(1, { providerData: [{ providerId }] });
      await deleteAccount();
    }
    expect(sdk.reauthenticateWithPopup).not.toHaveBeenCalled();
    expect(plugin.signInWithApple).not.toHaveBeenCalled();
    expect(sdk.revokeAccessToken).not.toHaveBeenCalled();
    expect(plugin.revokeAccessToken).not.toHaveBeenCalled();
    expect(sdk.deleteUser).toHaveBeenCalledTimes(2);
  });

  it('keeps the account when a hook fails after the revoke, and the retry goes through Apple again', async () => {
    auth.currentUser = appleUser(1);
    sdk.reauthenticateWithPopup.mockResolvedValue({});
    sdk.OAuthProvider.credentialFromResult.mockReturnValue({ accessToken: 'apple-access-token' });
    const off = onBeforeAccountDelete(() => {
      throw new Error('firestore unavailable');
    });
    expect((await failure(deleteAccount())).code).toBe('cleanup-failed');
    off();
    expect(sdk.deleteUser).not.toHaveBeenCalled();

    await deleteAccount();
    expect(sdk.reauthenticateWithPopup).toHaveBeenCalledTimes(2);
    expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
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

  it('after a long session signs an Apple account in again through the popup', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined); // no token in this stand-in: see the Apple tests above
    auth.currentUser = userSignedInAgo(30, { providerData: [{ providerId: 'apple.com' }] });
    sdk.reauthenticateWithPopup.mockResolvedValue({});
    await deleteAccount();
    warn.mockRestore();
    expect(sdk.reauthenticateWithPopup).toHaveBeenCalledTimes(1);
    expect(sdk.OAuthProvider.instances[0]?.providerId).toBe('apple.com');
    expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
  });

  it('on Android signs an Apple account in again with a fresh ID token and nonce, then clears the native user', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined); // no token in this stand-in: see the Apple tests above
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    auth.currentUser = userSignedInAgo(30, { providerData: [{ providerId: 'apple.com' }] });
    plugin.signInWithApple.mockResolvedValue({ user: null, credential: { idToken: 'fresh-apple', nonce: 'fresh-nonce' } });
    sdk.reauthenticateWithCredential.mockResolvedValue({});

    await deleteAccount();
    warn.mockRestore();

    expect(sdk.reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, {
      kind: 'apple-credential',
      idToken: 'fresh-apple',
      rawNonce: 'fresh-nonce',
    });
    expect(sdk.deleteUser).toHaveBeenCalledTimes(1);
    expect(plugin.signOut).toHaveBeenCalled();
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
