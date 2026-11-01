import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { emptyProgressState, STORAGE_KEY, type ProgressState } from '@/progress';
import { useProgress } from './useProgress';

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ProgressState | null;

async function loadedHook() {
  const hook = renderHook(() => useProgress());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

/** What the account holds: some lessons, a bit of XP, a unlocked pick. */
function fromTheCloud(): ProgressState {
  return {
    ...emptyProgressState(),
    xp: 400,
    lessonsDone: ['chords', 'strum'],
    achievements: { 'first-lesson': '2026-03-01' },
    practiceDays: ['2026-03-01'],
  };
}

describe('useProgress: cloud sync hooks', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('getState is the state right now, even in the same tap as a change that has not rendered', async () => {
    const { result } = await loadedHook();

    let inTheSameTap: ProgressState | undefined;
    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'strings' });
      inTheSameTap = result.current.getState();
    });

    expect(inTheSameTap?.lessonsDone).toEqual(['strings']);
  });

  it('mergeRemote folds the account in, renders it, saves it, and answers with the result', async () => {
    const { result } = await loadedHook();
    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'strings' });
    });

    let merged: ProgressState | undefined;
    act(() => {
      merged = result.current.mergeRemote(fromTheCloud());
    });

    expect(merged?.lessonsDone).toEqual(['strings', 'chords', 'strum']);
    expect(result.current.state.lessonsDone).toEqual(['strings', 'chords', 'strum']);
    expect(result.current.state.xp).toBe(400);
    expect(result.current.getState()).toBe(result.current.state);
    expect(result.current.state.achievements).toMatchObject({ 'first-lesson': expect.any(String) });

    act(() => result.current.flush());
    expect(stored()).toMatchObject({ xp: 400, lessonsDone: ['strings', 'chords', 'strum'] });
  });

  it('earns nothing by it: no toast, no award notice', async () => {
    const { result } = await loadedHook();
    const heard = vi.fn();
    act(() => {
      result.current.subscribeAwards(heard);
    });

    act(() => {
      result.current.mergeRemote(fromTheCloud());
    });

    expect(heard).not.toHaveBeenCalled();
    expect(result.current.lastAward).toBeNull();
  });

  it('merging what the device already has changes nothing, not even the state object', async () => {
    const { result } = await loadedHook();
    act(() => {
      result.current.mergeRemote(fromTheCloud());
    });
    const before = result.current.state;

    let again: ProgressState | undefined;
    act(() => {
      again = result.current.mergeRemote(fromTheCloud());
    });

    expect(again).toBe(before);
    expect(result.current.state).toBe(before);
  });

  it('keeps what was just played when the account arrives in the same tap', async () => {
    const { result } = await loadedHook();

    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'strings' });
      result.current.mergeRemote(fromTheCloud());
      result.current.record({ type: 'lesson-done', lessonId: 'rhythm' });
    });

    expect(result.current.state.lessonsDone).toEqual(['strings', 'chords', 'strum', 'rhythm']);
    expect(result.current.state.xp).toBeGreaterThanOrEqual(400);
  });

  it('keeps this phone’s settings', async () => {
    const { result } = await loadedHook();
    act(() => {
      result.current.updateSettings({ toneId: 'clean', instrumentChosen: true });
    });

    act(() => {
      result.current.mergeRemote({
        ...fromTheCloud(),
        settings: { ...emptyProgressState().settings, toneId: 'acoustic', instrument: 'ukulele', instrumentChosen: true },
      });
    });

    expect(result.current.state.settings).toMatchObject({ toneId: 'clean', instrument: 'guitar' });
  });
});
