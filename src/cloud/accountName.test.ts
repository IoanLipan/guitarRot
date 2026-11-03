import { describe, expect, it } from 'vitest';
import { accountName } from './accountName';
import type { AccountUser } from './types';

const user = (over: Partial<AccountUser>): AccountUser => ({
  uid: 'u1',
  email: null,
  displayName: null,
  providers: [],
  emailVerified: false,
  ...over,
});

describe('accountName', () => {
  it('is the name the account was given', () => {
    expect(accountName(user({ displayName: '  ada_l ', email: 'ada@example.com' }))).toBe('ada_l');
  });

  it('is the start of the email when there is no name', () => {
    expect(accountName(user({ email: 'grace.hopper@example.com' }))).toBe('grace.hopper');
  });

  it('is never the random start of an Apple "hide my email" address', () => {
    expect(accountName(user({ email: 'x7k2m9qp1z@privaterelay.appleid.com' }))).toBe('Player');
  });

  it('is Player when there is nothing at all', () => {
    expect(accountName(user({}))).toBe('Player');
    expect(accountName(user({ displayName: '  ', email: '@example.com' }))).toBe('Player');
  });
});
