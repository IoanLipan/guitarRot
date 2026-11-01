import { useEffect, useState } from 'react';
import type { BoardEntry } from './model';
import { watchOwnEntry } from './service';

/** The signed-in player's own leaderboard row, followed live. */
export type OwnEntryState =
  /** Nobody is signed in (or there are no accounts): nothing to follow. */
  | { status: 'idle' }
  | { status: 'loading' }
  /** The row could not be read at all (rules refused it, or Firestore would not start). */
  | { status: 'error' }
  /** `entry` is null when this player has not joined. `pending` means the newest change has not reached the server yet. */
  | { status: 'ready'; entry: BoardEntry | null; pending: boolean };

const IDLE: OwnEntryState = { status: 'idle' };
const LOADING: OwnEntryState = { status: 'loading' };

/**
 * Follows `leaderboard/{uid}` for as long as the component is mounted. Pass
 * null when there is nobody signed in: nothing is started, so a build or a
 * session without an account never loads Firestore. Change `attempt` to
 * start again after an error.
 */
export function useOwnEntry(uid: string | null, attempt = 0): OwnEntryState {
  // The state is stamped with the uid it belongs to, so a different player never sees the last one's row.
  const [seen, setSeen] = useState<{ uid: string; state: OwnEntryState } | null>(null);

  useEffect(() => {
    if (uid === null) return;
    // Starting again after an error: back to waiting, not to the old error.
    setSeen((last) => (last?.state.status === 'error' ? null : last));
    return watchOwnEntry(
      uid,
      ({ entry, pending }) => setSeen({ uid, state: { status: 'ready', entry, pending } }),
      () => setSeen({ uid, state: { status: 'error' } }),
    );
  }, [uid, attempt]);

  if (uid === null) return IDLE;
  return seen !== null && seen.uid === uid ? seen.state : LOADING;
}
