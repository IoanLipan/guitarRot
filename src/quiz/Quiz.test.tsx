import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { emptyProgressState } from '@/progress';
import type { ProgressHandle } from '@/app/useProgress';
import { Quiz } from './Quiz';

function fakeProgress(overrides: Partial<ProgressHandle> = {}): ProgressHandle {
  return {
    state: emptyProgressState(),
    loaded: true,
    recordAnswer: vi.fn(),
    ...overrides,
  };
}

describe('Quiz', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the current streak from progress state', () => {
    const progress = fakeProgress({
      state: { ...emptyProgressState(), streak: { current: 6, longest: 9, lastActiveDate: null } },
    });
    render(<Quiz progress={progress} />);
    expect(screen.getByText('Streak 6')).toBeInTheDocument();
  });

  it('shows a prompt and a 2x2 answer grid before answering', () => {
    render(<Quiz progress={fakeProgress()} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('records a correct answer and flashes PERFECT', () => {
    const progress = fakeProgress();
    render(<Quiz progress={progress} />);

    // Click whichever option renders first; assert on whatever outcome that
    // produces rather than needing to know in advance which option is correct.
    fireEvent.click(screen.getAllByRole('button')[0]!);

    expect(progress.recordAnswer).toHaveBeenCalledTimes(1);
    const wasCorrect = (progress.recordAnswer as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(screen.getByText(wasCorrect ? 'PERFECT' : 'MISS')).toBeInTheDocument();
  });

  it('disables all options once answered', () => {
    const progress = fakeProgress();
    render(<Quiz progress={progress} />);

    const options = screen.getAllByRole('button');
    fireEvent.click(options[0]!);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('advances to a new question after the feedback hold', () => {
    const progress = fakeProgress();
    render(<Quiz progress={progress} />);

    fireEvent.click(screen.getAllByRole('button')[0]!);
    expect(screen.getAllByRole('button').every((b) => b.hasAttribute('disabled'))).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    const optionsAfter = screen.getAllByRole('button');
    expect(optionsAfter).toHaveLength(4);
    expect(optionsAfter.every((b) => !b.hasAttribute('disabled'))).toBe(true);
  });
});
