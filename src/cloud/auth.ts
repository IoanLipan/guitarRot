/**
 * Accounts, on Firebase Auth. This module is loaded on demand (the provider
 * imports it after the first paint), and reaches the SDK only through
 * ./firebase, so it never costs a build or a screen that has no accounts.
 *
 * One auth state rules the app: the JS SDK's. On the web Google signs in
 * through a popup (a redirect where popups are blocked). Google refuses OAuth
 * inside an Android WebView, so there the native Google dialog does it
 * (@capacitor-firebase/authentication, `skipNativeAuth`): the plugin only
 * fetches Google's ID token, and the JS SDK signs in with it, exactly as if
 * the popup had done it.
 */
import type { Auth, User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { runBeforeDeleteHooks } from './deleteHooks';
import { toAccountError } from './errors';
import { getFirebaseAuth, loadAuthSdk } from './firebase';
import {
  AccountError,
  GOOGLE_PROVIDER,
  PASSWORD_PROVIDER,
  type AccountState,
  type AccountUser,
  type DeleteAccountInput,
  type SignInInput,
  type SignUpInput,
} from './types';

type AuthSdk = Awaited<ReturnType<typeof loadAuthSdk>>;

/** Firebase calls a sign-in "recent" for about five minutes; stay safely inside that. */
const FRESH_SIGN_IN_MS = 4 * 60_000;

async function load(): Promise<{ auth: Auth; sdk: AuthSdk }> {
  const [auth, sdk] = await Promise.all([getFirebaseAuth(), loadAuthSdk()]);
  return { auth, sdk };
}

export function toAccountUser(user: User): AccountUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    ...(user.photoURL !== null ? { photoURL: user.photoURL } : {}),
    providers: user.providerData.map((info) => info.providerId),
    emailVerified: user.emailVerified,
  };
}

const SIGNED_OUT: AccountState = { status: 'signed-out', user: null };

/** Pushes the current user to the watcher again: Firebase stays quiet when only the profile changed. */
let publishCurrent: (() => void) | null = null;

/**
 * Reports the account's state now and on every change (sign-in, sign-out,
 * deletion, another tab). The first report is the stored user, if any, and
 * needs no network. Returns the function that stops watching.
 */
export function watchAccount(onState: (state: AccountState) => void): () => void {
  let stopped = false;
  let unsubscribe: (() => void) | undefined;
  let republish: (() => void) | undefined;

  void load()
    .then(({ auth, sdk }) => {
      if (stopped) return;
      const report = (user: User | null) => {
        if (!stopped) onState(user === null ? SIGNED_OUT : { status: 'signed-in', user: toAccountUser(user) });
      };
      republish = () => report(auth.currentUser);
      publishCurrent = republish;
      unsubscribe = sdk.onAuthStateChanged(auth, report);
      // Back from a Google redirect: finishing it signs the user in (and the listener above hears it).
      if (!Capacitor.isNativePlatform()) void sdk.getRedirectResult(auth).catch(() => undefined);
    })
    .catch(() => {
      // The SDK could not be fetched (offline on a first visit). Show the sign-in card; an action retries the load.
      if (!stopped) onState(SIGNED_OUT);
    });

  return () => {
    stopped = true;
    if (publishCurrent === republish) publishCurrent = null;
    unsubscribe?.();
  };
}

export async function signUpWithEmail({ email, password, displayName }: SignUpInput): Promise<void> {
  try {
    const { auth, sdk } = await load();
    const { user } = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
    const name = displayName.trim();
    // The account exists now: a name that fails to save is not worth failing the sign-up for.
    if (name !== '') await sdk.updateProfile(user, { displayName: name }).catch(() => undefined);
    publishCurrent?.();
    // A courtesy, never a gate: the app works unverified, and a failure here is no one's problem.
    void sdk.sendEmailVerification(user).catch(() => undefined);
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function signInWithEmail({ email, password }: SignInInput): Promise<void> {
  try {
    const { auth, sdk } = await load();
    await sdk.signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    const { auth, sdk } = await load();
    await sdk.sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    const failure = toAccountError(error);
    // "No account with that email" is never said out loud here: the screen answers the same either way.
    if (failure.code !== 'auth/user-not-found') throw failure;
  }
}

/** Opens the Android dialog that lists the phone's Google accounts, and returns Google's ID token for the one picked. */
async function nativeGoogleIdToken(): Promise<string> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  if (idToken === undefined || idToken === null || idToken === '') {
    throw new AccountError('auth/missing-id-token', 'Google didn’t send back a sign-in. Please try again.');
  }
  return idToken;
}

/** Clears the phone's remembered Google choice, so the next sign-in asks which account again. */
async function nativeSignOut(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signOut();
  } catch {
    // Nothing native to clear; the JS sign-out is what matters.
  }
}

