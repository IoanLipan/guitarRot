import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { STORAGE_KEY, type ProgressState } from '@/progress';
import { useProgress } from './useProgress';

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ProgressState | null;

async function loaded() {
  const hook = renderHook(() => useProgress());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

describe('useProgress: the instrument', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts a fresh install on the guitar, not yet chosen', async () => {
    const { result } = await loaded();

    expect(result.current.state.settings.instrument).toBe('guitar');
    expect(result.current.state.settings.instrumentChosen).toBe(false);
  });

  it('switches to the ukulele and takes its tone, and what you earned stays', async () => {
    const { result } = await loaded();
    act(() => result.current.completeLesson('strings'));

    act(() => result.current.setInstrument('ukulele'));

    expect(result.current.state.settings.instrument).toBe('ukulele');
    expect(result.current.state.settings.instrumentChosen).toBe(true);
    expect(result.current.state.settings.toneId).toBe('ukulele');
    expect(result.current.state.settings.toneByInstrument).toEqual({ guitar: 'acoustic' });
    expect(result.current.state.lessonsDone).toEqual(['strings']);
    expect(result.current.state.xp).toBeGreaterThan(0);
  });

  it('is saved, and found again on the next launch', async () => {
    const first = await loaded();
    act(() => first.result.current.setInstrument('ukulele'));
    act(() => first.result.current.flush());
    expect(stored()?.settings.instrument).toBe('ukulele');
    first.unmount();

    const second = await loaded();
    expect(second.result.current.state.settings.instrument).toBe('ukulele');
    expect(second.result.current.state.settings.instrumentChosen).toBe(true);
  });

  it('is remembered across a switch away and back, with the tone you had on each', async () => {
    const { result } = await loaded();
    act(() => result.current.updateSettings({ toneId: 'rock' }));
    act(() => result.current.setInstrument('ukulele'));
    act(() => result.current.setInstrument('guitar'));

    expect(result.current.state.settings.instrument).toBe('guitar');
    expect(result.current.state.settings.toneId).toBe('rock');
  });

  it('keeps one identity across renders, so the shell\'s effects do not re-run', async () => {
    const { result, rerender } = await loaded();
    const { setInstrument } = result.current;
    act(() => setInstrument('ukulele'));
    rerender();

    expect(result.current.setInstrument).toBe(setInstrument);
  });

  it('does not write again for choosing what is already chosen', async () => {
    const { result } = await loaded();
    act(() => result.current.setInstrument('guitar'));
    act(() => result.current.flush());
    const written = localStorage.getItem(STORAGE_KEY);

    act(() => result.current.setInstrument('guitar'));
    act(() => result.current.flush());

    expect(localStorage.getItem(STORAGE_KEY)).toBe(written);
  });
});
