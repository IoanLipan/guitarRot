/**
 * Where a shared link points. Native builds run from `capacitor://localhost`
 * and dev runs from a random port, neither of which anybody else can open,
 * so share URLs are always built against the deployed site.
 */
export const PUBLIC_ORIGIN = 'https://guitar-rot.vercel.app';

/** Query parameter carrying the shared card. */
export const SHARE_PARAM = 'p';

export type ShareKind = 'riff' | 'chord' | 'quiz' | 'song';

export type ShareTarget = { kind: ShareKind; id: string };

const KINDS: readonly ShareKind[] = ['riff', 'chord', 'quiz', 'song'];

/**
 * Ids are restricted to URL-safe characters so a share id needs no
 * percent-encoding — `?p=riff:blues-shuffle-e` stays readable in a message.
 */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

export function formatShareId(target: ShareTarget): string {
  return `${target.kind}:${target.id}`;
}

export function parseShareId(raw: string): ShareTarget | null {
  const separator = raw.indexOf(':');
  if (separator === -1) return null;

  const kind = raw.slice(0, separator);
  const id = raw.slice(separator + 1);
  if (!KINDS.includes(kind as ShareKind)) return null;
  if (!ID_PATTERN.test(id)) return null;

  return { kind: kind as ShareKind, id };
}

export function shareUrl(target: ShareTarget): string {
  return `${PUBLIC_ORIGIN}/?${SHARE_PARAM}=${formatShareId(target)}`;
}

/** Reads a share target out of a `location.search` string. */
export function readShareTarget(search: string): ShareTarget | null {
  const raw = new URLSearchParams(search).get(SHARE_PARAM);
  return raw === null ? null : parseShareId(raw);
}
