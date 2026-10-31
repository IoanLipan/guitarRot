import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { CHORDS } from '@/content';
import { emptyProgressState } from '@/progress';
import type { NoteQuizQuestion } from '@/quiz';
import { FIXTURE_COURSE, CHECK, card, lesson } from '@/learn/testkit';
import { fakeProgressHandle } from '@/app/testkit';

/**
 * What the screens do with the motion helpers, checked without pixels: which
 * helper is called, on what, and which classes and attributes the CSS keys off.
 * The helpers themselves are tested in motion.test.tsx.
 */
const fx = vi.hoisted(() => ({
  burst: vi.fn(),
  strumFx: vi.fn(),
  ripple: vi.fn(),
  vibrateStrings: vi.fn(),
  pingAt: vi.fn(),
}));
vi.mock('@/ui/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/ui/motion')>()),
  ...fx,
}));
vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn(), successHaptic: vi.fn(), errorHaptic: vi.fn() }));

const { AnswerGrid } = await import('@/quiz/AnswerGrid');
const { CheckStep } = await import('@/learn/steps/CheckStep');
const { ChordStep } = await import('@/learn/steps/ChordStep');
const { Explore } = await import('@/learn/Explore');
const { ChordCard } = await import('@/feed/ChordCard');
const { QuizCard } = await import('@/feed/QuizCard');
const { Fretboard } = await import('@/render/Fretboard');
const { LessonView } = await import('@/learn/LessonView');
const { Course } = await import('@/learn/Course');
const { Learn } = await import('@/learn/Learn');
const { START_PLACE } = await import('@/learn/learnPlace');
const { TabBar, tabDirection } = await import('@/app/TabBar');
const { SettingsSheet, SHEET_EXIT_MS } = await import('@/app/SettingsSheet');
const { StartScreen } = await import('@/app/StartScreen');
const { PlayPauseIcon } = await import('./PlayPauseIcon');

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

beforeEach(() => {
  Object.values(fx).forEach((mock) => mock.mockClear());
});
afterEach(cleanup);

describe('answers: AnswerGrid', () => {
  const grid = (picked: string | null) => (
    <AnswerGrid options={['A', 'B', 'C', 'D']} correctAnswer="B" picked={picked} onPick={vi.fn()} />
  );

  it('throws sparks from the right answer, and pops it', () => {
    render(grid('B'));
    const right = screen.getByRole('button', { name: 'B' });

    expect(fx.burst).toHaveBeenCalledTimes(1);
    expect(fx.burst).toHaveBeenCalledWith(right, expect.any(Object));
    expect(right).toHaveClass('answer-pop');
    expect(right).toHaveClass('answer-ring');
  });

  it('shakes the wrong answer with a red ring, and throws nothing', () => {
    render(grid('C'));
    const wrong = screen.getByRole('button', { name: 'C' });

    expect(wrong).toHaveClass('answer-shake');
    expect(wrong).toHaveAttribute('data-tone', 'bad');
    expect(fx.burst).not.toHaveBeenCalled();
  });

  it('does nothing before an answer, and does not throw twice for one answer', () => {
    const { rerender } = render(grid(null));
    expect(fx.burst).not.toHaveBeenCalled();
    rerender(grid('B'));
    rerender(grid('B'));
    expect(fx.burst).toHaveBeenCalledTimes(1);
  });

  it('presses like every other button', () => {
    render(grid(null));
    for (const button of screen.getAllByRole('button')) expect(button).toHaveClass('press');
  });
});

