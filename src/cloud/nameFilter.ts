/**
 * A filter for objectionable names: usernames and leaderboard names, the only two
 * pieces of text other players can read. App Store guideline 1.2 and Play's
 * user-generated-content policy both ask for one.
 *
 * It is a deterrent, not a classifier. It holds a few dozen roots of slurs and
 * strong profanity in English and Romanian, and refuses a name that contains one
 * once the name is flattened the way people disguise words: lowercase, accents
 * gone (Romanian ș ț ă â î become s t a a i), common leetspeak undone (0 o, 1 i or
 * l, 3 e, 4 a, 5 s, 7 t, @ a, $ s) and `.` `_` `-` and spaces dropped. So "F.u" "c_k",
 * "sh1t" and "pizd@" are all caught. A short allowlist keeps real words and
 * names that happen to contain a root (Scunthorpe, Kinoshita, popular) clear.
 *
 * It runs in the app only: the Firestore rules do not hold the list (see
 * docs/ACCOUNTS.md, Moderation). Something that gets past it is dealt with by
 * the report and hide tools on the leaderboard and by a moderator. The words
 * are written in plain text on purpose: they are matched, never displayed.
 */

/** What to say when a name is refused. Neutral: it does not repeat or point at the word. */
export const NAME_REFUSED = 'Pick a different name.';

/** Slurs and strong profanity, each already flattened (no accents, no separators). */
const ROOTS: readonly string[] = [
  // English: slurs and hate.
  'nigg', 'faggot', 'tranny', 'retard', 'kike', 'chink', 'hitler', 'kkk',
  // English: strong profanity and sexual abuse.
  'fuck', 'shit', 'bitch', 'cunt', 'cocksuck', 'dickhead', 'pussy', 'blowjob', 'jizz', 'whore',
  'slut', 'wanker', 'asshole', 'arsehole', 'twat', 'bollock', 'douchebag', 'rapist', 'pedophil', 'paedophil',
  // Romanian: vulgarities and slurs (written without diacritics).
  'pizd', 'pula', 'muie', 'muist', 'futut', 'futui', 'futemas', 'cacat', 'coaie', 'curva',
  'poponar', 'jidan', 'bozgor',
];

/**
 * Innocent words and names that contain a root once flattened. Each is removed
 * from the text before the roots are looked for, so "Scunthorpe" passes and
 * "scunthorpe cunt" does not. Fragments are fine where a whole family collides:
 * "popula" for popular and population, "shita" for the Japanese Kinoshita and
 * Yoshitaka, "ishit" for the Indian Rishit, "pulau" and "pulaski" for place names.
 */
const ALLOWED: readonly string[] = [
  'scunthorpe', // cunt
  'shita', 'shito', 'shitsu', 'ishit', 'harshit', 'kshit', // shit: Kinoshita, Yoshitsune, Rishit, Harshit, Kshitij
  'niggl', // nigg: niggle
  'retardant', // retard
  'therapist', // rapist
  'atwater', // twat
  'slutsk', // slut: Slutsky
  'popula', 'manipula', 'stipula', 'copula', 'pulau', 'pulaski', 'pulat', // pula: popular, Pulaski, Pulat
  'curvat', 'curvac', // curva: curvature, curvaceous
];

/** The look-alike for each digit or symbol. `1` is read both ways ("sh1t" is shit, "pu1a" is pula), so it is handled apart. */
const LOOK_ALIKES: Readonly<Record<string, string>> = {
  '0': 'o',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/** Lowercase, no accents, no separators; `1` read as `one` (an `i` or an `l`). */
function flatten(text: string, one: 'i' | 'l'): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[03457$@]/g, (char) => LOOK_ALIKES[char] ?? char)
    .replace(/1/g, one)
    .replace(/[\s._-]+/g, '');
}

/** True when `text` holds a slur or strong profanity, however it is spelled or spaced out. */
export function isObjectionable(text: string): boolean {
  return (['i', 'l'] as const).some((one) => {
    let flat = flatten(text, one);
    for (const word of ALLOWED) flat = flat.split(word).join('|');
    return ROOTS.some((root) => flat.includes(root));
  });
}

/** The message for a name the filter refuses, or null when it is fine. */
export function nameFilterMessage(text: string): string | null {
  return isObjectionable(text) ? NAME_REFUSED : null;
}
