import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { STORAGE_KEY } from '@/progress';
import { useProgress } from './useProgress';

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { lessonsDone: string[] } | null;

describe('useProgress: flush', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('writes a pending save immediately instead of after the debounce', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.completeLesson('strings'));
    // Debounced: nothing on disk yet, so swiping the app away now would lose it.
    expect(stored()).toBeNull();

    act(() => result.current.flush());

    expect(stored()?.lessonsDone).toEqual(['strings']);
  });

  it('is harmless when nothing is pending', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(() => act(() => result.current.flush())).not.toThrow();
    expect(stored()).toBeNull();
  });

  it('keeps one identity across renders, so effects that depend on it do not re-run', async () => {
    const { result, rerender } = renderHook(() => useProgress());
    const first = result.current.flush;
    await waitFor(() => expect(result.current.loaded).toBe(true));
    rerender();

    expect(result.current.flush).toBe(first);
  });
});
