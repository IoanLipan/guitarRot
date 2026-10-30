import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { withSolfege } from '@/music';
import { emptyProgressState, RUN_LENGTH, type Award, type GameEvent, type QuizDifficulty } from '@/progress';
import { fakeProgressHandle, NO_AWARD } from '@/app/testkit';
import type { ProgressHandle } from '@/app/useProgress';
import type { QuizLayer } from '@/app/useBackButton';
import { generateQuestion } from './generateQuiz';
import { Quiz, type QuizApi } from './Quiz';
import { xpSteps } from './RunResults';

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

/**
 * A constant 0.4 deals the same note question every time, so the right answer
 * and a wrong one can be found by name. It is built the way the run builds it.
 */
const RANDOM = 0.4;
function labels(difficulty: QuizDifficulty) {
  const question = generateQuestion(difficulty, { random: () => RANDOM });
  const wrong = question.options.find((option) => option !== question.correctAnswer) ?? '';
  const show = question.kind === 'note' ? withSolfege : (option: string) => option;
  return { question, right: show(question.correctAnswer), wrong: show(wrong) };
}

/**
 * What each event pays, as a script. The first answer unlocks a pick, the tenth
 * another, and the run itself a third and crosses level 1 into 2: everything a
 * results screen has to gather from awards that arrive at different moments.
 */
function scriptedAwards() {
  let answers = 0;
  return (event: GameEvent): Award => {
    if (event.type === 'quiz-run') {
      return { ...NO_AWARD, xp: 55, levelBefore: 1, levelAfter: 2, unlocked: ['perfect-easy'], newBest: true };
    }
    answers += 1;
    const unlocked = answers === 1 ? ['first-correct'] : answers === 10 ? ['streak-10'] : [];
    return { ...NO_AWARD, xp: event.type === 'quiz-answer' && event.correct ? 5 : 0, unlocked };
  };
}

function makeProgress(overrides: Partial<ProgressHandle> = {}) {
  return fakeProgressHandle({ state: emptyProgressState(), record: vi.fn(scriptedAwards()), ...overrides });
}

function setup(progress = makeProgress()) {
  const onLayerChange = vi.fn<(layer: QuizLayer) => void>();
  render(<Quiz engine={fakeEngine()} progress={progress} onLayerChange={onLayerChange} />);
  return { progress, onLayerChange };
}

const choose = (difficulty: QuizDifficulty) => fireEvent.click(screen.getByTestId(`mode-${difficulty}`));

/** Taps an answer; a right one then holds a second before the next question loads. */
function answer(label: string, { holds = true }: { holds?: boolean } = {}) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  if (holds) act(() => void vi.advanceTimersByTime(1100));
}

function playRun(difficulty: QuizDifficulty, wrongAt: readonly number[] = []) {
  const { right, wrong } = labels(difficulty);
  for (let index = 0; index < RUN_LENGTH; index += 1) {
    if (wrongAt.includes(index)) {
      answer(wrong, { holds: false });
      fireEvent.click(screen.getByTestId('run-next'));
    } else {
      answer(right);
    }
  }
}

