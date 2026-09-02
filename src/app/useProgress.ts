import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyAnswer,
  createDebouncedSaver,
  createProgressRepo,
  emptyProgressState,
  type ProgressState,
} from '@/progress';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ProgressHandle = {
  state: ProgressState;
  loaded: boolean;
  recordAnswer: (correct: boolean) => void;
};

/** Loads progress once on mount and persists every answer, debounced. */
export function useProgress(): ProgressHandle {
  const repoRef = useRef(createProgressRepo());
  const saverRef = useRef(createDebouncedSaver(repoRef.current));
  const [state, setState] = useState<ProgressState>(emptyProgressState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void repoRef.current.load().then((loadedState) => {
      if (cancelled) return;
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

  const recordAnswer = useCallback((correct: boolean) => {
    setState((prev) => {
      const next = applyAnswer(prev, correct, todayIso());
      saverRef.current.save(next);
      return next;
    });
  }, []);

  return { state, loaded, recordAnswer };
}
