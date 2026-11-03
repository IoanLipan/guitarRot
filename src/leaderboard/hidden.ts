import { useCallback, useState } from 'react';

/**
 * Players this person has hidden from the leaderboard (a block, App Store guideline 1.2).
 * It lives on the phone only: a list of other players' ids in `localStorage`, under its
 * own key like the one-time offer's, never in progress and never synced. Hiding changes
 * what this person sees and nothing else; the player does not know and keeps their row.
 */
export const HIDDEN_KEY = 'guitarrot.hidden-players.v1';

/** A sanity limit on the list. Past it the oldest are forgotten, which beats a key that grows for ever. */
export const MAX_HIDDEN = 200;

/** The stored text as a list of ids: anything that is not a JSON array of strings is an empty list. */
export function parseHidden(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((uid): uid is string => typeof uid === 'string' && uid !== ''))].slice(-MAX_HIDDEN);
  } catch {
    return [];
  }
}

/** The list with `uid` on the end; the same list when it is already there. */
export function withHidden(list: readonly string[], uid: string): string[] {
  return list.includes(uid) ? [...list] : [...list, uid].slice(-MAX_HIDDEN);
}

function read(): string[] {
  try {
    return parseHidden(localStorage.getItem(HIDDEN_KEY));
  } catch {
    // Storage blocked (a private window): nobody is hidden after a restart, but the list works for this visit.
    return [];
  }
}

function write(list: readonly string[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(HIDDEN_KEY);
    else localStorage.setItem(HIDDEN_KEY, JSON.stringify(list));
  } catch {
    // Could not be remembered; it still holds until the app is closed.
  }
}

export type HiddenPlayers = {
  /** Whether this player is hidden. */
  isHidden: (uid: string) => boolean;
  /** How many players are hidden. */
  count: number;
  hide: (uid: string) => void;
  /** Brings every hidden player back. */
  showAll: () => void;
};

/** The hide list: read once when the board opens, written through on every change. */
export function useHiddenPlayers(): HiddenPlayers {
  const [list, setList] = useState<string[]>(read);

  const hide = useCallback((uid: string) => {
    setList((now) => {
      const next = withHidden(now, uid);
      write(next);
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setList([]);
    write([]);
  }, []);

  const isHidden = useCallback((uid: string) => list.includes(uid), [list]);
  return { isHidden, count: list.length, hide, showAll };
}
