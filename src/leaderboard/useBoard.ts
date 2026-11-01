import { useCallback, useEffect, useRef, useState } from 'react';
import { rankEntries, scoreOf, type BoardEntry, type BoardKind, type RankedEntry } from './model';
import { fetchBoard, fetchRank, OfflineError } from './service';

/** How long a list may take before it is called unreachable. Firestore itself waits far longer on a bad connection. */
export const FETCH_TIMEOUT_MS = 12_000;

/** Whether the phone says it has a connection. A guess, but a good one for deciding not to bother asking. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export type BoardResult = {
  /** The best rows, ranked. */
  rows: RankedEntry[];
  /** The player's place, or null when they have no score in this list (no XP yet this week). */
  ownRank: number | null;
};

export type BoardState =
  | { status: 'loading' }
  /** `offline` when the phone has no connection (or could not get through); otherwise something else went wrong. */
  | { status: 'error'; offline: boolean }
  | ({ status: 'ready' } & BoardResult);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OfflineError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

async function loadBoard(kind: BoardKind, weekKey: string, me: BoardEntry): Promise<BoardResult> {
  const rows = rankEntries(await fetchBoard(kind, weekKey), kind, weekKey);
  const score = scoreOf(me, kind, weekKey);
  // Nothing earned this week: not on this week's list, so no place in it.
  if (kind === 'week' && score === 0) return { rows, ownRank: null };
  const listed = rows.find((row) => row.uid === me.uid);
  return { rows, ownRank: listed !== undefined ? listed.rank : await fetchRank(kind, weekKey, score) };
}

/**
 * One list of the board and the player's place in it. `settled` says the
 * player's own row has reached the server (a list asked for before that would
 * leave them out). A list that has loaded stays on screen while a newer one is
 * fetched, so switching back and forth, or a rename, does not flash a skeleton.
 */
export function useBoard(kind: BoardKind, me: BoardEntry, weekKey: string, settled: boolean): { state: BoardState; retry: () => void } {
  const online = useOnline();
  const [results, setResults] = useState<Partial<Record<BoardKind, BoardResult>>>({});
  const [failures, setFailures] = useState<Partial<Record<BoardKind, { offline: boolean }>>>({});
  const [attempt, setAttempt] = useState(0);

  const latest = useRef(me);
  latest.current = me;
  // What changes the answer: a different list or week, or any of the player's own numbers or name.
  const stamp = `${me.name}|${me.xp}|${me.weekKey}|${me.weekXp}`;

  useEffect(() => {
    if (!settled || !online) return;
    let cancelled = false;
    withTimeout(loadBoard(kind, weekKey, latest.current), FETCH_TIMEOUT_MS).then(
      (result) => {
        if (cancelled) return;
        setResults((all) => ({ ...all, [kind]: result }));
        setFailures((all) => ({ ...all, [kind]: undefined }));
      },
      (error: unknown) => {
        if (cancelled) return;
        setFailures((all) => ({ ...all, [kind]: { offline: error instanceof OfflineError } }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [kind, weekKey, stamp, settled, online, attempt]);

  const retry = useCallback(() => {
    setFailures({});
    setAttempt((n) => n + 1);
  }, []);

  const result = results[kind];
  const failure = failures[kind];
  let state: BoardState;
  if (result !== undefined) state = { status: 'ready', ...result };
  else if (!online) state = { status: 'error', offline: true };
  else if (failure !== undefined) state = { status: 'error', offline: failure.offline };
  else state = { status: 'loading' };
  return { state, retry };
}
