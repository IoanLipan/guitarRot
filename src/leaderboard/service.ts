/**
 * Everything the leaderboard says to Firestore, in one place. Each call loads
 * the Firestore SDK on demand (see `src/cloud/firebase.ts`), so a build or a
 * session without an account never fetches it.
 *
 * Writes are not awaited by the screens: Firestore applies them to its local
 * copy at once and queues them for the server while the phone is offline, so
 * the screen shows the result straight away. The promises here resolve when
 * the server has accepted the write, and reject when its rules refused it.
 */
import { getFirestoreDb, loadFirestoreSdk } from '@/cloud/firebase';
import type { InstrumentId } from '@/music';
import { levelForXp } from '@/progress/levels';
import {
  BOARD_SIZE,
  LEADERBOARD_COLLECTION,
  parseEntry,
  type BoardEntry,
  type BoardKind,
  type EntryPatch,
} from './model';
import { normalizeName } from './name';
import { isoWeekKey } from './week';

async function open() {
  const [db, sdk] = await Promise.all([getFirestoreDb(), loadFirestoreSdk()]);
  return { db, sdk, ref: (uid: string) => sdk.doc(db, LEADERBOARD_COLLECTION, uid) };
}

/** The answer came from the device's saved copy, not the server: the phone is offline, or cannot get through. */
export class OfflineError extends Error {
  constructor() {
    super('The leaderboard could not be reached.');
    this.name = 'OfflineError';
  }
}

export type OwnEntry = {
  /** The player's row, or null when they are not on the board. */
  entry: BoardEntry | null;
  /** The newest change has not reached the server yet. */
  pending: boolean;
};

/**
 * Follows the player's own row, live: it answers from the saved copy at once
 * and again whenever the row changes (a write of this phone counts straight
 * away, flagged `pending` until the server has it). Returns the way to stop.
 */
export function watchOwnEntry(uid: string, onChange: (own: OwnEntry) => void, onError: (error: unknown) => void): () => void {
  let stop: (() => void) | undefined;
  let stopped = false;
  void open()
    .then(({ sdk, ref }) => {
      if (stopped) return;
      stop = sdk.onSnapshot(
        ref(uid),
        { includeMetadataChanges: true },
        (snapshot) => {
          onChange({
            entry: snapshot.exists() ? parseEntry(uid, snapshot.data()) : null,
            pending: snapshot.metadata.hasPendingWrites,
          });
        },
        onError,
      );
    })
    .catch(onError);
  return () => {
    stopped = true;
    stop?.();
  };
}

/** Puts the player on the board, starting from the XP they already have. This week's count starts at nothing. */
export async function joinBoard(uid: string, input: { name: string; xp: number; instrument: InstrumentId }): Promise<void> {
  const { sdk, ref } = await open();
  const xp = Number.isFinite(input.xp) ? Math.max(0, Math.floor(input.xp)) : 0;
  await sdk.setDoc(ref(uid), {
    name: normalizeName(input.name),
    level: levelForXp(xp),
    xp,
    weekKey: isoWeekKey(new Date()),
    weekXp: 0,
    instrument: input.instrument,
    updatedAt: sdk.serverTimestamp(),
  });
}

export async function renameEntry(uid: string, name: string): Promise<void> {
  const { sdk, ref } = await open();
  await sdk.updateDoc(ref(uid), { name: normalizeName(name), updatedAt: sdk.serverTimestamp() });
}

/** Takes the player off the board. Nothing is left behind, and doing it twice is fine. */
export async function removeEntry(uid: string): Promise<void> {
  const { sdk, ref } = await open();
  await sdk.deleteDoc(ref(uid));
}

/** Sends the writes `planUpdates` worked out, in order. */
export async function writePatches(uid: string, patches: readonly EntryPatch[]): Promise<void> {
  if (patches.length === 0) return;
  const { sdk, ref } = await open();
  const row = ref(uid);
  // Issued back to back, not one after the other's answer: they queue in this order, offline or not.
  await Promise.all(
    patches.map((patch) =>
      sdk.updateDoc(row, {
        xp: sdk.increment(patch.xpDelta),
        level: patch.level,
        instrument: patch.instrument,
        updatedAt: sdk.serverTimestamp(),
        ...(patch.week.kind === 'add' ? { weekXp: sdk.increment(patch.week.xp) } : {}),
        ...(patch.week.kind === 'start' ? { weekKey: patch.week.weekKey, weekXp: patch.week.xp } : {}),
      }),
    ),
  );
}

/**
 * The best {@link BOARD_SIZE} rows. The week's list holds only players who have
 * earned XP in `weekKey`; the all-time list everybody on the board. Needs the
 * server: an answer from the saved copy is refused as offline, because a list
 * that may be days old is not a leaderboard.
 */
export async function fetchBoard(kind: BoardKind, weekKey: string): Promise<BoardEntry[]> {
  const { db, sdk } = await open();
  const rows = sdk.collection(db, LEADERBOARD_COLLECTION);
  const ask =
    kind === 'week'
      ? sdk.query(rows, sdk.where('weekKey', '==', weekKey), sdk.where('weekXp', '>', 0), sdk.orderBy('weekXp', 'desc'), sdk.limit(BOARD_SIZE))
      : sdk.query(rows, sdk.orderBy('xp', 'desc'), sdk.limit(BOARD_SIZE));
  const snapshot = await sdk.getDocs(ask);
  if (snapshot.metadata.fromCache) throw new OfflineError();
  return snapshot.docs.flatMap((row) => parseEntry(row.id, row.data()) ?? []);
}

/** A player's place: how many have more XP, plus one. Counted on the server, not by downloading the board. */
export async function fetchRank(kind: BoardKind, weekKey: string, score: number): Promise<number> {
  const { db, sdk } = await open();
  const rows = sdk.collection(db, LEADERBOARD_COLLECTION);
  const ask =
    kind === 'week'
      ? sdk.query(rows, sdk.where('weekKey', '==', weekKey), sdk.where('weekXp', '>', score))
      : sdk.query(rows, sdk.where('xp', '>', score));
  const snapshot = await sdk.getCountFromServer(ask);
  return snapshot.data().count + 1;
}
