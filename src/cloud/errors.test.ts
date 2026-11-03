import { describe, expect, it } from 'vitest';
import { toAccountError } from './errors';
import { AccountError } from './types';

const code = (value: string) => Object.assign(new Error(`Firebase: Error (${value}).`), { code: value });

describe('plain words for the common Firebase errors', () => {
  it.each([
    ['auth/wrong-password', 'password', /password isn’t right/],
    ['auth/invalid-credential', 'password', /don’t match/],
    ['auth/user-not-found', 'email', /no account/i],
    ['auth/email-already-in-use', 'email', /already has an account/],
    ['auth/weak-password', 'password', /at least 8/],
    ['auth/invalid-email', 'email', /doesn’t look like an email/],
    ['auth/network-request-failed', undefined, /No connection/],
    ['auth/too-many-requests', undefined, /Too many tries/],
  ] as const)('%s', (firebaseCode, field, words) => {
    const error = toAccountError(code(firebaseCode));
    expect(error.code).toBe(firebaseCode);
    expect(error.field).toBe(field);
    expect(error.message).toMatch(words);
    expect(error.message).not.toMatch(/firebase|auth\//i);
  });

  it('treats a closed or abandoned Google window as a choice, with nothing to say', () => {
    for (const closed of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']) {
      const error = toAccountError(code(closed));
      expect(error.cancelled).toBe(true);
      expect(error.message).toBe('');
    }
  });

  it('recognises the Android plugin’s dismissed dialog by its message', () => {
    expect(toAccountError(new Error('activity is cancelled by the user.')).cancelled).toBe(true);
    expect(toAccountError({ message: 'Authorization canceled.' }).cancelled).toBe(true);
  });

  it('says what to do when the phone has no Google account', () => {
    expect(toAccountError(new Error('No credentials available')).message).toMatch(/Add one in your phone’s settings/);
  });

  it('reads a chunk that could not be fetched as being offline', () => {
    expect(toAccountError(new TypeError('Failed to fetch dynamically imported module: /assets/auth.js')).code).toBe(
      'auth/network-request-failed',
    );
  });

  it('falls back to one calm sentence for anything else, and never leaks the raw text', () => {
    const error = toAccountError(code('auth/internal-error'));
    expect(error.message).toBe('Something went wrong. Please try again.');
    expect(toAccountError('boom').message).toBe('Something went wrong. Please try again.');
    expect(toAccountError(undefined).code).toBe('unknown');
  });

  it('passes our own errors through untouched', () => {
    const own = new AccountError('password-needed', 'Enter your password.', 'password');
    expect(toAccountError(own)).toBe(own);
  });
});
