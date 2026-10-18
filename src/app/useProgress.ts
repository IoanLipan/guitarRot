import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addLessonDone,
  applyAnswer,
  createDebouncedSaver,
  createProgressRepo,
  emptyProgressState,
  type ProgressState,
  type Settings,
} from '@/progress';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ProgressHandle = {
  state: ProgressState;
  loaded: boolean;
  recordAnswer: (correct: boolean, itemId?: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Marks a course lesson finished. Safe to call twice for the same lesson. */
  completeLesson: (lessonId: string) => void;
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

  const recordAnswer = useCallback((correct: boolean, itemId?: string) => {
    setState((prev) => {
      const next = applyAnswer(prev, correct, todayIso(), itemId);
      saverRef.current.save(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      saverRef.current.save(next);
      return next;
    });
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setState((prev) => {
      if (prev.lessonsDone.includes(lessonId)) return prev;
      const next = { ...prev, lessonsDone: addLessonDone(prev.lessonsDone, lessonId) };
      saverRef.current.save(next);
      return next;
    });
  }, []);

  return { state, loaded, recordAnswer, updateSettings, completeLesson };
}
