import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useCountUp } from './useCountUp';

let renders = 0;

function Counter({ target, from }: { target: number; from?: number }) {
  renders += 1;
  const ref = useCountUp(target, from === undefined ? { durationMs: 1000 } : { durationMs: 1000, from });
  return (
    <span ref={ref} data-testid="n">
      {target}
    </span>
  );
}

describe('useCountUp', () => {
  beforeEach(() => {
    renders = 0;
    vi.useFakeTimers();
    // Animation frames on the fake clock, handing the callback the time it was called at.
    vi.stubGlobal('requestAnimationFrame', (callback: (now: number) => void) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => {
    // Unmount first, while the frames it asked for are still the stand-ins' to cancel.
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    // @ts-expect-error - jsdom has no matchMedia; put it back
    delete window.matchMedia;
  });

  const shown = () => Number(screen.getByTestId('n').textContent);

  it('shows the finished number at once when there is nothing to count from', () => {
    render(<Counter target={220} />);
    expect(shown()).toBe(220);
  });

  it('counts up from where it is told to, ending exactly on the target, without a re-render', () => {
    render(<Counter target={220} from={0} />);
    const rendersAtStart = renders;
    expect(shown()).toBe(0);

    act(() => void vi.advanceTimersByTime(500));
    const middle = shown();
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(220);

    act(() => void vi.advanceTimersByTime(700));
    expect(shown()).toBe(220);
    expect(renders).toBe(rendersAtStart);
  });

  it('races at first and settles on the last digits', () => {
    render(<Counter target={1000} from={0} />);

    act(() => void vi.advanceTimersByTime(300));
    // An ease-out: well over a third of the way after a third of the time.
    expect(shown()).toBeGreaterThan(500);
  });

  it('carries on from wherever it had got to when the target moves', () => {
    const { rerender } = render(<Counter target={100} from={0} />);
    act(() => void vi.advanceTimersByTime(400));
    const before = shown();
    expect(before).toBeGreaterThan(0);

    rerender(<Counter target={300} from={0} />);
    // It does not jump back to 0 or forward to 300.
    expect(shown()).toBeGreaterThanOrEqual(before);
    expect(shown()).toBeLessThan(300);

    act(() => void vi.advanceTimersByTime(1200));
    expect(shown()).toBe(300);
  });

  it('is the finished number with nothing to count', () => {
    render(<Counter target={0} from={0} />);
    expect(shown()).toBe(0);
  });

  it('does not count at all with reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;

    render(<Counter target={220} from={0} />);

    expect(shown()).toBe(220);
  });

  it('does not count where there are no animation frames', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    render(<Counter target={220} from={0} />);
    expect(shown()).toBe(220);
  });
});
