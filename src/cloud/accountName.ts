import type { AccountUser } from './types';

/**
 * What the account is called on screen: the name it was given, else the part of the email before the @
 * (except for an Apple "hide my email" address, whose start is a random string, not a name).
 */
export function accountName(user: AccountUser): string {
  const name = user.displayName?.trim();
  if (name !== undefined && name !== '') return name;
  const relay = /@privaterelay\.appleid\.com$/i.test(user.email ?? '');
  const local = relay ? undefined : user.email?.split('@')[0]?.trim();
  return local !== undefined && local !== '' ? local : 'Player';
}
