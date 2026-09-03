import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { emptyProgressState } from '@/progress';
import type { ProgressHandle } from '@/app/useProgress';
import { Quiz } from './Quiz';

function fakeProgress(overrides: Partial<ProgressHandle> = {}): ProgressHandle {
  return {
    state: emptyProgressState(),
    loaded: true,
    recordAnswer: vi.fn(),
    updateSettings: vi.fn(),
    ...overrides,
  };
}

/**
 * A constant 0.4 makes question generation fully deterministic: a note
 * question on the D string at fret 2, whose answer is E, offered as
 * D / E / F# / F. Both answer paths can then be driven by name.
 */
const CORRECT = 'E';
const WRONG = 'D';

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

describe('Quiz', () => {
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
    render(<Quiz engine={fakeEngine()} progress={progress} />);
    expect(screen.getByText('Streak 6')).toBeInTheDocument();
  });

  it('offers four options before answering', () => {
    render(<Quiz engine={fakeEngine()} progress={fakeProgress()} />);
    expect(screen.getByRole('button', { name: CORRECT })).toBeInTheDocument();
    // Scoped to the grid: the prompt's fretboard tap targets are buttons too.
    expect(within(screen.getByTestId('answer-grid')).getAllByRole('button')).toHaveLength(4);
  });

  it('records a correct answer, flashes PERFECT, and advances on its own', () => {
    const progress = fakeProgress();
    render(<Quiz engine={fakeEngine()} progress={progress} />);

    fireEvent.click(screen.getByRole('button', { name: CORRECT }));

    expect(progress.recordAnswer).toHaveBeenCalledWith(true);
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
    render(<Quiz engine={fakeEngine()} progress={progress} />);

    fireEvent.click(screen.getByRole('button', { name: WRONG }));

    expect(progress.recordAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByText('MISS')).toBeInTheDocument();
    // The D string is MIDI 50; fret 2 is E, and D itself is open on it.
    expect(screen.getByTestId('quiz-explanation')).toHaveTextContent(
      'String 4 is D open, so 2 frets up is E. D is at fret 0 on that string — 2 frets lower.',
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Still waiting on the user — a mistake you scroll past is a mistake you repeat.
    expect(screen.getByText('MISS')).toBeInTheDocument();
  });

  it('moves on from a wrong answer when the user asks for the next question', () => {
    render(<Quiz engine={fakeEngine()} progress={fakeProgress()} />);

    fireEvent.click(screen.getByRole('button', { name: WRONG }));
    fireEvent.click(screen.getByRole('button', { name: /Next question/ }));

    expect(screen.queryByText('MISS')).toBeNull();
    expect(screen.getByRole('button', { name: CORRECT })).toBeEnabled();
  });
});