describe('answers: lesson check step', () => {
  const step = CHECK as Extract<typeof CHECK, { kind: 'check' }>;

  it('a wrong option shakes and stays shut; no sparks', () => {
    render(<CheckStep step={step} onDone={vi.fn()} />);

    fireEvent.click(screen.getByText('String 6'));

    const wrong = screen.getByText('String 6');
    expect(wrong).toHaveAttribute('data-state', 'wrong');
    expect(wrong).toHaveClass('answer-shake');
    expect(wrong).toBeDisabled();
    expect(fx.burst).not.toHaveBeenCalled();
    expect(within(wrong).queryByText(/./, { selector: 'svg' })).toBeNull();
  });

  it('the right option pops, draws a check and throws sparks, with the answer text unchanged', () => {
    const onDone = vi.fn();
    render(<CheckStep step={step} onDone={onDone} />);

    fireEvent.click(screen.getByText('String 1'));

    const right = screen.getByText('String 1');
    expect(right).toHaveAttribute('data-state', 'right');
    expect(right).toHaveClass('answer-pop');
    expect(right.querySelector('svg.draw-check')).not.toBeNull();
    expect(fx.burst).toHaveBeenCalledWith(right, expect.any(Object));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('check-feedback')).toHaveClass('rise-in');
  });
});

