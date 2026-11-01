/**
 * How progress sits in Firestore, as plain data with no SDK in sight:
 *
 *     users/{uid} = { progress: <ProgressState as a JSON-safe map>, schemaVersion, updatedAt }
 *
 * One document per person. `updatedAt` is the server's clock and is added by
 * the writer (`serverTimestamp()`); nothing here reads it.
 */
import { localDateIso, migrate, PROGRESS_VERSION, pruneDaily, type ProgressState } from '@/progress';

/** The Firestore collection that holds one progress document per person. */
export const USERS_COLLECTION = 'users';

/** Firestore stops at 1 MiB per document. Real progress is a few tens of KB; this is only the point where it gets trimmed. */
export const MAX_PROGRESS_CHARS = 700_000;

/** What a person's document says, once read. */
export type RemoteRead =
  /** No document yet, or nothing usable in it (it is then overwritten with the merged progress). */
  | { kind: 'none' }
  /** Written by a newer version of the app: left alone, because this one would only damage it. */
  | { kind: 'newer' }
  | { kind: 'progress'; progress: ProgressState };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Field names Firestore refuses: empty, long (the limit is 1500 bytes), or of the form `__x__`. */
function isValidFieldName(name: string): boolean {
  return name !== '' && !/^__.*__$/.test(name) && name.length <= 400;
}

function withValidKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => isValidFieldName(key)));
}

/**
 * The progress as a map Firestore will take: JSON-safe (no `undefined`, no
 * class instances), with no map key Firestore refuses, and trimmed if it ever
 * threatened the one-document limit. The same function runs on what is read
 * back, so the two sides always compare like with like.
 */
export function toRemoteProgress(state: ProgressState): Record<string, unknown> {
  let progress = state;
  if (JSON.stringify(progress).length > MAX_PROGRESS_CHARS) {
    // The two things that can grow without a content cap: the daily tallies and the feed's memory.
    progress = {
      ...progress,
      daily: pruneDaily(progress.daily, 60, localDateIso(new Date())),
      seenContent: progress.seenContent.slice(-50),
    };
  }
  const safe = JSON.parse(JSON.stringify(progress)) as Record<string, unknown>;
  for (const field of ['srs', 'daily', 'achievements'] as const) {
    const value = safe[field];
    if (isRecord(value)) safe[field] = withValidKeys(value);
  }
  return safe;
}

/**
 * Reads the data of a person's document. Whatever is in `progress` goes
 * through `migrate`, the same check that guards the progress on the device, so
 * a damaged or hand-edited document can cost its own contents but cannot
 * crash the app.
 */
export function readRemoteDoc(data: unknown): RemoteRead {
  if (!isRecord(data)) return { kind: 'none' };
  const { schemaVersion, progress } = data;
  if (typeof schemaVersion === 'number' && schemaVersion > PROGRESS_VERSION) return { kind: 'newer' };
  if (!isRecord(progress)) return { kind: 'none' };
  if (typeof progress.version === 'number' && progress.version > PROGRESS_VERSION) return { kind: 'newer' };
  return { kind: 'progress', progress: migrate(progress) };
}

/** The document to write for `state`, apart from `updatedAt`, which the writer sets from the server's clock. */
export function remoteDocData(state: ProgressState): { progress: Record<string, unknown>; schemaVersion: number } {
  return { progress: toRemoteProgress(state), schemaVersion: PROGRESS_VERSION };
}

/**
 * The progress as it would come back after being written and read: pruned,
 * validated, and in the form every device compares in. Writing this and
 * reading it back gives the same thing, which is what makes "has the cloud got
 * what I have?" a question with a stable answer.
 */
export function canonicalProgress(state: ProgressState): ProgressState {
  const read = readRemoteDoc(remoteDocData(state));
  return read.kind === 'progress' ? read.progress : state;
}
