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
 * SDK signs in with those (see nativeAppleCredential for the one wrinkle). On iOS
 * Apple is the system's own sheet (ASAuthorization), which the plugin runs without
 * a native Firebase user, and the same ID token and raw nonce go the same way.
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

/**
 * What Apple's sign-in gave the plugin: the pieces the JS SDK needs to sign in, and the name if Apple shared it.
 * The rest is for revoking Apple's token when an account is deleted: the access token Firebase's browser flow
 * got (Android), the one-time authorization code of the system sheet (iOS), and the native Firebase user the
 * plugin signed in (always on Android, on iOS only when asked), which is who the plugin's revoke acts for.
 */
type NativeApple = {
  idToken: string;
  rawNonce: string;
  displayName: string | null;
  accessToken: string | null;
  authorizationCode: string | null;
  nativeUser: { uid: string; isNew: boolean } | null;
};

/**
 * Apple on Android is Firebase's browser flow (a Custom Tab on `<project>.firebaseapp.com/__/auth/handler`),
 * run by the plugin. The wrinkle: unlike Google, the plugin signs the NATIVE Firebase user in whatever
 * `skipNativeAuth` says (its Apple handler never reads that option). So the result already carries a
 * second, native user; we take Apple's ID token and the raw nonce from it, sign the JS SDK in with
 * those, and let the caller sign the native user out again (`nativeSignOut`), so there is still one
 * auth state for the app: the JS SDK's.
 *
 * On iOS the plugin's Apple handler (ASAuthorizationController) does honour `skipNativeAuth`: no native
 * user is made, `user` carries only the name and only the first time Apple is authorised (later it is
 * null), and `credential` has the ID token and the raw nonce (Apple was sent its SHA-256). The same code
 * reads both, and `nativeSignOut` is then a no-op for Apple.
 *
 * `keepNativeUser` (iOS only; Android always has one) asks the plugin to sign the native user in after all
 * (`skipNativeAuth: false` for this call). Deleting an account needs it: see `reauthenticateAndRevokeApple`.
 */
async function nativeAppleCredential({ keepNativeUser = false }: { keepNativeUser?: boolean } = {}): Promise<NativeApple> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithApple({
    scopes: ['email', 'name'],
    ...(keepNativeUser ? { skipNativeAuth: false } : {}),
  });
  const idToken = result.credential?.idToken;
  const rawNonce = result.credential?.nonce;
  if (idToken === undefined || idToken === '' || rawNonce === undefined || rawNonce === '') {
    throw new AccountError('auth/missing-id-token', 'Apple didn’t send back a sign-in. Please try again.');
  }
  const name = result.user?.displayName?.trim();
  const uid = result.user?.uid;
  return {
    idToken,
    rawNonce,
    displayName: name === undefined || name === '' ? null : name,
    accessToken: nonEmpty(result.credential?.accessToken),
    authorizationCode: nonEmpty(result.credential?.authorizationCode),
    nativeUser: uid === undefined || uid === '' ? null : { uid, isNew: result.additionalUserInfo?.isNewUser === true },
  };
}

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
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

/** How long the plugin's native revoke gets: it has no timeout of its own, and a hang would leave "Deleting..." up for ever. */
const NATIVE_REVOKE_MS = 20_000;

/**
 * Backend answers that mean Apple no longer knows the token (already revoked, expired, never ours): there is
 * nothing left to revoke, so the deletion goes on. Anything else (offline, too many tries, a server error)
 * is worth another try, so it stops the deletion with the account intact.
 */
const APPLE_TOKEN_GONE = new Set(['auth/invalid-credential', 'auth/invalid-idp-response']);

/**
 * Revokes the Apple token with `revoke`, or explains why it was not. `revoke` is null when there was nothing to
 * revoke with: the one case is a Firebase project whose Apple provider has no team id, key id and private key, so
 * Apple's authorization code was never exchanged for a token. That is the owner's set-up to fix (docs/ACCOUNTS.md),
 * not something to hold every Apple account hostage to: deleting must always work, so it goes on and says so in
 * the console, and the manual checklist has the owner try a delete with a real Apple account.
 */
