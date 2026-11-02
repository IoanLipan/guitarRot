import { AccountError, type AccountErrorField } from './types';

type Friendly = { message: string; field?: AccountErrorField };

/**
 * What Firebase's error codes mean to a person. Wrong password and unknown
 * email share one message on purpose: Firebase projects hide which of the two
 * it was (email enumeration protection), and so does the app.
 */
const FRIENDLY: Readonly<Record<string, Friendly>> = {
  'auth/invalid-credential': { message: 'That email and password don’t match. Check them and try again.', field: 'password' },
  'auth/invalid-login-credentials': { message: 'That email and password don’t match. Check them and try again.', field: 'password' },
  'auth/wrong-password': { message: 'That password isn’t right. Try again, or reset it.', field: 'password' },
  'auth/user-not-found': { message: 'There’s no account with that email. Create one instead?', field: 'email' },
  'auth/email-already-in-use': {
    message: 'That email already has an account. Sign in instead, or reset the password.',
    field: 'email',
  },
  'auth/weak-password': { message: 'Use at least 8 characters for the password.', field: 'password' },
  'auth/invalid-email': { message: 'That doesn’t look like an email address.', field: 'email' },
  'auth/missing-email': { message: 'Enter your email address.', field: 'email' },
  'auth/missing-password': { message: 'Enter your password.', field: 'password' },
  'auth/network-request-failed': { message: 'No connection. Check your internet and try again.' },
  'auth/too-many-requests': { message: 'Too many tries. Wait a few minutes, then try again.' },
  'auth/user-disabled': { message: 'This account has been turned off. Contact support if that’s a surprise.' },
  'auth/account-exists-with-different-credential': {
    message: 'That email is already used with another way of signing in. Use the one you signed up with.',
    field: 'email',
  },
  'auth/popup-blocked': { message: 'Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.' },
  'auth/unauthorized-domain': { message: 'Signing in isn’t set up for this web address yet.' },
  'auth/operation-not-allowed': { message: 'That way of signing in isn’t turned on yet.' },
  'auth/user-mismatch': { message: 'That’s not the account you’re signed in with. Use the same one to confirm.' },
  'auth/requires-recent-login': { message: 'For your safety, sign in again, then retry.' },
  'auth/user-token-expired': { message: 'Your sign-in expired. Sign in again.' },
  'auth/invalid-password': { message: 'That password isn’t right. Try again, or reset it.', field: 'password' },
};

/** Closing or abandoning a sign-in window is a choice, not a failure. */
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

const GENERIC = 'Something went wrong. Please try again.';

type Coded = { code?: unknown; message?: unknown };

/**
 * Turns anything an account action can throw into an {@link AccountError}:
 * Firebase's own errors, the Android plugin's (a bare message when Google's
 * dialog was dismissed or the phone has no Google account), or our own, which
 * pass through untouched.
 */
export function toAccountError(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  const { code, message } = (typeof error === 'object' && error !== null ? error : {}) as Coded;
  const text = typeof message === 'string' ? message : '';
  const raw = typeof code === 'string' ? code : '';

  if (CANCELLED.has(raw) || (raw === '' && /cancel/i.test(text))) {
    return new AccountError('cancelled', '');
  }
  const friendly = FRIENDLY[raw];
  if (friendly !== undefined) return new AccountError(raw, friendly.message, friendly.field);
  if (/no credential/i.test(text)) {
    return new AccountError(
      'no-google-account',
      'No Google account is on this phone. Add one in your phone’s settings, or use email.',
    );
  }
  // A failed fetch of the SDK itself (offline, first visit) is the same thing to the person.
  if (raw === '' && /failed to fetch|importing a module|network|load failed/i.test(text)) {
    return new AccountError('auth/network-request-failed', FRIENDLY['auth/network-request-failed']?.message ?? GENERIC);
  }
  return new AccountError(raw === '' ? 'unknown' : raw, GENERIC);
}
