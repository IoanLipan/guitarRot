/**
 * Google sign-in as it runs inside the Android app, against the Auth
 * emulator: the page believes it is native, and the Capacitor plugin (which
 * needs a phone) is stood in for by a function that returns the ID token a
 * real Google dialog would. Everything after that is real: the token goes to
 * the JS SDK, which signs in through the emulator's fake Google provider.
 *
 * Its own file because the app is created once per file, and a native app is
 * created differently (explicit persistence) from a browser's.
 */
import { describe, expect, it, vi } from 'vitest';
import { deleteAccount, signInWithGoogle, signOut, watchAccount } from './auth';
import { uniqueEmail } from './emulatorKit';
import { getFirebaseAuth } from './firebase';
import type { AccountState } from './types';

const plugin = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(async () => undefined),
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return { ...original, Capacitor: { ...original.Capacitor, isNativePlatform: () => true } };
});

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: { signInWithGoogle: plugin.signInWithGoogle, signOut: plugin.signOut },
}));

function signedIn(): Promise<AccountState> {
  return new Promise((resolve) => {
    const stop = watchAccount((state) => {
      if (state.status !== 'signed-in') return;
      queueMicrotask(() => stop());
      resolve(state);
    });
  });
}

describe('Google on Android', () => {
  it('signs in with the idToken the plugin returns, and signs the plugin out with the app', async () => {
    const email = uniqueEmail('native');
    plugin.signInWithGoogle.mockResolvedValueOnce({
      user: null,
      credential: {
        providerId: 'google.com',
        idToken: JSON.stringify({ sub: `native-${email}`, email, email_verified: true, name: 'Native Person' }),
      },
    });

    await signInWithGoogle();

    expect(plugin.signInWithGoogle).toHaveBeenCalledTimes(1);
    const state = await signedIn();
    expect(state.user).toMatchObject({ email, providers: ['google.com'], emailVerified: true });

    await signOut();
    expect(plugin.signOut).toHaveBeenCalledTimes(1);
    expect((await getFirebaseAuth()).currentUser).toBeNull();
  });

  it('treats a dismissed Google dialog as a choice, not an error to show', async () => {
    plugin.signInWithGoogle.mockRejectedValueOnce(new Error('activity is cancelled by the user.'));
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'cancelled', cancelled: true });
  });

  it('asks Google again to confirm a long-open session, then deletes the account', async () => {
    const email = uniqueEmail('native-delete');
    const token = JSON.stringify({ sub: `native-${email}`, email, email_verified: true });
    plugin.signInWithGoogle.mockResolvedValue({ user: null, credential: { providerId: 'google.com', idToken: token } });
    await signInWithGoogle();
    plugin.signInWithGoogle.mockClear();

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 10 * 60_000 });
    try {
      await deleteAccount();
    } finally {
      vi.useRealTimers();
    }

    expect(plugin.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect((await getFirebaseAuth()).currentUser).toBeNull();
  });
});
