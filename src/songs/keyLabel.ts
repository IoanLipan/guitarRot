import { spellingSolfege } from '@/music';

/** A song's home key as the catalogue writes it: a root spelling, plus "m" for minor. */
const KEY_PATTERN = /^([A-G][#b]?)(m?)$/;

/**
 * "G" -> "G (Sol)", "Am" -> "Am (La minor)". A key this doesn't recognise is
 * shown as authored — a typo in the catalogue shouldn't blank the player.
 */
export function keyLabel(key: string): string {
  const match = KEY_PATTERN.exec(key);
  if (match === null) return key;
  const [, root = '', minor = ''] = match;
  const solfege = spellingSolfege(root);
  return minor === '' ? `${key} (${solfege})` : `${key} (${solfege} minor)`;
}
