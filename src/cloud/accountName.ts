import type { AccountUser } from './types';

/** What the account is called on screen: the name it was given, else the part of the email before the @. */
export function accountName(user: AccountUser): string {
  const name = user.displayName?.trim();
  if (name !== undefined && name !== '') return name;
  const local = user.email?.split('@')[0]?.trim();
  return local !== undefined && local !== '' ? local : 'Player';
}
