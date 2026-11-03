import { useCallback, useEffect, useRef } from 'react';
import { subscribeAppState } from '@/app/appState';
import type { ProgressHandle } from '@/app/useProgress';
import { useAccount } from '@/cloud/AccountProvider';
import { onBeforeAccountDelete } from '@/cloud/deleteHooks';
import { planUpdates } from './model';
import { removeEntry, writePatches } from './service';
import { useOwnEntry } from './useOwnEntry';
import { isoWeekKey } from './week';

/** How long XP is gathered before it is sent: a quiz run's answers go out as one write, not twenty. */
export const SYNC_DELAY_MS = 2000;

/**
 * After a send, the next waits for the server's answer, but no longer than this: a phone that is offline
 * never gets one, and must not hold the rest of its XP back. By then Firestore has applied the write to its
 * own copy of the row, which is what the next send works from.
 */
export const SETTLE_MS = 300;

/** How long account deletion waits for the leaderboard row to go before it gives up and keeps the account. */
export const REMOVE_TIMEOUT_MS = 10_000;

/**
 * Keeps the player's leaderboard row in step with the game, while they are
 * signed in and on the board. Renders nothing.
 *
 *  - Each award with XP in it is added up and, a couple of seconds after the
 *    last one (or at once when the app goes to the background), sent as one
 *    update: this week's XP goes up by what was earned, and the all-time XP
 *    and level are brought up to the player's own total (`planUpdates`).
 *  - Players who have not joined are left alone: their XP is never sent.
 *  - On the way out of the account, the row is deleted first.
 *
 * Nothing is awaited by the game. Firestore keeps writes made offline and
 * sends them when the phone is back, so the game never waits on the network.
 */
export function useLeaderboardSync(progress: Pick<ProgressHandle, 'state' | 'subscribeAwards'>): void {
  const account = useAccount();
  const uid = account.status === 'signed-in' ? account.user.uid : null;
  const own = useOwnEntry(uid);
  const { xp } = progress.state;
  const { instrument } = progress.state.settings;

  // What the timers and listeners need, as it is right now rather than as it was when they were made.
  const latest = useRef({ uid, own, xp, instrument });
  latest.current = { uid, own, xp, instrument };
  /** XP earned since the last send. */
  const earned = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** One send at a time: the next works from the row as the last one left it. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  const sendNow = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const forUid = latest.current.uid;
    if (forUid === null) return;
    queue.current = queue.current.then(async () => {
      const { uid: current, own: row, xp: total, instrument: playing } = latest.current;
      if (current !== forUid) return; // signed out, or somebody else signed in, meanwhile
      if (row.status === 'loading') return; // the row has not arrived; the effect below tries again when it does
      const gathered = earned.current;
      earned.current = 0;
      if (row.status !== 'ready' || row.entry === null) return; // not on the board: nothing is sent
      const patches = planUpdates(row.entry, { weekKey: isoWeekKey(new Date()), earned: gathered, localXp: total, instrument: playing });
      if (patches.length === 0) return; // the row is already current
      // Not awaited to the end: offline, the answer comes when the phone is back (even after a restart).
      const sent = writePatches(forUid, patches).catch(() => {
        // The server refused (rules, a row deleted elsewhere). The next award starts from the row as it really is.
      });
      await Promise.race([sent, new Promise((resolve) => setTimeout(resolve, SETTLE_MS))]);
    });
  }, []);

  const sendSoon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(sendNow, SYNC_DELAY_MS);
  }, [sendNow]);

  // Awards. `subscribeAwards` hears every one, even two in the same tap.
  // Only while signed in: without an account the game has no listener from here at all.
  const { subscribeAwards } = progress;
  const signedIn = uid !== null;
  useEffect(() => {
    if (!signedIn) return;
    return subscribeAwards((notice) => {
      const row = latest.current.own;
      if (notice.award.xp <= 0) return;
      // Not on the board: this XP is not for it, even if the player joins a moment later.
      if (row.status === 'ready' && row.entry === null) return;
      earned.current += notice.award.xp;
      sendSoon();
    });
  }, [signedIn, subscribeAwards, sendSoon]);

  // The row arrived, or the player's own total is ahead of it (progress restored, or earned while signed out): catch up.
  const onBoard = own.status === 'ready' && own.entry !== null;
  useEffect(() => {
    if (uid !== null && onBoard) sendSoon();
  }, [uid, onBoard, xp, sendSoon]);

  // A different player, or nobody: what was gathered belongs to the last one.
  useEffect(() => {
    earned.current = 0;
    return () => {
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, [uid]);

  // Leaving the screen is the moment a delayed send may never run.
  useEffect(() => subscribeAppState({ onBackground: sendNow }), [sendNow]);

  // Deleting the account takes the row with it, or stops: a row left behind would have no owner to remove it.
  useEffect(() => {
    if (uid === null) return;
    return onBeforeAccountDelete(async (user) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          removeEntry(user.uid),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('The leaderboard row did not go in time.')), REMOVE_TIMEOUT_MS);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    });
  }, [uid]);
}

/** Mounted once, inside the app, wherever the progress handle is. */
export function LeaderboardSync({ progress }: { progress: Pick<ProgressHandle, 'state' | 'subscribeAwards'> }) {
  useLeaderboardSync(progress);
  return null;
}

export default LeaderboardSync;
