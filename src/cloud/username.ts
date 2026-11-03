/**
 * Usernames: what a handle may look like, what to say when it doesn't, and where
 * to start from. Pure text; nothing here touches the network (that is ./usernames).
 *
 * A username is the one name a person goes by in guitarRot. It is public (the
 * leaderboard starts from it), unique, and case-insensitive, so it is always stored
 * lowercase. The shape:
 *
 *   - 3 to 20 characters
 *   - lowercase letters a-z, digits 0-9, `_` and `.`
 *   - starts and ends with a letter or a digit (no `.joe`, no `joe_`; it also keeps a
 *     handle clear of Firestore's reserved ids such as `__x__`)
 *   - not one of a few reserved words
 *   - not a slur or strong profanity (./nameFilter)
 *
 * The Firestore rules check the shape and the reserved words (firestore.rules,
 * `validHandle`); a test keeps those in step. The profanity filter is the app's
 * alone: see docs/ACCOUNTS.md, Moderation.
 */
import { nameFilterMessage } from './nameFilter';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** The whole shape in one pattern: 3 to 20, an alphanumeric at each end. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/;

/** Names that would pass for the app or its makers. Also listed in firestore.rules. */
export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'administrator',
  'guitarrot',
  'moderator',
  'official',
  'root',
  'staff',
  'support',
  'system',
];

/** What gets stored and compared: no spaces at the ends, all lowercase. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** The message to show under the field, or null when the username is fine to try. */
export function validateUsername(value: string): string | null {
  const name = normalizeUsername(value);
  if (name === '') return 'Choose a username.';
  if (name.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `Keep it to ${USERNAME_MAX} characters or fewer.`;
  if (!/^[a-z0-9._]+$/.test(name)) return 'Use letters, numbers, . and _ only.';
  if (!USERNAME_PATTERN.test(name)) return 'Start and end with a letter or a number.';
  if (RESERVED_USERNAMES.includes(name)) return 'That username is reserved. Try another.';
  return nameFilterMessage(name);
}

export function isValidUsername(value: string): boolean {
  return validateUsername(value) === null;
}

/** A plain word to fall back on when a name gives nothing to build a username from. */
const FALLBACK_SEED = 'player';

/** Apple's "hide my email" addresses are random strings; they say nothing about the person. */
function isRelayAddress(email: string): boolean {
  return /@privaterelay\.appleid\.com$/i.test(email);
}

/** Letters without their accents (Ștefan becomes Stefan), lowercase, and only the characters a username may hold. */
function toHandleText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+|[._]+$/g, '');
}

/**
 * Where a new person's username field starts, from what Google or Apple told us:
 * the first word of their name, else the start of their email address (never an
 * Apple relay address), else a plain word. Always a valid username, always under
 * the limit with room left for a number if it turns out to be taken.
 */
export function usernameSeed(user: { displayName: string | null; email: string | null }): string {
  const first = user.displayName?.trim().split(/\s+/)[0] ?? '';
  const email = user.email ?? '';
  const local = email !== '' && !isRelayAddress(email) ? (email.split('@')[0] ?? '') : '';
  for (const source of [first, local]) {
    const text = toHandleText(source).slice(0, USERNAME_MAX - 3).replace(/[._]+$/g, '');
    if (isValidUsername(text)) return text;
  }
  return FALLBACK_SEED;
}

function between(random: () => number, low: number, high: number): number {
  return low + Math.floor(random() * (high - low + 1));
}

/**
 * Other names to try when `base` is taken, nearest first: the same word with a
 * number after it. Every one is a valid username; none is checked for being free
 * (the caller asks the server, because a free one is what the person wants).
 * `random` is a parameter so a test gets the same answers every time.
 */
export function suggestUsernames(base: string, count = 6, random: () => number = Math.random): string[] {
  const word = toHandleText(base) || FALLBACK_SEED;
  const out: string[] = [];
  const add = (suffix: string) => {
    const candidate = `${word.slice(0, USERNAME_MAX - suffix.length).replace(/[._]+$/g, '')}${suffix}`;
    if (isValidUsername(candidate) && !out.includes(candidate)) out.push(candidate);
  };
  const makers: Array<() => string> = [
    () => String(between(random, 10, 99)),
    () => `_${between(random, 1, 9)}`,
    () => String(between(random, 100, 999)),
    () => `.${between(random, 10, 99)}`,
  ];
  // A bounded number of tries, so a base that no suffix can make valid cannot loop for ever.
  for (let attempt = 0; out.length < count && attempt < count * 6; attempt += 1) {
    const maker = makers[attempt % makers.length];
    if (maker !== undefined) add(maker());
  }
  return out;
}
