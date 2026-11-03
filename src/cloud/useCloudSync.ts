import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeAppState } from '@/app/appState';
import type { ProgressState } from '@/progress';
import { useAccount } from './AccountProvider';
import { cloudEnabled } from './config';
import { onBeforeAccountDelete } from './deleteHooks';
import type { SyncSession, SyncStatus } from './sync';

/** The part of the progress handle the sync needs; `useProgress()` satisfies it. */
export type SyncableProgress = {
  state: ProgressState;
  loaded: boolean;
  getState: () => ProgressState;
  mergeRemote: (remote: ProgressState) => ProgressState;
};

/** What the rest of the app can know about the sync. */
export type SyncApi = {
  /** How the progress stands in the cloud; null where nothing is syncing (signed out, or a build without accounts). */
  status: SyncStatus | null;
  /** Sends what is waiting now. Resolves once the server has it, or shortly after if it can't be reached. */
  flush: () => Promise<void>;
};

const NOT_SYNCING: SyncApi = { status: null, flush: () => Promise.resolve() };

export const SyncContext = createContext<SyncApi>(NOT_SYNCING);

/** `useSync().status` is null unless this phone is signed in and syncing. */
export function useSync(): SyncApi {
  return useContext(SyncContext);
}

/** How long to wait before trying to start the sync again when it could not start (no connection to fetch it). */
const RESTART_AFTER_MS = 30_000;

/**
 * Keeps this phone's progress and the signed-in account's in step. Does
 * nothing at all, and loads nothing, where there is no account: a build
 * without Firebase, or nobody signed in. Signing out stops the sync and leaves
 * the progress on the phone exactly as it is.
 *
 * Call it once, beside `useProgress()`, and hand the result to
 * `SyncContext.Provider` for whatever shows the status.
 */
export function useCloudSync(progress: SyncableProgress): SyncApi {
  const account = useAccount();
  const uid = cloudEnabled && account.status === 'signed-in' ? account.user.uid : null;
  const { loaded } = progress;
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const [attempt, setAttempt] = useState(0);
  const session = useRef<SyncSession | null>(null);
  const latest = useRef(progress);
  latest.current = progress;

  // Deleting the account takes the saved progress with it. Registered as soon as somebody is signed in,
  // whether or not the sync itself has started, so a delete never leaves the progress behind.
  useEffect(() => {
    if (uid === null) return;
    return onBeforeAccountDelete(async (user) => {
      if (user.uid !== uid) return;
      const { deleteCloudProgress } = await import('./sync');
      await deleteCloudProgress(uid);
    });
  }, [uid]);

  // The sync itself, for as long as the same person is signed in and their progress has been read from the device.
  useEffect(() => {
    if (uid === null || !loaded) return;
    let cancelled = false;
    let restart: ReturnType<typeof setTimeout> | undefined;
    setStatus('syncing');
    import('./sync')
      .then(({ connectSync }) =>
        connectSync({
          uid,
          local: { get: () => latest.current.getState(), merge: (remote) => latest.current.mergeRemote(remote) },
          onStatus: (next) => {
            if (!cancelled) setStatus(next);
          },
        }),
      )
      .then((started) => {
        if (cancelled) {
          started.stop();
          return;
        }
        session.current = started;
        // Anything played between the progress loading and the sync starting.
        started.localChanged();
      })
      .catch(() => {
        if (cancelled) return;
        // Most likely the part of the app that syncs could not be fetched: there is no connection. Try again later.
        setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
        restart = setTimeout(() => setAttempt((count) => count + 1), RESTART_AFTER_MS);
      });
    return () => {
      cancelled = true;
      clearTimeout(restart);
      session.current?.stop();
      session.current = null;
    };
  }, [uid, loaded, attempt]);

  // Every change to the progress is the sync's business too. (It ignores the ones that are not: settings, the feed.)
  useEffect(() => {
    session.current?.localChanged();
  }, [progress.state]);

  // Leaving the screen is when a delayed write is most likely never to happen.
  useEffect(() => {
    if (uid === null) return;
    return subscribeAppState({
      onBackground: () => {
        void session.current?.flush();
      },
    });
  }, [uid]);

  const flush = useCallback(() => session.current?.flush() ?? Promise.resolve(), []);
  const shown = uid === null ? null : status;
  return useMemo(() => (shown === null ? { ...NOT_SYNCING, flush } : { status: shown, flush }), [shown, flush]);
}
