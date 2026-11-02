/**
 * The progress sync engine: keeps the progress on this device and the
 * `users/{uid}` document in step, for as long as somebody is signed in.
 *
 * The idea is small. Progress only ever grows, and `mergeProgress` is a union
 * of what two sides know, so the engine never has to decide who is right:
 *
 *  - Every snapshot of the document (the first one, and later ones when
 *    another phone writes) is merged into the progress on the device.
 *  - Whenever the merged progress knows something the document does not, it is
 *    written back, after a quiet moment (a quiz run is one write, not forty).
 *  - Equal progress is never written. "Equal" is {@link syncSignature}: the
 *    synced fields, canonicalised, ignoring settings, feed history and the
 *    order of lists. A phone that has nothing new to say says nothing, which
 *    is what keeps two phones from writing to each other for ever.
 *
 * Nothing is written before the server has been heard from at least once in
 * the session, so a phone that starts offline can never overwrite an account
 * it has not seen. After that, writes made offline queue in Firestore's local
 * cache and are sent when the connection comes back.
 *
 * The engine takes the Firestore SDK as a parameter so it can be tested with
 * a fake; {@link connectSync} is the version wired to the real one.
 */
import type { Firestore, FirestoreError, DocumentSnapshot } from 'firebase/firestore';
import { emptyProgressState, syncSignature, type ProgressState } from '@/progress';
import { getFirestoreDb, loadFirestoreSdk } from './firebase';
import { canonicalProgress, readRemoteDoc, remoteDocData, USERS_COLLECTION } from './remoteProgress';

/** What the account card says about the progress: all saved, being saved, waiting for a connection, or stuck. */
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

/** The progress on this device, as the engine sees it. */
export type SyncLocal = {
  /** The progress as of this instant. */
  get(): ProgressState;
  /**
   * Folds the cloud's progress into this device's (without any award toasts), and gives back what it is now.
   * Calling it with progress the device already has changes nothing.
   */
  merge(remote: ProgressState): ProgressState;
};

type FirestoreSdk = Pick<
  typeof import('firebase/firestore'),
  'doc' | 'onSnapshot' | 'setDoc' | 'deleteDoc' | 'serverTimestamp'
>;

export type SyncOptions = {
  uid: string;
  db: Firestore;
  sdk: FirestoreSdk;
  local: SyncLocal;
  onStatus: (status: SyncStatus) => void;
  /** Quiet time after the last change on this device before it is written. */
  debounceMs?: number;
  /** A device that never goes quiet still writes this often. */
  maxWaitMs?: number;
  /** How long without a word from the server before the device counts as offline. */
  offlineAfterMs?: number;
};

export type SyncSession = {
  /** The progress on this device may have changed. Call it after every change. */
  localChanged(): void;
  /**
   * Writes what is waiting now, without the quiet moment; for going to the background or signing out.
   * The promise settles once the server has taken the write, or after a few seconds if it has not
   * (offline), so it is safe to await before something that ends the session.
   */
  flush(): Promise<void>;
  /** Stops listening and writing. */
  stop(): void;
  /** Stops syncing for a moment, so the document can be deleted without being written back. */
  pause(): void;
  /** Carries on after a pause. */
  resume(): void;
};

export const DEFAULT_DEBOUNCE_MS = 4000;
export const DEFAULT_MAX_WAIT_MS = 30_000;
export const DEFAULT_OFFLINE_AFTER_MS = 8000;
/** After merging in the cloud's progress, anything it lacks is written almost at once. */
const PUSH_AFTER_MERGE_MS = 250;
/** Writing the same progress this many times in a row means something is wrong; stop rather than loop. */
const MAX_SAME_PROGRESS_WRITES = 3;
/** How long a flush waits for the server's word before giving up on it (the write stays queued). */
const FLUSH_WAIT_MS = 3000;
const RETRY_FIRST_MS = 15_000;
const RETRY_MAX_MS = 5 * 60_000;

/** A fresh document with nothing in it reads as this. */
const EMPTY_SIGNATURE = syncSignature(emptyProgressState());