describe('a quiz run, on screen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(RANDOM);
    // Reduced motion: every count and fill is at its finished value the moment it is on screen.
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // @ts-expect-error - jsdom has no matchMedia; put it back
    delete window.matchMedia;
  });

  describe('the choice of difficulty', () => {
    it('offers easy, medium and hard, then free practice, each saying what it covers', () => {
      setup();

      expect(screen.getByRole('heading', { level: 1, name: 'Quiz' })).toBeInTheDocument();
      expect(screen.getByTestId('mode-easy')).toHaveTextContent('Natural notes on the first 3 frets, open chords');
      expect(screen.getByTestId('mode-medium')).toHaveTextContent('Every note up to fret 7, open chords and sevenths');
      expect(screen.getByTestId('mode-hard')).toHaveTextContent('Every note up to fret 12, every chord, 6 answers');
      expect(screen.getByTestId('mode-practice')).toHaveTextContent('Free practice');
      const order = screen.getAllByRole('button').map((button) => button.getAttribute('data-testid'));
      expect(order).toEqual(['mode-easy', 'mode-medium', 'mode-hard', 'mode-practice']);
    });

    it('shows the best score and rating at each difficulty, and "Not played yet" where there is none', () => {
      setup(
        makeProgress({
          state: {
            ...emptyProgressState(),
            quizBests: {
              easy: { best: 620, stars: 3, runs: 6 },
              medium: { best: 340, stars: 1, runs: 2 },
              hard: { best: 0, stars: 0, runs: 0 },
            },
          },
        }),
      );

      expect(screen.getByTestId('mode-easy')).toHaveTextContent('620');
      expect(within(screen.getByTestId('mode-easy')).getByRole('img', { name: '3 of 3 picks' })).toBeInTheDocument();
      expect(within(screen.getByTestId('mode-medium')).getByRole('img', { name: '1 of 3 picks' })).toBeInTheDocument();
      expect(screen.getByTestId('mode-hard')).toHaveTextContent('Not played yet');
    });

    it('makes the three feel different: lighter and heavier from easy to hard', () => {
      setup();
      const nameSize = (difficulty: string) =>
        screen.getByTestId(`mode-${difficulty}`).querySelector('.font-display')?.className ?? '';

      expect(nameSize('easy')).toContain('text-[30px]');
      expect(nameSize('medium')).toContain('text-[34px]');
      expect(nameSize('hard')).toContain('text-[40px]');
      expect(screen.getByTestId('mode-easy').className).toContain('bg-surface');
      expect(screen.getByTestId('mode-hard').className).toContain('bg-ink');
    });

    it('opens free practice from its own button, and the arrow gets back', () => {
      const { progress } = setup();

      fireEvent.click(screen.getByTestId('mode-practice'));
      expect(screen.getByTestId('streak')).toBeInTheDocument();
      expect(screen.queryByTestId('quiz-run')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Back to quiz modes' }));
      expect(screen.getByTestId('mode-select')).toBeInTheDocument();
      expect(progress.record).not.toHaveBeenCalled();
    });
  });

  describe('the run header', () => {
    it('opens on the first of ten questions with a score of 0, a quit control and no combo', () => {
      const { onLayerChange } = setup();
      choose('easy');

      expect(screen.getByTestId('quiz-run')).toHaveAttribute('data-difficulty', 'easy');
      expect(screen.getByTestId('run-score')).toHaveAccessibleName('Score 0');
      expect(screen.getByRole('progressbar', { name: 'Question 1 of 10' })).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByTestId('run-segments').children).toHaveLength(10);
      expect(screen.getByRole('button', { name: 'Quit run' })).toBeInTheDocument();
      expect(screen.queryByTestId('combo-chip')).toBeNull();
      expect(onLayerChange).toHaveBeenLastCalledWith('run');
    });

    it('fills a segment green for a right answer and red for a wrong one, and ticks the score up', () => {
      setup();
      choose('easy');
      const { right, wrong } = labels('easy');

      answer(right);
      answer(wrong, { holds: false });

      const outcomes = [...screen.getByTestId('run-segments').children].map((segment) => segment.getAttribute('data-outcome'));
      expect(outcomes.slice(0, 3)).toEqual(['right', 'wrong', 'current']);
      expect(outcomes.slice(3)).toEqual(Array(7).fill('todo'));
      // Easy pays 10 for a right answer at the start; a wrong one pays nothing.
      expect(screen.getByTestId('run-score')).toHaveAccessibleName('Score 10');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    });

    it('floats the points up from the answer that earned them', () => {
      setup();
      choose('easy');

      fireEvent.click(screen.getByRole('button', { name: labels('easy').right }));

      const float = screen.getByTestId('float-points');
      expect(float).toHaveTextContent('+10');
      expect(float).toHaveAttribute('aria-hidden', 'true');
      expect(float.closest('button')).toHaveTextContent(labels('easy').right);
    });

    it('shows the combo as ×2 once three are right in a row, and takes it away when one is wrong', () => {
      setup();
      choose('easy');
      const { right, wrong } = labels('easy');

      answer(right);
      answer(right);
      expect(screen.queryByTestId('combo-chip')).toBeNull();
      answer(right);
      expect(screen.getByTestId('combo-chip')).toHaveAccessibleName('Combo, times 2');
      // The fourth is paid at twice the base: 10 + 10 + 10 + 20.
      answer(right);
      expect(screen.getByTestId('run-score')).toHaveAccessibleName('Score 50');

      answer(wrong, { holds: false });
      expect(screen.queryByTestId('combo-chip')).toBeNull();
    });

    it('steps the chip up to ×3 after six in a row, as a new element so it pops again', () => {
      setup();
      choose('easy');
      const { right } = labels('easy');

      for (let index = 0; index < 3; index += 1) answer(right);
      const first = screen.getByTestId('combo-chip');
      for (let index = 0; index < 3; index += 1) answer(right);

      const second = screen.getByTestId('combo-chip');
      expect(second).toHaveAccessibleName('Combo, times 3');
      expect(second).not.toBe(first);
      expect(second).toHaveClass('pop-in');
    });
  });

  describe('the questions', () => {
    it('offers four answers at easy and medium, six at hard', () => {
      setup();
      choose('medium');
      expect(within(screen.getByTestId('answer-grid')).getAllByRole('button')).toHaveLength(4);
    });

    it('offers six answers at hard', () => {
      setup();
      choose('hard');
      expect(within(screen.getByTestId('answer-grid')).getAllByRole('button')).toHaveLength(6);
    });

    it('explains a wrong answer and waits for the player, and says what it found in the verdict where the question was', () => {
      setup();
      choose('easy');

      answer(labels('easy').wrong, { holds: false });

      expect(screen.getByRole('heading', { name: 'Not quite' })).toBeInTheDocument();
      expect(screen.getByTestId('quiz-explanation')).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(5000));
      expect(screen.getByRole('heading', { name: 'Not quite' })).toBeInTheDocument();
      expect(screen.getByTestId('run-next')).toHaveTextContent('Next question');
    });

    it('calls the next button "See results" after the tenth, and goes to them', () => {
      setup();
      choose('easy');
      const { right, wrong } = labels('easy');
      for (let index = 0; index < 9; index += 1) answer(right);

      answer(wrong, { holds: false });
      expect(screen.getByTestId('run-next')).toHaveTextContent('See results');
      fireEvent.click(screen.getByTestId('run-next'));

      expect(screen.getByTestId('run-results')).toBeInTheDocument();
    });
  });

  describe('quitting', () => {
    it('asks before a run is thrown away, and "Keep playing" keeps it', () => {
      const { progress } = setup();
      choose('easy');
      answer(labels('easy').right);

      fireEvent.click(screen.getByRole('button', { name: 'Quit run' }));

      const dialog = screen.getByRole('alertdialog', { name: 'Quit this run?' });
      expect(dialog).toHaveTextContent('Your score so far will not count');
      expect(screen.getByRole('button', { name: 'Keep playing' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByTestId('run-score')).toHaveAccessibleName('Score 10');
      expect(progress.record).toHaveBeenCalledTimes(1);
    });

    it('"Quit run" goes back to the choice and records no run, only the answers already given', () => {
      const { progress, onLayerChange } = setup();
      choose('easy');
      answer(labels('easy').right);
      answer(labels('easy').right);

      fireEvent.click(screen.getByRole('button', { name: 'Quit run' }));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quit run' }));

      expect(screen.getByTestId('mode-select')).toBeInTheDocument();
      const events = vi.mocked(progress.record).mock.calls.map(([event]) => event.type);
      expect(events).toEqual(['quiz-answer', 'quiz-answer']);
      expect(onLayerChange).toHaveBeenLastCalledWith('select');
    });

    it('can also be left from the shell: the guard asks first, and goes ahead only when told to', () => {
      const apiRef = { current: null as QuizApi | null };
      const progress = makeProgress();
      render(<Quiz engine={fakeEngine()} progress={progress} apiRef={apiRef} />);
      // Nothing to guard on the mode select.
      expect(apiRef.current?.guardLeave(vi.fn())).toBe(false);

      choose('easy');
      const proceed = vi.fn();
      let guarded = false;
      act(() => {
        guarded = apiRef.current?.guardLeave(proceed) ?? false;
      });
      expect(guarded).toBe(true);
      expect(proceed).not.toHaveBeenCalled();

      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quit run' }));
      expect(proceed).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('mode-select')).toBeInTheDocument();
    });

    it('Back, in a run, asks the same question; from results it just goes back', () => {
      const apiRef = { current: null as QuizApi | null };
      render(<Quiz engine={fakeEngine()} progress={makeProgress()} apiRef={apiRef} />);
      choose('easy');

      act(() => apiRef.current?.back());
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));

      playRun('easy');
      expect(screen.getByTestId('run-results')).toBeInTheDocument();
      act(() => apiRef.current?.back());
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByTestId('mode-select')).toBeInTheDocument();
    });
  });

  describe('the results', () => {
    it('plays a whole perfect run: 10 answers, then the score, the rating, the XP and the unlocks', () => {
      const { progress, onLayerChange } = setup();
      choose('easy');

      playRun('easy');

      // Every answer was recorded as an answer at this difficulty, and the run once.
      const events = vi.mocked(progress.record).mock.calls.map(([event]) => event);
      expect(events.filter((event) => event.type === 'quiz-answer')).toHaveLength(10);
      expect(events.filter((event) => event.type === 'quiz-answer' && event.mode === 'easy')).toHaveLength(10);
      expect(events[events.length - 1]).toEqual({ type: 'quiz-run', difficulty: 'easy', correct: 10, total: 10, score: 220 });

      // 10 x 3 at x1, 3 x 20 at x2, 3 x 30 at x3, then 40 at x4.
      expect(screen.getByTestId('results-score')).toHaveAccessibleName('Score 220');
      expect(screen.getByTestId('results-score')).toHaveTextContent('220');
      expect(screen.getByTestId('results-tally')).toHaveTextContent('10 of 10 right');
      expect(within(screen.getByTestId('run-results')).getByRole('img', { name: '3 of 3 picks' })).toBeInTheDocument();
      expect(screen.getByTestId('results-rating')).toHaveTextContent('Flawless');
      expect(screen.getByTestId('results-new-best')).toHaveTextContent('New best');
      // 10 answers at 5 and the run's 55.
      expect(screen.getByTestId('run-xp')).toHaveTextContent('+105 XP');
      expect(screen.getByTestId('run-xp')).toHaveTextContent('Level 2');
      expect(screen.getByTestId('run-xp')).toHaveTextContent('195 XP to level 3');
      expect(onLayerChange).toHaveBeenLastCalledWith('results');
    });

    it('lists every pick the run unlocked, the ones from single answers included', () => {
      setup();
      choose('easy');
      playRun('easy');

      const unlocked = screen.getByTestId('results-unlocked');
      expect(unlocked).toHaveTextContent('Picks unlocked');
      expect(within(unlocked).getAllByRole('listitem').map((item) => item.querySelector('span')?.textContent)).toEqual([
        'Right on the note',
        'Ten in a row',
        'Flawless on easy',
      ]);
    });

    it('leaves out the New best tag and the unlocks section when there is neither', () => {
      const award = (event: GameEvent): Award =>
        event.type === 'quiz-run' ? { ...NO_AWARD, xp: 20, newBest: false } : { ...NO_AWARD, xp: 5 };
      setup(makeProgress({ record: vi.fn(award) }));
      choose('easy');

      playRun('easy', [0, 2, 4, 6]);

      expect(screen.getByTestId('results-tally')).toHaveTextContent('6 of 10 right');
      expect(screen.getByTestId('results-rating')).toHaveTextContent('Good run');
      expect(within(screen.getByTestId('run-results')).getByRole('img', { name: '1 of 3 picks' })).toBeInTheDocument();
      expect(screen.queryByTestId('results-new-best')).toBeNull();
      expect(screen.queryByTestId('results-unlocked')).toBeNull();
    });

    it('scores a run with misses by the combo, the way the engine does', () => {
      setup();
      choose('easy');

      playRun('easy', [4, 5]);

      // 10, 10, 10, 20 (x2), two misses, then 10, 10, 10 and 20 as the combo builds again.
      expect(screen.getByTestId('results-score')).toHaveAccessibleName('Score 100');
      expect(screen.getByTestId('results-rating')).toHaveTextContent('Great run');
    });

    it('Play again is a fresh run: score 0, ten empty segments', () => {
      setup();
      choose('easy');
      playRun('easy');

      fireEvent.click(screen.getByTestId('play-again'));

      expect(screen.getByTestId('quiz-run')).toHaveAttribute('data-difficulty', 'easy');
      expect(screen.getByTestId('run-score')).toHaveAccessibleName('Score 0');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      expect(screen.queryByTestId('run-results')).toBeNull();
    });

    it('Change difficulty goes back to the choice', () => {
      const { onLayerChange } = setup();
      choose('easy');
      playRun('easy');

      fireEvent.click(screen.getByTestId('change-difficulty'));

      expect(screen.getByTestId('mode-select')).toBeInTheDocument();
      expect(onLayerChange).toHaveBeenLastCalledWith('select');
    });

    it('keeps both ways on in view, outside the part that scrolls', () => {
      setup();
      choose('easy');
      playRun('easy');

      const results = screen.getByTestId('run-results');
      const scroller = results.querySelector('.overflow-y-auto');
      expect(scroller).not.toBeNull();
      expect(scroller).not.toContainElement(screen.getByTestId('play-again'));
      expect(scroller).not.toContainElement(screen.getByTestId('change-difficulty'));
    });

    it('reports where the Quiz tab is as it goes: choice, run, results', () => {
      const { onLayerChange } = setup();
      choose('hard');
      playRun('hard');

      expect(onLayerChange.mock.calls.map(([layer]) => layer)).toEqual(['select', 'run', 'results']);
    });
  });
});

describe('the XP bar laps', () => {
  it('is one lap inside a level, from where you were to where you are', () => {
    // Level 3 starts at 300 XP and is 300 wide.
    expect(xpSteps(340, 50)).toEqual([{ level: 3, from: 40 / 300, to: 90 / 300 }]);
  });

  it('fills the level out and starts the next when a run crosses one', () => {
    const steps = xpSteps(280, 165);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ level: 2, to: 1 });
    expect(steps[1]).toMatchObject({ level: 3, from: 0 });
    expect(steps[1]!.to).toBeCloseTo(145 / 300 - 0, 1);
  });

  it('is a full lap for each level in between, if a run ever crosses more than one', () => {
    const steps = xpSteps(250, 700);
    expect(steps.map((step) => step.level)).toEqual([2, 3, 4]);
    expect(steps[1]).toMatchObject({ from: 0, to: 1 });
  });
});
