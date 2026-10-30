import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyGameEvent,
  createDebouncedSaver,
  createProgressRepo,
  emptyProgressState,
  type Award,
  type GameEvent,
  type ProgressState,
  type Settings,
} from '@/progress';

/** An award that had something in it, with the event that earned it. */
export type AwardNotice = {
  /** Counts up from 1 with each notice, so a UI can tell a new one from a re-render. */
  id: number;
  event: GameEvent;
  award: Award;
};

export type ProgressHandle = {
  state: ProgressState;
  loaded: boolean;
  /** A free-practice quiz answer (the Quiz tab and the feed's quiz cards): `record` with mode 'practice'. */
  recordAnswer: (correct: boolean, itemId?: string) => void;
  /**
   * Records something that happened and answers with what it paid out. The
   * one way anything but a setting changes the game: see `applyGameEvent`.
   */
  record: (event: GameEvent) => Award;
  /** The latest award that had XP or an unlock in it; null until there is one. */
  lastAward: AwardNotice | null;
  /**
   * Calls `listener` with every award that had XP or an unlock in it, as it
   * happens. Unlike `lastAward` it misses none: two awards in one tap (the
   * last answer of a quiz run and the run itself) arrive as two calls, where
   * a re-render would only ever see the second. Returns the way to stop listening.
   */
  subscribeAwards: (listener: (notice: AwardNotice) => void) => () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Marks a course lesson finished. Safe to call twice for the same lesson. */
  completeLesson: (lessonId: string) => void;
  /**
   * Writes any pending save now instead of after the 500 ms debounce. Call it
   * when the app is about to leave the screen, where a delayed write may never run.
   */
  flush: () => void;
};

/** Loads progress once on mount and persists every change, debounced. */
export function useProgress(): ProgressHandle {
  const repoRef = useRef(createProgressRepo());
  const saverRef = useRef(createDebouncedSaver(repoRef.current));
  const [state, setState] = useState<ProgressState>(emptyProgressState());
  const [loaded, setLoaded] = useState(false);
  const [lastAward, setLastAward] = useState<AwardNotice | null>(null);

  // The state as of this instant. `record` has to hand back the award for an
  // event right now, so it works from this rather than from the rendered
  // `state`, which lags a render behind two calls made in the same tap.
  const stateRef = useRef(state);
  const awardCountRef = useRef(0);
  const listenersRef = useRef(new Set<(notice: AwardNotice) => void>());

  useEffect(() => {
    let cancelled = false;
    void repoRef.current.load().then((loadedState) => {
      if (cancelled) return;
      stateRef.current = loadedState;
      setState(loadedState);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const saver = saverRef.current;
    return () => void saver.flush();
  }, []);

  const commit = useCallback((next: ProgressState) => {
    stateRef.current = next;
    setState(next);
    saverRef.current.save(next);
  }, []);

  const record = useCallback(
    (event: GameEvent): Award => {
      const result = applyGameEvent(stateRef.current, event, new Date());
      if (result.state !== stateRef.current) commit(result.state);

      const { award } = result;
      // An award with nothing in it (a wrong answer, a lesson done twice) is not worth a toast.
      if (award.xp > 0 || award.unlocked.length > 0) {
        awardCountRef.current += 1;
        const notice: AwardNotice = { id: awardCountRef.current, event, award };
        setLastAward(notice);
        for (const listener of [...listenersRef.current]) listener(notice);
      }
      return award;
    },
    [commit],
  );

  const recordAnswer = useCallback(
    (correct: boolean, itemId?: string) => {
      record({
        type: 'quiz-answer',
        correct,
        mode: 'practice',
        ...(itemId === undefined ? {} : { itemId }),
      });
    },
    [record],
  );

  const subscribeAwards = useCallback((listener: (notice: AwardNotice) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      commit({ ...stateRef.current, settings: { ...stateRef.current.settings, ...patch } });
    },
    [commit],
  );

  const completeLesson = useCallback(
    (lessonId: string) => {
      record({ type: 'lesson-done', lessonId });
    },
    [record],
  );

  const flush = useCallback(() => {
    void saverRef.current.flush();
  }, []);

  return {
    state,
    loaded,
    recordAnswer,
    record,
    lastAward,
    subscribeAwards,
    updateSettings,
    completeLesson,
    flush,
  };
}