export function startSync(options: SyncOptions): SyncSession {
  const { uid, db, sdk, local, onStatus } = options;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const offlineAfterMs = options.offlineAfterMs ?? DEFAULT_OFFLINE_AFTER_MS;
  const ref = sdk.doc(db, USERS_COLLECTION, uid);

  let stopped = false;
  let paused = false;
  let unsubscribe: (() => void) | null = null;

  /** The signature of the progress the cloud holds, as far as this device knows. */
  let remoteSignature = EMPTY_SIGNATURE;
  /** The server has answered at least once this session. */
  let serverSeen = false;
  /** Whether the server can be reached: unknown until it answers or the wait runs out. */
  let reachable: boolean | null = null;
  /** A snapshot said this device has a write the server has not confirmed. */
  let snapshotPending = false;
  let inflight = 0;
  /** The cloud holds progress from a newer version of the app. It is left alone. */
  let newerInCloud = false;
  /** Writing failed for this progress (or looped); nothing is written until the progress changes, bar a retry. */
  let failure: { signature: string; retry: boolean } | null = null;
  let listenerFailed = false;

  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  let writeDueAt = 0;
  let firstUnsentAt: number | null = null;
  let offlineTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = RETRY_FIRST_MS;
  let relistenTimer: ReturnType<typeof setTimeout> | null = null;
  let relistenDelay = RETRY_FIRST_MS;

  /** The write most recently sent, settled whether it went through or not. */
  let lastWrite: Promise<void> = Promise.resolve();
  let lastWritten: string | null = null;
  let sameWrites = 0;
  let lastStatus: SyncStatus | null = null;

  // --- What this device holds -------------------------------------------------

  let signedState: ProgressState | null = null;
  let signedFor = '';
  /** The signature of the device's progress. Cached per state object: states are replaced, never edited. */
  function localSignature(): string {
    const state = local.get();
    if (state !== signedState) {
      signedState = state;
      signedFor = syncSignature(canonicalProgress(state));
    }
    return signedFor;
  }

  // --- Status -------------------------------------------------------------------

  function status(): SyncStatus {
    if (newerInCloud || listenerFailed || failure !== null) return 'error';
    const unsent = writeTimer !== null || inflight > 0 || snapshotPending || localSignature() !== remoteSignature;
    if (reachable === false) return unsent ? 'offline' : 'synced';
    return reachable === null || unsent ? 'syncing' : 'synced';
  }

  function report(): void {
    if (stopped) return;
    const next = status();
    if (next === lastStatus) return;
    lastStatus = next;
    onStatus(next);
  }

  // --- Whether the server can be reached ----------------------------------------

  function watchForSilence(): void {
    if (offlineTimer !== null) clearTimeout(offlineTimer);
    offlineTimer = setTimeout(() => {
      offlineTimer = null;
      if (reachable === null) {
        reachable = false;
        report();
      }
    }, offlineAfterMs);
  }

  function noteConnection(fromServer: boolean): void {
    if (fromServer) {
      reachable = true;
      if (offlineTimer !== null) clearTimeout(offlineTimer);
      offlineTimer = null;
    } else if (reachable === true) {
      reachable = false;
    }
  }

  const onBrowserOffline = () => {
    reachable = false;
    report();
  };
  const onBrowserOnline = () => {
    if (reachable === false) {
      reachable = null;
      watchForSilence();
      report();
    }
  };

  // --- Writing -----------------------------------------------------------------

  function clearWriteTimer(): void {
    if (writeTimer !== null) clearTimeout(writeTimer);
    writeTimer = null;
  }

  /**
   * Arranges a write. `postpone` is the quiet-period kind: every change pushes
   * it back, up to `maxWaitMs` after the first unsent one. Without it the
   * write is just brought forward if it was due later.
   */
  function schedule(delay: number, postpone: boolean): void {
    if (stopped || paused) return;
    const now = Date.now();
    firstUnsentAt ??= now;
    let at = now + delay;
    if (postpone) at = Math.min(at, firstUnsentAt + maxWaitMs);
    else if (writeTimer !== null && writeDueAt <= at) return;
    clearWriteTimer();
    writeDueAt = at;
    writeTimer = setTimeout(write, Math.max(0, at - now));
  }

  function scheduleRetry(): void {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
      if (failure?.retry === true) {
        failure = null;
        schedule(0, false);
      }
    }, retryDelay);
  }

  function write(): void {
    clearWriteTimer();
    firstUnsentAt = null;
    // Nothing goes out before the server has been heard from, or while the cloud's copy is a newer app's.
    if (stopped || paused || !serverSeen || newerInCloud) return;
    if (failure !== null && failure.signature === localSignature()) return;

    const mine = canonicalProgress(local.get());
    const signature = syncSignature(mine);
    if (signature === remoteSignature) {
      report();
      return;
    }

    // The same progress again and again means the cloud keeps ending up without it: a bug, not a sync.
    sameWrites = signature === lastWritten ? sameWrites + 1 : 0;
    lastWritten = signature;
    if (sameWrites >= MAX_SAME_PROGRESS_WRITES) {
      failure = { signature, retry: false };
      report();
      return;
    }

    const before = remoteSignature;
    remoteSignature = signature;
    inflight += 1;
    const sent = sdk.setDoc(ref, { ...remoteDocData(mine), updatedAt: sdk.serverTimestamp() });
    lastWrite = sent.then(
      () => undefined,
      () => undefined,
    );
    sent
      .then(() => {
        inflight -= 1;
        retryDelay = RETRY_FIRST_MS;
        report();
      })
      .catch(() => {
        inflight -= 1;
        // Firestore queues a write it cannot send yet; one that comes back refused will be refused again.
        if (remoteSignature === signature) remoteSignature = before;
        // A refused write is not the same progress written twice; the retries are not counted as a loop.
        lastWritten = null;
        failure = { signature, retry: true };
        scheduleRetry();
        report();
      });
    report();
  }

  // --- Listening ---------------------------------------------------------------

  function onSnapshot(snapshot: DocumentSnapshot): void {
    if (stopped || paused) return;
    const { fromCache, hasPendingWrites } = snapshot.metadata;
    noteConnection(!fromCache);
    listenerFailed = false;
    relistenDelay = RETRY_FIRST_MS;
    snapshotPending = hasPendingWrites;
    // Our own write, on its way to the server: what it holds is what we sent.
    if (hasPendingWrites) {
      report();
      return;
    }
    if (!fromCache) serverSeen = true;

    const read = snapshot.exists() ? readRemoteDoc(snapshot.data()) : ({ kind: 'none' } as const);
    newerInCloud = read.kind === 'newer';
    if (read.kind === 'newer') {
      clearWriteTimer();
      report();
      return;
    }
    if (read.kind === 'progress') {
      remoteSignature = syncSignature(read.progress);
      local.merge(read.progress);
    } else {
      remoteSignature = EMPTY_SIGNATURE;
    }
    if (localSignature() !== remoteSignature) {
      schedule(PUSH_AFTER_MERGE_MS, false);
    } else {
      // Whatever was waiting to be written is already there: no need to wait for it to find that out.
      clearWriteTimer();
      firstUnsentAt = null;
    }
    report();
  }

  function onError(): void {
    if (stopped || paused) return;
    // The listener is dead. Try again later, further apart each time, so a rule that refuses us costs little.
    listenerFailed = true;
    unsubscribe = null;
    if (relistenTimer !== null) clearTimeout(relistenTimer);
    relistenTimer = setTimeout(() => {
      relistenTimer = null;
      relistenDelay = Math.min(relistenDelay * 2, RETRY_MAX_MS);
      listen();
    }, relistenDelay);
    report();
  }

  function listen(): void {
    if (stopped || paused || unsubscribe !== null) return;
    watchForSilence();
    unsubscribe = sdk.onSnapshot(
      ref,
      { includeMetadataChanges: true },
      onSnapshot,
      (_error: FirestoreError) => onError(),
    );
  }

  function stopListening(): void {
    unsubscribe?.();
    unsubscribe = null;
    for (const timer of [writeTimer, offlineTimer, retryTimer, relistenTimer]) {
      if (timer !== null) clearTimeout(timer);
    }
    writeTimer = offlineTimer = retryTimer = relistenTimer = null;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('offline', onBrowserOffline);
    window.addEventListener('online', onBrowserOnline);
  }
  listen();
  report();

  return {
    localChanged() {
      if (stopped || paused) return;
      // Until the server has been heard from nothing can be written; the first snapshots decide what is.
      if (!serverSeen) {
        report();
        return;
      }
      const signature = localSignature();
      // New progress is worth another try after a failure.
      if (failure !== null && failure.signature !== signature) {
        failure = null;
        sameWrites = 0;
      }
      if (signature !== remoteSignature && failure === null && !newerInCloud) schedule(debounceMs, true);
      report();
    },
    flush() {
      if (writeTimer !== null) write();
      return waitFor(lastWrite, FLUSH_WAIT_MS);
    },
    stop() {
      stopped = true;
      stopListening();
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', onBrowserOffline);
        window.removeEventListener('online', onBrowserOnline);
      }
    },
    pause() {
      paused = true;
      stopListening();
    },
    resume() {
      if (stopped || !paused) return;
      paused = false;
      listen();
    },
  };
}