export async function signInWithGoogle(): Promise<void> {
  try {
    const { auth, sdk } = await load();
    if (Capacitor.isNativePlatform()) {
      const credential = sdk.GoogleAuthProvider.credential(await nativeGoogleIdToken());
      await sdk.signInWithCredential(auth, credential);
      return;
    }
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await sdk.signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      // Some browsers (and in-app browsers) cannot open the popup; a full-page redirect can.
      if (code !== 'auth/popup-blocked' && code !== 'auth/operation-not-supported-in-this-environment') throw error;
      await sdk.signInWithRedirect(auth, provider);
    }
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function signOut(): Promise<void> {
  try {
    const { auth, sdk } = await load();
    await sdk.signOut(auth);
    await nativeSignOut();
  } catch (error) {
    throw toAccountError(error);
  }
}

/** True when the person signed in too long ago for Firebase to let them delete the account without doing it again. */
async function signInIsStale(user: User): Promise<boolean> {
  try {
    const { authTime } = await user.getIdTokenResult();
    return Date.now() - Date.parse(authTime) > FRESH_SIGN_IN_MS;
  } catch {
    // Offline with no token to read: let the delete itself say what it needs.
    return false;
  }
}

/** Signs the person in again, the way they signed in the first time, so a sensitive change is allowed. */
async function reauthenticate(sdk: AuthSdk, user: User, password: string | undefined): Promise<void> {
  const methods = user.providerData.map((info) => info.providerId);
  const hasPassword = methods.includes(PASSWORD_PROVIDER) && user.email !== null;
  const hasGoogle = methods.includes(GOOGLE_PROVIDER);

  // A password given means the person is using it; with only a password to go on, ask for it.
  if (hasPassword && (password !== undefined || !hasGoogle)) {
    if (password === undefined || password === '') {
      throw new AccountError('password-needed', 'Enter your password to confirm it’s you.', 'password');
    }
    await sdk.reauthenticateWithCredential(user, sdk.EmailAuthProvider.credential(user.email ?? '', password));
    return;
  }
  if (hasGoogle) {
    if (Capacitor.isNativePlatform()) {
      await sdk.reauthenticateWithCredential(user, sdk.GoogleAuthProvider.credential(await nativeGoogleIdToken()));
    } else {
      await sdk.reauthenticateWithPopup(user, new sdk.GoogleAuthProvider());
    }
    return;
  }
  throw new AccountError('auth/requires-recent-login', 'For your safety, sign out, sign in again, then retry.');
}

export async function deleteAccount({ password }: DeleteAccountInput = {}): Promise<void> {
  try {
    const { auth, sdk } = await load();
    const user = auth.currentUser;
    if (user === null) throw new AccountError('signed-out', 'You’re not signed in.');

    // The fresh sign-in comes first: backing out of it must not leave the cloud data gone and the account standing.
    if (await signInIsStale(user)) await reauthenticate(sdk, user, password);
    await runBeforeDeleteHooks(toAccountUser(user));
    try {
      await sdk.deleteUser(user);
    } catch (error) {
      if ((error as { code?: unknown }).code !== 'auth/requires-recent-login') throw error;
      await reauthenticate(sdk, user, password);
      await sdk.deleteUser(user);
    }
    await nativeSignOut();
  } catch (error) {
    throw toAccountError(error);
  }
}
