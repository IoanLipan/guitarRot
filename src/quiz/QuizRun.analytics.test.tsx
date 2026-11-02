import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { withSolfege } from '@/music';
import { emptyProgressState, RUN_LENGTH, type QuizDifficulty } from '@/progress';
import { fakeProgressHandle } from '@/app/testkit';
import { generateQuestion } from './generateQuiz';
import { Quiz } from './Quiz';

const analytics = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/cloud/analytics', () => ({ track: analytics.track }));

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

const RANDOM = 0.4;
function labels(difficulty: QuizDifficulty) {
  const question = generateQuestion(difficulty, { random: () => RANDOM });
  const wrong = question.options.find((option) => option !== question.correctAnswer) ?? '';
  const show = question.kind === 'note' ? withSolfege : (option: string) => option;
  return { right: show(question.correctAnswer), wrong: show(wrong) };
}

/** Answers every question of a run: `rightCount` right ones first, the rest wrong. */
function playRun(difficulty: QuizDifficulty, rightCount: number) {
  const { right, wrong } = labels(difficulty);
  for (let index = 0; index < RUN_LENGTH; index += 1) {
    if (index < rightCount) {
      fireEvent.click(screen.getByRole('button', { name: right }));
      act(() => void vi.advanceTimersByTime(1100));
    } else {
      fireEvent.click(screen.getByRole('button', { name: wrong }));
      fireEvent.click(screen.getByTestId('run-next'));
    }
  }
}

const choose = (difficulty: QuizDifficulty) => fireEvent.click(screen.getByTestId(`mode-${difficulty}`));

describe('a quiz run, as analytics sees it', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(RANDOM);
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;
    analytics.track.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // @ts-expect-error - jsdom has no matchMedia; put it back
    delete window.matchMedia;
  });

  function setup(strict = false) {
    const progress = fakeProgressHandle({ state: emptyProgressState() });
    const ui = <Quiz engine={fakeEngine()} progress={progress} />;
    render(strict ? <StrictMode>{ui}</StrictMode> : ui);
  }

  it('reports the start of a run with its difficulty, once, even where effects run twice', () => {
    setup(true);
    expect(analytics.track).not.toHaveBeenCalled();
    choose('medium');
    expect(analytics.track.mock.calls).toEqual([['quiz_run_start', { difficulty: 'medium' }]]);
  });

  it('reports the finish with the score and the stars', () => {
    setup();
    choose('easy');
    analytics.track.mockClear();
    playRun('easy', RUN_LENGTH);

    const finishes = analytics.track.mock.calls.filter(([name]) => name === 'quiz_run_finish');
    expect(finishes).toHaveLength(1);
    // Ten right answers on easy: three stars, and a score that grew with the combo.
    expect(finishes[0]?.[1]).toMatchObject({ difficulty: 'easy', stars: 3 });
    expect(finishes[0]?.[1].score).toBeGreaterThan(100);
  });

  it('reports a run with no stars as well: the finish does not depend on it paying anything', () => {
    setup();
    choose('hard');
    analytics.track.mockClear();
    playRun('hard', 0);

    expect(analytics.track.mock.calls).toEqual([['quiz_run_finish', { difficulty: 'hard', score: 0, stars: 0 }]]);
  });

  it('reports another run when "again" is chosen', () => {
    setup();
    choose('easy');
    playRun('easy', RUN_LENGTH);
    analytics.track.mockClear();

    fireEvent.click(screen.getByTestId('play-again'));
    expect(analytics.track.mock.calls).toEqual([['quiz_run_start', { difficulty: 'easy' }]]);
  });

  it('sends nothing for free practice', () => {
    setup();
    fireEvent.click(screen.getByTestId('mode-practice'));
    expect(analytics.track).not.toHaveBeenCalled();
  });
});