// --- Wired to the real Firestore ------------------------------------------------

const live = new Map<string, SyncSession>();

/**
 * Starts syncing for `uid` against the app's Firestore. Loads the Firestore
 * SDK (its own chunk), so call it only for someone signed in.
 */
export async function connectSync(options: Omit<SyncOptions, 'db' | 'sdk'>): Promise<SyncSession> {
  const [db, sdk] = await Promise.all([getFirestoreDb(), loadFirestoreSdk()]);
  const session = startSync({ ...options, db, sdk });
  const wrapped: SyncSession = {
    ...session,
    stop() {
      if (live.get(options.uid) === wrapped) live.delete(options.uid);
      session.stop();
    },
  };
  live.set(options.uid, wrapped);
  return wrapped;
}

/** How long deleting the document may take before the person is told to check their connection. */
const DELETE_TIMEOUT_MS = 15_000;

/** Resolves when `settled` does, or after `ms`, whichever is first. */
function waitFor(settled: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    void settled.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function timeout(ms: number): { promise: Promise<never>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Deleting the saved progress took too long.')), ms);
  });
  return { promise, cancel: () => clearTimeout(timer) };
}

/**
 * Removes this person's progress from the cloud, for the account deletion
 * flow. Syncing is paused first, or the delete would be seen as the document
 * going missing and be answered by writing the progress straight back. If
 * the delete fails (no connection, say) syncing carries on and the error is
 * passed up, so the account is not deleted with its data still in the cloud.
 */
export async function deleteCloudProgress(uid: string): Promise<void> {
  const session = live.get(uid);
  session?.pause();
  const limit = timeout(DELETE_TIMEOUT_MS);
  try {
    const [db, sdk] = await Promise.all([getFirestoreDb(), loadFirestoreSdk()]);
    await Promise.race([sdk.deleteDoc(sdk.doc(db, USERS_COLLECTION, uid)), limit.promise]);
  } catch (error) {
    session?.resume();
    throw error;
  } finally {
    limit.cancel();
  }
}