describe('Fretboard', () => {
  it('draws each string as a group the strum effect can find, and flags the muted ones', () => {
    const { container } = render(
      <Fretboard orientation="vertical" fretRange={[0, 4]} markers={[]} mutedStrings={[0]} />,
    );
    const groups = container.querySelectorAll('[data-string]');
    expect(groups).toHaveLength(6);
    expect(container.querySelector('[data-string="0"]')).toHaveAttribute('data-muted', 'true');
    expect(container.querySelector('[data-string="1"]')).not.toHaveAttribute('data-muted');
    expect(screen.getByTestId('fretboard')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('pulses the fret that was tapped', () => {
    render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={vi.fn()} />);

    fireEvent.click(screen.getByTestId('cell-s2f3'));

    expect(fx.pingAt).toHaveBeenCalledTimes(1);
    const [svg, cx, cy, radius] = fx.pingAt.mock.calls[0] ?? [];
    expect(svg).toBe(screen.getByTestId('fretboard'));
    expect(typeof cx).toBe('number');
    expect(typeof cy).toBe('number');
    expect(radius).toBeGreaterThan(0);
  });

  it('springs dots in only when asked to', () => {
    const markers = [{ stringIndex: 0, fret: 3 }];
    const { rerender } = render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={markers} />);
    expect(screen.getByTestId('marker-s0f3').parentElement).not.toHaveClass('fb-dot-pop');

    rerender(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={markers} popMarkers />);
    expect(screen.getByTestId('marker-s0f3').parentElement).toHaveClass('fb-dot-pop');
  });
});

describe('strumming a chord', () => {
  const chord = CHORDS[0]!;

  it('on a lesson chord step: the button ripples and the diagram strings shiver, and the sound still plays', () => {
    const engine = fakeEngine();
    render(<ChordStep step={{ kind: 'chord', chordId: chord.id }} engine={engine} />);

    fireEvent.click(screen.getByTestId('chord-strum'));

    expect(engine.strum).toHaveBeenCalledTimes(1);
    expect(fx.ripple).toHaveBeenCalledTimes(1);
    expect(fx.vibrateStrings).toHaveBeenCalledTimes(1);
    expect(fx.vibrateStrings.mock.calls[0]?.[0]).toContainElement(screen.getByTestId('fretboard'));
  });

  it('on a feed chord card: the whole card ripples and shivers', () => {
    const engine = fakeEngine();
    render(<ChordCard chord={chord} engine={engine} />);

    fireEvent.click(screen.getByTestId(`chord-card-${chord.id}`));

    expect(engine.strum).toHaveBeenCalledTimes(1);
    expect(fx.strumFx).toHaveBeenCalledTimes(1);
    expect(fx.strumFx.mock.calls[0]?.[0]).toBe(screen.getByTestId(`chord-card-${chord.id}`));
  });

  it('on an Explore tile: that tile ripples and shivers', () => {
    const engine = fakeEngine();
    render(<Explore engine={engine} />);

    fireEvent.click(screen.getByTestId(`chord-tile-${chord.id}`));

    expect(engine.strum).toHaveBeenCalledTimes(1);
    expect(fx.strumFx.mock.calls[0]?.[0]).toBe(screen.getByTestId(`chord-tile-${chord.id}`));
  });

  it('feed cards rise in when they are the active card, and not when they are not', () => {
    const { rerender } = render(<ChordCard chord={chord} engine={fakeEngine()} isActive />);
    expect(screen.getByTestId(`chord-card-${chord.id}`).querySelectorAll('.rise-in').length).toBeGreaterThan(0);

    rerender(<ChordCard chord={chord} engine={fakeEngine()} isActive={false} />);
    expect(screen.getByTestId(`chord-card-${chord.id}`).querySelectorAll('.rise-in')).toHaveLength(0);
    // Either way the content is there at once. (The name also appears inside the note chips: it is the big one.)
    expect(screen.getByText(chord.name, { selector: 'div' })).toBeInTheDocument();
  });
});

describe('quiz card on the feed', () => {
  const question: NoteQuizQuestion = {
    kind: 'note',
    id: 'note-s0f3',
    prompt: 'Name this note',
    position: { stringIndex: 0, fret: 3 },
    fretRange: [0, 5],
    correctAnswer: 'G',
    options: ['F#', 'G', 'G#', 'A'],
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a right answer shows a bar that fills over exactly the wait before it moves on, and a green wash', () => {
    const onAdvance = vi.fn();
    render(<QuizCard question={question} engine={fakeEngine()} onAnswered={vi.fn()} onAdvance={onAdvance} />);

    fireEvent.click(screen.getByRole('button', { name: 'G (Sol)' }));

    const sweep = screen.getByTestId('advance-sweep');
    expect(sweep.style.getPropertyValue('--advance-ms')).toBe('1000ms');
    expect(screen.getByTestId('flash-wash')).toHaveAttribute('data-tone', 'good');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('a wrong answer washes red, shows no countdown and waits', () => {
    const onAdvance = vi.fn();
    render(<QuizCard question={question} engine={fakeEngine()} onAnswered={vi.fn()} onAdvance={onAdvance} />);

    fireEvent.click(screen.getByRole('button', { name: 'A (La)' }));

    expect(screen.getByTestId('flash-wash')).toHaveAttribute('data-tone', 'bad');
    expect(screen.queryByTestId('advance-sweep')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('has no wash before an answer', () => {
    render(<QuizCard question={question} engine={fakeEngine()} onAnswered={vi.fn()} onAdvance={vi.fn()} />);
    expect(screen.queryByTestId('flash-wash')).not.toBeInTheDocument();
  });
});

describe('lesson motion', () => {
  const twoCards = lesson('m', [card(['One.']), card(['Two.']), card(['Three.'])]);

  function view(overrides: Partial<Parameters<typeof LessonView>[0]> = {}) {
    const props = { lesson: twoCards, engine: fakeEngine(), onClose: vi.fn(), onComplete: vi.fn(), ...overrides };
    return { props, ...render(<LessonView {...props} />) };
  }

  it('a step slides in from the right after Next and from the left after Back', () => {
    view();
    const scroll = () => screen.getByTestId('lesson-scroll');
    expect(scroll()).toHaveAttribute('data-dir', 'next');

    fireEvent.click(screen.getByTestId('lesson-next'));
    expect(scroll()).toHaveAttribute('data-dir', 'next');
    expect(screen.getByText('Two.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-back'));
    expect(scroll()).toHaveAttribute('data-dir', 'back');
    expect(screen.getByText('One.')).toBeInTheDocument();
  });

  it('the progress bar is slid, not stretched, and moves with the step', () => {
    view();
    const fill = screen.getByTestId('lesson-progress-fill');
    expect(fill.style.transform).toBe('translateX(-100%)');

    fireEvent.click(screen.getByTestId('lesson-next'));
    expect(fill.style.transform).toBe('translateX(-66.67%)');
  });

  it('finishing the lesson throws confetti from the badge, once, and the goal card arrives', () => {
    view();
    fireEvent.click(screen.getByTestId('lesson-next'));
    fireEvent.click(screen.getByTestId('lesson-next'));
    expect(fx.burst).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('lesson-next'));

    expect(screen.getByTestId('lesson-complete')).toBeInTheDocument();
    expect(fx.burst).toHaveBeenCalledTimes(1);
    const origin = fx.burst.mock.calls[0]?.[0] as HTMLElement;
    expect(origin).toContainElement(screen.getByTestId('lesson-complete').querySelector('svg'));
    expect(within(screen.getByTestId('lesson-complete')).getByText('Goal reached').closest('.scale-in')).not.toBeNull();
    // The content is there at once, whatever the animation does.
    expect(screen.getByText('Lesson complete')).toBeInTheDocument();
  });

  it('coming back to a finished lesson does not celebrate again', () => {
    view({ initialStep: 3 });
    expect(screen.getByTestId('lesson-complete')).toBeInTheDocument();
    expect(fx.burst).not.toHaveBeenCalled();
  });

  it('Next announces itself when a question has been answered', () => {
    view({ lesson: lesson('q', [CHECK, card(['After.'])]) });
    const nextButton = () => screen.getByTestId('lesson-next');
    expect(nextButton()).not.toHaveAttribute('data-ready');

    fireEvent.click(screen.getByText('String 1'));

    expect(nextButton()).toHaveAttribute('data-ready', 'true');
    expect(nextButton()).toHaveClass('answer-pop');
  });
});

describe('course list motion', () => {
  it('rows rise in one after another, the first few at least, and the wait is capped', () => {
    const many = Array.from({ length: 30 }, (_, index) => lesson(`l${index}`, [card(['x'])]));
    render(<Course lessons={many} done={[]} onOpen={vi.fn()} />);

    const delay = (id: string) =>
      Number.parseInt(screen.getByTestId(`lesson-row-${id}`).parentElement!.style.getPropertyValue('--delay'), 10);
    expect(delay('l0')).toBeLessThan(delay('l1'));
    expect(delay('l1')).toBeLessThan(delay('l5'));
    expect(delay('l29')).toBeLessThanOrEqual(500);
    expect(screen.getByTestId('lesson-row-l29').parentElement).toHaveClass('rise-in');
  });

  it('the continue card breathes, and the progress bar fills in from the left', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['alpha']} onOpen={vi.fn()} />);

    expect(screen.getByTestId('course-continue')).toHaveClass('glow-breathe');
    const fill = screen.getByRole('progressbar', { name: 'Course progress' }).firstElementChild as HTMLElement;
    expect(fill).toHaveClass('fill-in');
    expect(fill.style.transform).toBe('translateX(-66.67%)');
  });

  it('the section switch has one pill that slides to the chosen section', () => {
    const progress = { state: emptyProgressState(), completeLesson: vi.fn() };
    const place = { ...START_PLACE };
    const { rerender } = render(
      <Learn engine={fakeEngine()} progress={progress} place={place} onPlaceChange={vi.fn()} lessons={FIXTURE_COURSE} />,
    );
    const pill = screen.getByTestId('learn-tab-pill');
    expect(pill.style.transform).toContain('* (100% + 0.25rem)');
    expect(pill.style.transform).toContain('calc(0 *');

    rerender(
      <Learn
        engine={fakeEngine()}
        progress={progress}
        place={{ ...place, section: 'explore' }}
        onPlaceChange={vi.fn()}
        lessons={FIXTURE_COURSE}
      />,
    );
    expect(screen.getByTestId('learn-tab-pill').style.transform).toContain('calc(2 *');
    expect(screen.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('tab bar', () => {
  it('has one indicator pill, under the active tab', () => {
    const { rerender } = render(<TabBar active="feed" onChange={vi.fn()} />);
    const pill = () => screen.getByTestId('tab-indicator');
    expect(pill().style.transform).toBe('translateX(0%)');

    rerender(<TabBar active="learn" onChange={vi.fn()} />);
    expect(pill().style.transform).toBe('translateX(200%)');
    expect(pill()).toHaveAttribute('aria-hidden', 'true');
    // The pill is not a control.
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('the active tab icon pops, and only the active one', () => {
    render(<TabBar active="songs" onChange={vi.fn()} />);
    const popping = (name: string) => screen.getByRole('button', { name }).querySelector('.tab-icon-pop');
    expect(popping('Songs')).not.toBeNull();
    expect(popping('Feed')).toBeNull();
  });

  it('knows which way a tab move goes, by their order in the bar', () => {
    expect(tabDirection('feed', 'quiz')).toBe('forward');
    expect(tabDirection('quiz', 'feed')).toBe('back');
    expect(tabDirection('songs', 'learn')).toBe('forward');
    expect(tabDirection('learn', 'songs')).toBe('back');
  });
});

describe('settings sheet', () => {
  const engine = fakeEngine();
  const progress = fakeProgressHandle();
  const sheet = (open: boolean) => <SettingsSheet open={open} onClose={vi.fn()} engine={engine} progress={progress} />;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens in the open state', () => {
    render(sheet(true));
    expect(screen.getByTestId('settings-sheet')).toHaveAttribute('data-state', 'open');
  });

  it('slides away before it unmounts: stays, as closing, for the length of the slide', () => {
    const { rerender } = render(sheet(true));

    rerender(sheet(false));
    expect(screen.getByTestId('settings-sheet')).toHaveAttribute('data-state', 'closing');

    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_MS - 1);
    });
    expect(screen.getByTestId('settings-sheet')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
  });

  it('can be opened again after it has gone, and while it is still leaving', () => {
    const { rerender } = render(sheet(true));
    rerender(sheet(false));
    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_MS + 10);
    });
    rerender(sheet(true));
    expect(screen.getByTestId('settings-sheet')).toHaveAttribute('data-state', 'open');

    rerender(sheet(false));
    rerender(sheet(true));
    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_MS * 2);
    });
    expect(screen.getByTestId('settings-sheet')).toHaveAttribute('data-state', 'open');
  });

  it('goes at once under reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;
    try {
      const { rerender } = render(sheet(true));
      rerender(sheet(false));
      expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
    } finally {
      // @ts-expect-error - jsdom has no matchMedia; put it back
      delete window.matchMedia;
    }
  });
});

