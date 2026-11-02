import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { signInWithEmail, signInWithGoogle, signUpWithEmail, watchAccount } from './auth';

// How people get in is reported to analytics with GA4's recommended names; what these check is the mapping.
const analytics = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('./analytics', () => ({ track: analytics.track }));

const sdk = vi.hoisted(() => {
  class GoogleAuthProvider {
    static credential = vi.fn((idToken: string) => ({ idToken }));
    setCustomParameters = vi.fn();
  }
  return {
    GoogleAuthProvider,
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    updateProfile: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    signInWithCredential: vi.fn(),
    getRedirectResult: vi.fn(),
    getAdditionalUserInfo: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});
const plugin = vi.hoisted(() => ({ signInWithGoogle: vi.fn() }));

vi.mock('./firebase', () => ({
  getFirebaseAuth: async () => ({ currentUser: null }),
  loadAuthSdk: async () => sdk,
}));
vi.mock('@capacitor-firebase/authentication', () => ({ FirebaseAuthentication: plugin }));
vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return { ...original, Capacitor: { ...original.Capacitor, isNativePlatform: vi.fn(() => false) } };
});

const credential = { user: { uid: 'u1' } };

beforeEach(() => {
  for (const fn of [...Object.values(sdk), plugin.signInWithGoogle, analytics.track]) {
    if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  }
  sdk.GoogleAuthProvider.credential.mockImplementation((idToken: string) => ({ idToken }));
  sdk.createUserWithEmailAndPassword.mockResolvedValue(credential);
  sdk.signInWithEmailAndPassword.mockResolvedValue(credential);
  sdk.signInWithPopup.mockResolvedValue(credential);
  sdk.signInWithCredential.mockResolvedValue(credential);
  sdk.getRedirectResult.mockResolvedValue(null);
  sdk.updateProfile.mockResolvedValue(undefined);
  sdk.sendEmailVerification.mockResolvedValue(undefined);
  sdk.onAuthStateChanged.mockReturnValue(vi.fn());
  plugin.signInWithGoogle.mockResolvedValue({ credential: { idToken: 'google-id-token' } });
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
});

describe('sign-in events', () => {
  it('reports sign_up with the password method when an account is created with email', async () => {
    await signUpWithEmail({ email: 'ada@example.com', password: 'secret-123', displayName: 'Ada' });
    expect(analytics.track.mock.calls).toEqual([['sign_up', { method: 'password' }]]);
  });

  it('reports login with the password method for an email sign-in', async () => {
    await signInWithEmail({ email: 'ada@example.com', password: 'secret-123' });
    expect(analytics.track.mock.calls).toEqual([['login', { method: 'password' }]]);
  });

  it('reports sign_up for a first Google sign-in and login for a return, on the web', async () => {
    sdk.getAdditionalUserInfo.mockReturnValueOnce({ isNewUser: true }).mockReturnValueOnce({ isNewUser: false });
    await signInWithGoogle();
    await signInWithGoogle();
    expect(analytics.track.mock.calls).toEqual([
      ['sign_up', { method: 'google' }],
      ['login', { method: 'google' }],
    ]);
  });

  it('does the same through the native Google dialog on Android', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    sdk.getAdditionalUserInfo.mockReturnValue({ isNewUser: true });
    await signInWithGoogle();
    expect(analytics.track.mock.calls).toEqual([['sign_up', { method: 'google' }]]);
  });

  it('reports a Google sign-in that finished in a redirect, when the page comes back', async () => {
    sdk.getRedirectResult.mockResolvedValue(credential);
    sdk.getAdditionalUserInfo.mockReturnValue({ isNewUser: false });
    const stop = watchAccount(() => undefined);
    await vi.waitFor(() => expect(analytics.track).toHaveBeenCalled());
    expect(analytics.track.mock.calls).toEqual([['login', { method: 'google' }]]);
    stop();
  });

  it('reports nothing for a sign-in that failed', async () => {
    sdk.signInWithEmailAndPassword.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/wrong-password' }));
    await expect(signInWithEmail({ email: 'ada@example.com', password: 'nope-nope' })).rejects.toBeDefined();
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('never lets analytics fail a sign-in', async () => {
    sdk.getAdditionalUserInfo.mockImplementation(() => {
      throw new Error('no such function in this SDK');
    });
    await expect(signInWithGoogle()).resolves.toBeUndefined();
    expect(analytics.track).not.toHaveBeenCalled();
  });
});
