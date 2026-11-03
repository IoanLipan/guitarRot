/**
 * The name a player goes by on the leaderboard. It is public, so it is chosen
 * on purpose: it starts from the first name or the start of the email address
 * (never the whole address) and the player can change it before joining.
 *
 * The Firestore rules check the same shape (`firestore.rules`, the leaderboard
 * block): 3 to 20 characters; letters, digits, spaces, dots, underscores and
 * hyphens; no space at either end. The Firestore rules do not hold the profanity
 * filter (`@/cloud/nameFilter`), which the app applies on top: see docs/ACCOUNTS.md, Moderation.
 */
import { isObjectionable, nameFilterMessage } from '@/cloud/nameFilter';

export const NAME_MIN = 3;
export const NAME_MAX = 20;

/** Letters of any alphabet (Ștefan, José), digits, `.` `_` `-`, and single spaces between them. */
export const NAME_PATTERN = /^[\p{L}\p{N}._-]([\p{L}\p{N} ._-]*[\p{L}\p{N}._-])?$/u;

const DISALLOWED = /[^\p{L}\p{N} ._-]/gu;

/** The characters, not UTF-16 units: a name is counted the way the person sees it. */
function length(value: string): number {
  return Array.from(value).length;
}

/** What gets stored: the text without spaces at either end and with runs of spaces made one. */
export function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** The message to show under the field, or null when the name is fine. */
export function validateLeaderboardName(value: string): string | null {
  const name = normalizeName(value);
  if (name === '') return 'Choose a name to show.';
  if (length(name) < NAME_MIN) return `Use at least ${NAME_MIN} characters.`;
  if (length(name) > NAME_MAX) return `Keep it to ${NAME_MAX} characters or fewer.`;
  if (!NAME_PATTERN.test(name)) return 'Use letters, numbers, spaces and . _ - only.';
  return nameFilterMessage(name);
}

/**
 * A starting point for the name field: the first word of the display name, else
 * the part of the email before the @, with anything the board does not allow
 * taken out and cut to length. May come back too short (or empty) to use; the
 * field then just starts blank or short and the player finishes it.
 */
export function suggestName(user: { displayName: string | null; email: string | null }): string {
  const first = user.displayName?.trim().split(/\s+/)[0] ?? '';
  const local = user.email?.split('@')[0] ?? '';
  const source = first !== '' ? first : local;
  const cleaned = normalizeName(source.replace(DISALLOWED, ''));
  const suggestion = Array.from(cleaned).slice(0, NAME_MAX).join('').trim();
  // Never put a word the board would refuse in the field for them.
  return isObjectionable(suggestion) ? '' : suggestion;
}
