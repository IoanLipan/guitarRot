import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHeardFor } from './useHeardFor';

type Props = { resetKey?: string; active?: boolean; audible?: boolean };

function setup(initial: Props = {}) {
  const onReached = vi.fn();
  const audible = { current: initial.audible ?? true };
  const hook = renderHook(
    ({ resetKey = 'song', active = true }: Props) =>
      useHeardFor({ resetKey, active, isAudible: () => audible.current, ms: 20_000, onReached }),
    { initialProps: initial },
  );
  return { onReached, audible, ...hook };
}

describe('useHeardFor', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does nothing just because it was mounted', () => {
    const { onReached } = setup();
    vi.advanceTimersByTime(0);
    expect(onReached).not.toHaveBeenCalled();
  });

  it('fires once the sound has been heard for the whole time, not before', () => {
    const { onReached } = setup();
    vi.advanceTimersByTime(19_500);
    expect(onReached).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('fires only once however long it carries on', () => {
    const { onReached } = setup();
    vi.advanceTimersByTime(120_000);
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('adds time up across a pause: one sitting is as long as the song stays open', () => {
    const { onReached, rerender } = setup();
    vi.advanceTimersByTime(10_000);
    rerender({ active: false });
    vi.advanceTimersByTime(60_000);
    expect(onReached).not.toHaveBeenCalled();

    rerender({ active: true });
    vi.advanceTimersByTime(9_500);
    expect(onReached).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('does not count time while nothing is audible, even if it is meant to be playing', () => {
    const { onReached, audible } = setup();
    audible.current = false;
    vi.advanceTimersByTime(60_000);
    expect(onReached).not.toHaveBeenCalled();

    audible.current = true;
    vi.advanceTimersByTime(20_000);
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('does not count while it is not active', () => {
    const { onReached } = setup({ active: false });
    vi.advanceTimersByTime(60_000);
    expect(onReached).not.toHaveBeenCalled();
  });

  it('does not pay a long gap in one go, as when a timer slept through a locked screen', () => {
    const { onReached } = setup();
    vi.advanceTimersByTime(5_000);
    // The clock jumps a minute while no tick runs.
    vi.setSystemTime(Date.now() + 60_000);
    vi.advanceTimersByTime(500);
    expect(onReached).not.toHaveBeenCalled();
  });

  it('starts over for a different song', () => {
    const { onReached, rerender } = setup({ resetKey: 'a' });
    vi.advanceTimersByTime(15_000);
    rerender({ resetKey: 'b' });
    vi.advanceTimersByTime(15_000);
    expect(onReached).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5_000);
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('can fire again for the next song', () => {
    const { onReached, rerender } = setup({ resetKey: 'a' });
    vi.advanceTimersByTime(20_000);
    rerender({ resetKey: 'b' });
    vi.advanceTimersByTime(20_000);
    expect(onReached).toHaveBeenCalledTimes(2);
  });

  it('stops counting when it unmounts', () => {
    const { onReached, unmount } = setup();
    vi.advanceTimersByTime(10_000);
    unmount();
    vi.advanceTimersByTime(60_000);
    expect(onReached).not.toHaveBeenCalled();
  });
});
