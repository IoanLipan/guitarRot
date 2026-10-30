import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { emptyProgressState } from '@/progress';
import { fakeProgressHandle } from '@/app/testkit';
import type { ProgressHandle } from '@/app/useProgress';
import { Quiz } from './Quiz';

function fakeProgress(overrides: Partial<ProgressHandle> = {}): ProgressHandle {
  return fakeProgressHandle(overrides);
}

/**
 * A constant 0.4 makes question generation fully deterministic: a note
 * question on the D string at fret 2, whose answer is E, offered as
 * D / E / F# / F. Both answer paths can then be driven by name.
 */
const CORRECT = 'E (Mi)';
const WRONG = 'D (Re)';

function fakeEngine(): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: vi.fn(),
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

/** The Quiz tab opens on its mode select; these tests are of the free practice behind its last button. */
function renderPractice(progress: ProgressHandle = fakeProgress()) {
  const view = render(<Quiz engine={fakeEngine()} progress={progress} />);
  fireEvent.click(screen.getByRole('button', { name: /Free practice/ }));
  return view;
}

describe('Quiz free practice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the current streak from progress state', () => {
    const progress = fakeProgress({
      state: { ...emptyProgressState(), streak: { current: 6, longest: 9, lastActiveDate: null } },
    });
    renderPractice(progress);
    expect(screen.getByText('Streak 6')).toBeInTheDocument();
  });

  it('bumps the streak counter when it goes up, and keeps just the one counter on screen', () => {
    const at = (current: number) =>
      fakeProgress({ state: { ...emptyProgressState(), streak: { current, longest: current, lastActiveDate: null } } });
    const { rerender } = renderPractice(at(0));
    // Not on first render.
    expect(screen.getByTestId('streak')).not.toHaveClass('bump');

    rerender(<Quiz engine={fakeEngine()} progress={at(1)} />);
    expect(screen.getAllByTestId('streak')).toHaveLength(1);
    expect(screen.getByTestId('streak')).toHaveTextContent('Streak 1');
    expect(screen.getByTestId('streak')).toHaveClass('bump');

    // A reset is not a bump.
    rerender(<Quiz engine={fakeEngine()} progress={at(0)} />);
    expect(screen.getAllByTestId('streak')).toHaveLength(1);
  });

  it('offers four options before answering', () => {
    renderPractice();
    expect(screen.getByRole('button', { name: CORRECT })).toBeInTheDocument();
    // Scoped to the grid: the prompt's fretboard tap targets are buttons too.
    expect(within(screen.getByTestId('answer-grid')).getAllByRole('button')).toHaveLength(4);
  });

  it('records a correct answer, flashes PERFECT, and advances on its own', () => {
    const progress = fakeProgress();
    renderPractice(progress);

    fireEvent.click(screen.getByRole('button', { name: CORRECT }));

    expect(progress.recordAnswer).toHaveBeenCalledWith(true, expect.any(String));
    expect(screen.getByText('PERFECT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CORRECT })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.queryByText('PERFECT')).toBeNull();
    expect(screen.getByRole('button', { name: CORRECT })).toBeEnabled();
  });

  it('explains a wrong answer and waits instead of auto-advancing', () => {
    const progress = fakeProgress();
    renderPractice(progress);

    fireEvent.click(screen.getByRole('button', { name: WRONG }));

    expect(progress.recordAnswer).toHaveBeenCalledWith(false, expect.any(String));
    expect(screen.getByText('MISS')).toBeInTheDocument();
    // The D string is MIDI 50; fret 2 is E, and D itself is open on it.
    expect(screen.getByTestId('quiz-explanation')).toHaveTextContent(
      'String 4 is D (Re) open, so 2 frets up is E (Mi). D (Re) is at fret 0 on that string — 2 frets lower.',
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Still waiting on the user — a mistake you scroll past is a mistake you repeat.
    expect(screen.getByText('MISS')).toBeInTheDocument();
  });

  it('moves on from a wrong answer when the user asks for the next question', () => {
    renderPractice();

    fireEvent.click(screen.getByRole('button', { name: WRONG }));
    fireEvent.click(screen.getByRole('button', { name: /Next question/ }));

    expect(screen.queryByText('MISS')).toBeNull();
    expect(screen.getByRole('button', { name: CORRECT })).toBeEnabled();
  });
});