describe('start screen', () => {
  const plan = { kind: 'first', lesson: FIXTURE_COURSE[0]! } as const;
  const screenWith = (overrides: Partial<Parameters<typeof StartScreen>[0]> = {}) =>
    render(
      <StartScreen plan={plan} loading={false} failed={false} chosen={null} sharedLink={false} onChoose={vi.fn()} {...overrides} />,
    );

  it('drops the pick in and brings everything else up one after another, all in the DOM at once', () => {
    const { container } = screenWith();
    expect(container.querySelector('svg.logo-drop')).not.toBeNull();
    expect(container.querySelector('.logo-glow')).not.toBeNull();
    const delay = (id: string) => Number.parseInt(screen.getByTestId(id).style.getPropertyValue('--delay'), 10);
    expect(delay('start-learn')).toBeLessThan(delay('start-feed'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('guitarRot');
  });

  it('the tapped button shimmers with a spinner while the sounds load; the other just waits', () => {
    screenWith({ loading: true, chosen: 'learn' });

    const busy = screen.getByTestId('start-learn');
    expect(busy).toHaveTextContent('Loading sounds…');
    expect(busy).toHaveClass('shimmer');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy.querySelector('.animate-spin')).not.toBeNull();
    expect(screen.getByTestId('start-feed')).not.toHaveClass('shimmer');
    expect(screen.getByTestId('start-feed').querySelector('.animate-spin')).toBeNull();
  });

  it('shows no shimmer or spinner when nothing is loading', () => {
    screenWith();
    expect(document.querySelector('.shimmer')).toBeNull();
    expect(document.querySelector('.animate-spin')).toBeNull();
  });
});

describe('PlayPauseIcon', () => {
  it('holds both marks and shows the one that matches the state', () => {
    const { container, rerender } = render(<PlayPauseIcon playing={false} />);
    const mark = (name: string) => container.querySelector(`[data-icon="${name}"]`);
    expect(mark('play')).toHaveAttribute('data-on', 'true');
    expect(mark('pause')).toHaveAttribute('data-on', 'false');

    rerender(<PlayPauseIcon playing />);
    expect(mark('play')).toHaveAttribute('data-on', 'false');
    expect(mark('pause')).toHaveAttribute('data-on', 'true');
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('can show a stop square in place of the pause bars', () => {
    const { container } = render(<PlayPauseIcon playing stop />);
    expect(container.querySelector('[data-icon="stop"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="pause"]')).toBeNull();
  });
});