async function revokeAppleToken(revoke: (() => Promise<void>) | null): Promise<void> {
  if (revoke === null) {
    console.warn('No Apple token to revoke: set up the Apple key in Firebase (docs/ACCOUNTS.md). Deleting the account anyway.');
    return;
  }
  try {
    await revoke();
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && APPLE_TOKEN_GONE.has(code)) {
      console.warn(`Apple no longer knows the token (${code}), so there is nothing to revoke. Deleting the account anyway.`);
      return;
    }
    throw new AccountError(
      'apple-revoke-failed',
      'We couldn’t finish with Apple, so your account was kept. Check your connection and try again.',
    );
  }
}

/** Gives the plugin's revoke a deadline: on iOS it never answers when the native SDK has no current user. */
function withDeadline(work: Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Revoking Apple’s token took too long.')), NATIVE_REVOKE_MS);
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/**
 * Signs in with Apple again, as the account being deleted, and revokes Apple's token. App Store rule
 * 5.1.1(v): an app that makes accounts with Sign in with Apple must revoke the token when one is deleted.
 * Revoking needs a fresh credential (an authorization code lives for minutes), so this is one more Apple
 * sheet, and it is also the recent sign-in Firebase wants before deleting. It runs FIRST, before the clean-up
 * hooks: a failed revoke then keeps the account whole and a retry starts from the top.
 *
 *  - web: the popup re-authenticates the user, and its credential carries Apple's access token, which the
 *    JS SDK's `revokeAccessToken` takes;
 *  - Android: the plugin's browser flow gives the same access token (and the ID token and nonce to
 *    re-authenticate with), for the same JS call;
 *  - iOS: the system sheet gives only a one-time authorization code, and the JS SDK's revoke takes access
 *    tokens only. The native SDK takes the code (`Auth.revokeToken(withAuthorizationCode:)`, through the
 *    plugin's `revokeAccessToken`) but asks ITS current user for the ID token that authorises it, and never
 *    answers when there is none. The app deliberately has no native user, so this one sheet signs one in
 *    (`keepNativeUser`), the code is revoked, and the native user is signed out again.
 *
 * If the native user is not the account's (the phone's Apple ID is a different one), it is deleted when this
 * very sheet created it (an empty account nobody asked for) and only signed out otherwise, and the person is
 * told to use the same Apple ID.
 */
async function reauthenticateAndRevokeApple(auth: Auth, sdk: AuthSdk, user: User): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const result = await sdk.reauthenticateWithPopup(user, appleProvider(sdk));
    const token = nonEmpty(sdk.OAuthProvider.credentialFromResult(result)?.accessToken);
    await revokeAppleToken(token === null ? null : () => sdk.revokeAccessToken(auth, token));
    return;
  }
  const ios = Capacitor.getPlatform() === 'ios';
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  try {
    const apple = await nativeAppleCredential({ keepNativeUser: ios });
    if (apple.nativeUser !== null && apple.nativeUser.uid !== user.uid) {
      if (apple.nativeUser.isNew) await FirebaseAuthentication.deleteUser().catch(() => undefined);
      throw toAccountError({ code: 'auth/user-mismatch' });
    }
    await sdk.reauthenticateWithCredential(user, appleProvider(sdk).credential({ idToken: apple.idToken, rawNonce: apple.rawNonce }));
    if (!ios) {
      const token = apple.accessToken;
      await revokeAppleToken(token === null ? null : () => sdk.revokeAccessToken(auth, token));
      return;
    }
    const code = apple.authorizationCode;
    // Without a native user the plugin's revoke would wait for ever, so it is not asked.
    await revokeAppleToken(
      code === null || apple.nativeUser === null ? null : () => withDeadline(FirebaseAuthentication.revokeAccessToken({ token: code })),
    );
  } finally {
    await nativeSignOut();
  }
}

export async function deleteAccount({ password }: DeleteAccountInput = {}): Promise<void> {
  try {
    const { auth, sdk } = await load();
    const user = auth.currentUser;
    if (user === null) throw new AccountError('signed-out', 'You’re not signed in.');

    // The fresh sign-in comes first: backing out of it must not leave the cloud data gone and the account standing.
    // For an account that has Apple it is Apple's own sheet or window, and the same step revokes Apple's token.
    if (user.providerData.some((info) => info.providerId === APPLE_PROVIDER)) await reauthenticateAndRevokeApple(auth, sdk, user);
    else if (await signInIsStale(user)) await reauthenticate(sdk, user, password);
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
