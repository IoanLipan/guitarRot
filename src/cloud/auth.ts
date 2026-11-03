/**
 * Accounts, on Firebase Auth. This module is loaded on demand (the provider
 * imports it after the first paint), and reaches the SDK only through
 * ./firebase, so it never costs a build or a screen that has no accounts.
 *
 * One auth state rules the app: the JS SDK's. On the web Google and Apple sign
 * in through a popup (a redirect where popups are blocked). Google refuses OAuth
 * inside an Android WebView, so there the native Google dialog does it
 * (@capacitor-firebase/authentication, `skipNativeAuth`): the plugin only
 * fetches Google's ID token, and the JS SDK signs in with it, exactly as if
 * the popup had done it. Apple on Android is Firebase's own browser flow, run by
 * the same plugin; it hands back Apple's ID token and the raw nonce, and the JS
 * SDK signs in with those (see nativeAppleCredential for the one wrinkle).
 *
 * Every account has a username (./usernames): created with the account for an
 * email sign-up, asked for right after a Google or Apple sign-in.
 */
import type { Auth, OAuthProvider, User, UserCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { track } from './analytics';
import { runBeforeDeleteHooks } from './deleteHooks';
import { toAccountError } from './errors';
import { getFirebaseAuth, loadAuthSdk } from './firebase';
import {
  AccountError,
  APPLE_PROVIDER,
  GOOGLE_PROVIDER,
  PASSWORD_PROVIDER,
  type AccountState,
  type AccountUser,
  type DeleteAccountInput,
  type SignInInput,
  type SignUpInput,
  UsernameMissingError,
} from './types';
import { normalizeUsername, validateUsername } from './username';
import { checkUsername, claimUsername, registerProfileCleanup } from './usernames';

type AuthSdk = Awaited<ReturnType<typeof loadAuthSdk>>;

/** Firebase calls a sign-in "recent" for about five minutes; stay safely inside that. */
const FRESH_SIGN_IN_MS = 4 * 60_000;

// What an account owns in the cloud besides its progress and its leaderboard row: its profile and its
// username. Registered here, beside the code that deletes accounts, so no way of deleting one skips it.
registerProfileCleanup();

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

type ProviderMethod = 'google' | 'apple';

/** Which provider a finished sign-in used, by the provider's own id (a redirect result doesn't say which button was tapped). */
function methodOf(credential: UserCredential, fallback: ProviderMethod): ProviderMethod {
  if (credential.providerId === APPLE_PROVIDER) return 'apple';
  if (credential.providerId === GOOGLE_PROVIDER) return 'google';
  return fallback;
}

/**
 * Tells analytics (when the person has agreed to it) how somebody got in: GA4's recommended `sign_up`
 * for a first Google or Apple sign-in, `login` for a return. Never the account itself, and never a
 * reason to fail a sign-in.
 */
function trackProviderSignIn(sdk: AuthSdk, credential: UserCredential, fallback: ProviderMethod): void {
  try {
    const event = sdk.getAdditionalUserInfo(credential)?.isNewUser === true ? 'sign_up' : 'login';
    track(event, { method: methodOf(credential, fallback) });
  } catch {
    // Analytics is optional.
  }
}

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
      // Back from a Google or Apple redirect: finishing it signs the user in (and the listener above hears it).
      if (!Capacitor.isNativePlatform()) {
        void sdk
          .getRedirectResult(auth)
          .then((result) => {
            if (result !== null) trackProviderSignIn(sdk, result, 'google');
          })
          .catch(() => undefined);
      }
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

/**
 * Gives `user` the username: claims the handle (and frees the one they had), then makes it the
 * account's name. The claim is what can fail (taken, offline); a name that won't save to Auth is
 * not worth failing over, because the profile already says it.
 */
async function giveUsername(sdk: AuthSdk, user: User, username: string): Promise<void> {
  const handle = await claimUsername(user.uid, username);
  track('username_set', {});
  if (user.displayName !== handle) await sdk.updateProfile(user, { displayName: handle }).catch(() => undefined);
  publishCurrent?.();
}

export async function signUpWithEmail({ email, password, username }: SignUpInput): Promise<void> {
  try {
    const handle = normalizeUsername(username);
    const problem = validateUsername(handle);
    if (problem !== null) throw new AccountError('username-invalid', problem, 'username');
    const { auth, sdk } = await load();

    // Ask once more, right before the account exists: a name taken a moment ago should not leave a half-made account behind.
    // If the check itself can't be made, the claim below is what decides.
    if ((await checkUsername(handle).catch(() => 'available')) === 'taken') {
      throw new AccountError('username-taken', 'That username is taken.', 'username');
    }

    const { user } = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
    track('sign_up', { method: 'password' });
    // A courtesy, never a gate: the app works unverified, and a failure here is no one's problem.
    void sdk.sendEmailVerification(user).catch(() => undefined);
    // The account exists now. If the name is lost to someone who was a moment faster, the person is signed in
    // without a username: the sheet then asks for another one.
    await giveUsername(sdk, user, handle).catch((error: unknown) => {
      throw new UsernameMissingError(toAccountError(error));
    });
  } catch (error) {
    throw toAccountError(error);
  }
}

/** Gives the signed-in person this username, or changes it to this one. */
export async function setUsername(username: string): Promise<void> {
  try {
    const { auth, sdk } = await load();
    const user = auth.currentUser;
    if (user === null) throw new AccountError('signed-out', 'You’re not signed in.');
    await giveUsername(sdk, user, username);
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function signInWithEmail({ email, password }: SignInInput): Promise<void> {
  try {
    const { auth, sdk } = await load();
    await sdk.signInWithEmailAndPassword(auth, email.trim(), password);
    track('login', { method: 'password' });
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

/** What Apple's sign-in gave the Android plugin: the pieces the JS SDK needs to sign in, and the name if Apple shared it. */
type NativeApple = { idToken: string; rawNonce: string; displayName: string | null };

/**
 * Apple on Android is Firebase's browser flow (a Custom Tab on `<project>.firebaseapp.com/__/auth/handler`),
 * run by the plugin. The wrinkle: unlike Google, the plugin signs the NATIVE Firebase user in whatever
 * `skipNativeAuth` says (its Apple handler never reads that option). So the result already carries a
 * second, native user; we take Apple's ID token and the raw nonce from it, sign the JS SDK in with
 * those, and let the caller sign the native user out again (`nativeSignOut`), so there is still one
 * auth state for the app: the JS SDK's.
 */
async function nativeAppleCredential(): Promise<NativeApple> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithApple({ scopes: ['email', 'name'] });
  const idToken = result.credential?.idToken;
  const rawNonce = result.credential?.nonce;
  if (idToken === undefined || idToken === '' || rawNonce === undefined || rawNonce === '') {
    throw new AccountError('auth/missing-id-token', 'Apple didn’t send back a sign-in. Please try again.');
  }
  const name = result.user?.displayName?.trim();
  return { idToken, rawNonce, displayName: name === undefined || name === '' ? null : name };
}

/** Clears the phone's remembered Google choice (and the native Apple user), so the next sign-in starts clean. */
async function nativeSignOut(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signOut();
  } catch {
    // Nothing native to clear; the JS sign-out is what matters.
  }
}

/** The popup, or the full-page redirect where a browser (or an in-app browser) cannot open one. */
async function signInWithBrowser(
  auth: Auth,
  sdk: AuthSdk,
  provider: Parameters<AuthSdk['signInWithPopup']>[1],
): Promise<UserCredential | null> {
  try {
    return await sdk.signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code !== 'auth/popup-blocked' && code !== 'auth/operation-not-supported-in-this-environment') throw error;
    await sdk.signInWithRedirect(auth, provider);
    return null;
  }
}

function appleProvider(sdk: AuthSdk): OAuthProvider {
  const provider = new sdk.OAuthProvider(APPLE_PROVIDER);
  provider.addScope('email');
  provider.addScope('name');
  return provider;
}

export async function signInWithGoogle(): Promise<void> {
  try {
    const { auth, sdk } = await load();
    if (Capacitor.isNativePlatform()) {
      const credential = sdk.GoogleAuthProvider.credential(await nativeGoogleIdToken());
      trackProviderSignIn(sdk, await sdk.signInWithCredential(auth, credential), 'google');
      return;
    }
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithBrowser(auth, sdk, provider);
    if (result !== null) trackProviderSignIn(sdk, result, 'google');
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function signInWithApple(): Promise<void> {
  try {
    const { auth, sdk } = await load();
    if (Capacitor.isNativePlatform()) {
      try {
        const apple = await nativeAppleCredential();
        const credential = appleProvider(sdk).credential({ idToken: apple.idToken, rawNonce: apple.rawNonce });
        const result = await sdk.signInWithCredential(auth, credential);
        // Apple's ID token carries no name; the plugin's native user got it from Apple's first response.
        if (apple.displayName !== null && (result.user.displayName ?? '') === '') {
          await sdk.updateProfile(result.user, { displayName: apple.displayName }).catch(() => undefined);
          publishCurrent?.();
        }
        trackProviderSignIn(sdk, result, 'apple');
      } finally {
        await nativeSignOut();
      }
      return;
    }
    const result = await signInWithBrowser(auth, sdk, appleProvider(sdk));
    if (result !== null) trackProviderSignIn(sdk, result, 'apple');
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
  const hasApple = methods.includes(APPLE_PROVIDER);

  // A password given means the person is using it; with only a password to go on, ask for it.
  if (hasPassword && (password !== undefined || (!hasGoogle && !hasApple))) {
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
  if (hasApple) {
    if (Capacitor.isNativePlatform()) {
      try {
        const apple = await nativeAppleCredential();
        await sdk.reauthenticateWithCredential(user, appleProvider(sdk).credential({ idToken: apple.idToken, rawNonce: apple.rawNonce }));
      } finally {
        await nativeSignOut();
      }
    } else {
      await sdk.reauthenticateWithPopup(user, appleProvider(sdk));
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
