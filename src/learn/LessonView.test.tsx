import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { MicPitchHandle, MicReading, MicStatus } from '@/app/useMicPitch';
import type { Lesson, LessonStep } from '@/content';
import { fretToMidi, noteName, STANDARD_TUNING, withSolfege } from '@/music';
import { CHECK, fakeEngine, lesson } from './testkit';

/** Scripted microphone; the hook has its own tests. */
const mic = vi.hoisted(() => ({ current: null as unknown as MicPitchHandle }));
vi.mock('@/app/useMicPitch', () => ({ useMicPitch: () => mic.current }));

type FakePlayer = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};
type FakeMetronome = FakePlayer & { playCountIn: ReturnType<typeof vi.fn> };

/** Every player ever made, and how many are alive (created, not yet disposed) right now. */
const audio = vi.hoisted(() => ({
  players: [] as unknown[],
  metronomes: [] as unknown[],
  alive: 0,
  mostAlive: 0,
}));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => {
      audio.alive += 1;
      audio.mostAlive = Math.max(audio.mostAlive, audio.alive);
      const player = {
        start: vi.fn(),
        stop: vi.fn(),
        dispose: vi.fn(() => {
          audio.alive -= 1;
        }),
        setSpeed: vi.fn(),
        progress: vi.fn(() => 0),
        currentBeat: vi.fn(() => 0),
        setLoopRange: vi.fn(),
        totalBeats: 8,
      };
      audio.players.push(player);
      return player;
    }),
    createMetronome: vi.fn(() => {
      const metronome = {
        start: vi.fn(),
        stop: vi.fn(),
        playCountIn: vi.fn(() => Promise.resolve()),
        dispose: vi.fn(),
      };
      audio.metronomes.push(metronome);
      return metronome;
    }),
  };
});

const { LessonView } = await import('./LessonView');

function setMic(status: MicStatus, reading: MicReading | null = null) {
  mic.current = { status, reading, start: vi.fn(() => Promise.resolve()), stop: vi.fn() };
}

function reading(midi: number): MicReading {
  return { midi, cents: 0, hz: 440 * 2 ** ((midi - 69) / 12) };
}

type Handlers = Partial<{
  nextLesson: Lesson;
  onClose: () => void;
  onComplete: (id: string) => void;
  onOpenNext: () => void;
}>;

function view(l: Lesson, handlers: Handlers = {}, engine = fakeEngine()) {
  const props = {
    lesson: l,
    engine,
    onClose: vi.fn(),
    onComplete: vi.fn(),
    ...handlers,
  };
  return { engine, props, ...render(<LessonView {...props} />) };
}

const next = () => screen.getByTestId('lesson-next');
const clickNext = () => fireEvent.click(next());

beforeEach(() => {
  setMic('idle');
  audio.players.length = 0;
  audio.metronomes.length = 0;
  audio.alive = 0;
  audio.mostAlive = 0;
});

describe('LessonView: moving through a lesson', () => {
  it('shows one step at a time with a progress bar', () => {
    view(lesson('x', [{ kind: 'text', body: ['First.'] }, { kind: 'text', body: ['Second.'] }, CHECK]));

    expect(screen.getByText('First.')).toBeInTheDocument();
    expect(screen.queryByText('Second.')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '0');

    clickNext();
    expect(screen.getByText('Second.')).toBeInTheDocument();
    expect(screen.queryByText('First.')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('goes back to the step before, and not before the first', () => {
    view(lesson('x', [{ kind: 'text', body: ['First.'] }, { kind: 'text', body: ['Second.'] }, CHECK]));
    expect(screen.queryByTestId('lesson-back')).not.toBeInTheDocument();

    clickNext();
    fireEvent.click(screen.getByTestId('lesson-back'));
    expect(screen.getByText('First.')).toBeInTheDocument();
  });

  it('closes from the ×', () => {
    const { props } = view(lesson('x', [{ kind: 'text', body: ['Hi.'] }, CHECK]));
    fireEvent.click(screen.getByTestId('lesson-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('labels the last step Finish', () => {
    view(lesson('x', [CHECK]));
    expect(next()).toHaveTextContent('Finish');
  });

  it('shows a text step with its title and every paragraph', () => {
    view(lesson('x', [{ kind: 'text', title: 'Why tune', body: ['Para one.', 'Para two.'] }, CHECK]));
    expect(screen.getByRole('heading', { name: 'Why tune' })).toBeInTheDocument();
    expect(screen.getByText('Para one.')).toBeInTheDocument();
    expect(screen.getByText('Para two.')).toBeInTheDocument();
  });
});

describe('LessonView: picking up where you left off', () => {
  const steps = [
    { kind: 'text', body: ['First.'] },
    { kind: 'text', body: ['Second.'] },
    CHECK,
  ] as const satisfies readonly LessonStep[];

  it('opens on the step it is told to start at', () => {
    render(<LessonView lesson={lesson('x', steps)} engine={fakeEngine()} initialStep={1} onClose={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText('Second.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('keeps an answered question answered, so Next stays unlocked on it', () => {
    render(
      <LessonView lesson={lesson('x', steps)} engine={fakeEngine()} initialStep={2} initialPassed={[2]} onClose={vi.fn()} onComplete={vi.fn()} />,
    );

    expect(next()).toBeEnabled();
  });

  it('never starts past its own end screen or before its first step', () => {
    const { unmount } = render(
      <LessonView lesson={lesson('x', steps)} engine={fakeEngine()} initialStep={99} onClose={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByTestId('lesson-complete')).toBeInTheDocument();
    unmount();

    render(<LessonView lesson={lesson('x', steps)} engine={fakeEngine()} initialStep={-3} onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText('First.')).toBeInTheDocument();
  });

  it('reports each step it moves to, and the questions answered', () => {
    const onStepChange = vi.fn();
    render(<LessonView lesson={lesson('x', steps)} engine={fakeEngine()} onStepChange={onStepChange} onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(onStepChange).toHaveBeenLastCalledWith(0, []);

    clickNext();
    clickNext();
    expect(onStepChange).toHaveBeenLastCalledWith(2, []);

    fireEvent.click(screen.getByText('String 1'));
    expect(onStepChange).toHaveBeenLastCalledWith(2, [2]);
  });

  it('does not report again just because its parent re-rendered with a new callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const props = { lesson: lesson('x', steps), engine: fakeEngine(), onClose: vi.fn(), onComplete: vi.fn() };
    const { rerender } = render(<LessonView {...props} onStepChange={first} />);
    rerender(<LessonView {...props} onStepChange={second} />);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});

describe('LessonView: finishing', () => {
  it('marks the lesson complete when the last step is passed, and shows the end screen', () => {
    const { props } = view(lesson('strings', [{ kind: 'text', body: ['Hi.'] }, CHECK], { goal: 'Name the strings.' }));

    clickNext();
    expect(props.onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('String 1'));
    clickNext();

    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith('strings');
    const end = screen.getByTestId('lesson-complete');
    expect(within(end).getByText('Lesson complete')).toBeInTheDocument();
    expect(within(end).getByText('Name the strings.')).toBeInTheDocument();
  });

  it('does not complete a lesson that was merely closed halfway', () => {
    const { props } = view(lesson('x', [{ kind: 'text', body: ['Hi.'] }, CHECK]));
    clickNext();
    fireEvent.click(screen.getByTestId('lesson-close'));
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('offers the next lesson on the end screen', () => {
    const upNext = lesson('two', [CHECK], { title: 'The second lesson' });
    const { props } = view(lesson('one', [CHECK]), { nextLesson: upNext, onOpenNext: vi.fn() });

    fireEvent.click(screen.getByText('String 1'));
    clickNext();

    const button = screen.getByTestId('lesson-next-lesson');
    expect(button).toHaveTextContent('Next lesson');
    expect(button).toHaveTextContent('The second lesson');
    fireEvent.click(button);
    expect(props.onOpenNext).toHaveBeenCalledTimes(1);
  });

  it('says so on the last lesson of the course, and offers the way back', () => {
    const { props } = view(lesson('last', [CHECK]));
    fireEvent.click(screen.getByText('String 1'));
    clickNext();

    expect(screen.queryByTestId('lesson-next-lesson')).not.toBeInTheDocument();
    expect(screen.getByText(/last lesson in the course/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lesson-back-to-course'));
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('LessonView: check steps', () => {
  it('blocks Next until the question is answered right', () => {
    view(lesson('x', [CHECK]));
    expect(next()).toBeDisabled();

    fireEvent.click(screen.getByText('String 6'));
    expect(next()).toBeDisabled();
    expect(screen.getByTestId('check-feedback')).toHaveTextContent('Not quite');
    expect(screen.getByTestId('check-feedback')).toHaveTextContent(CHECK.kind === 'check' ? CHECK.explain : '');
    expect(screen.getByText('String 6')).toHaveAttribute('data-state', 'wrong');

    fireEvent.click(screen.getByText('String 1'));
    expect(next()).toBeEnabled();
    expect(screen.getByTestId('check-feedback')).toHaveTextContent('Correct');
    expect(screen.getByText('String 1')).toHaveAttribute('data-state', 'right');
  });

  it('keeps the other options live after a miss, and a missed one stays shut', () => {
    view(lesson('x', [CHECK]));
    fireEvent.click(screen.getByText('String 6'));

    expect(screen.getByText('String 6')).toBeDisabled();
    expect(screen.getByText('String 3')).toBeEnabled();
    expect(screen.getByText('String 1')).toBeEnabled();
  });

  it('stays unlocked when you come back to a question you already got right', () => {
    view(lesson('x', [CHECK, { kind: 'text', body: ['After.'] }, CHECK]));
    fireEvent.click(screen.getByText('String 1'));
    clickNext();
    expect(screen.getByText('After.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-back'));
    expect(next()).toBeEnabled();
  });
});

describe('LessonView: listen steps', () => {
  const LISTEN: LessonStep = {
    kind: 'listen',
    caption: 'Play these two on the thin string.',
    targets: [
      { stringIndex: 5, fret: 0 },
      { stringIndex: 5, fret: 1 },
    ],
  };
  const E4 = fretToMidi(STANDARD_TUNING, 5, 0);
  const F4 = fretToMidi(STANDARD_TUNING, 5, 1);

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Rerender the view as the microphone now hears `midi` (or nothing). */
  function hear(utils: ReturnType<typeof view>, status: MicStatus, midi: number | null) {
    setMic(status, midi === null ? null : reading(midi));
    utils.rerender(<LessonView {...utils.props} />);
  }
  const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it('asks for one note at a time, named with its solfège and where to play it', () => {
    view(lesson('x', [LISTEN, CHECK]));
    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play E (Mi)');
    expect(screen.getByTestId('listen-where')).toHaveTextContent('string 1, open');
    expect(screen.getByText('Note 1 of 2')).toBeInTheDocument();
  });

  it('can be skipped, and Skip is there from the start', () => {
    view(lesson('x', [LISTEN, { kind: 'text', body: ['After the listen step.'] }, CHECK]));

    expect(screen.queryByTestId('lesson-next')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lesson-skip'));
    expect(screen.getByText('After the listen step.')).toBeInTheDocument();
  });

  it('plays the target when you tap Hear it', () => {
    const { engine } = view(lesson('x', [LISTEN, CHECK]));
    fireEvent.click(screen.getByTestId('listen-hear'));
    expect(engine.playNote).toHaveBeenCalledWith(E4, expect.objectContaining({ stringIndex: 5 }));
  });

  it('starts the microphone from a tap', () => {
    view(lesson('x', [LISTEN, CHECK]));
    fireEvent.click(screen.getByTestId('listen-mic'));
    expect(mic.current.start).toHaveBeenCalledTimes(1);
  });

  it('ticks a target the microphone hears held, then asks for the next', () => {
    const utils = view(lesson('x', [LISTEN, CHECK]));
    hear(utils, 'listening', E4);
    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play E (Mi)');
    wait(300);

    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play F (Fa)');
    expect(screen.getByText('Note 2 of 2')).toBeInTheDocument();
  });

  it('finishes the step when every target is heard, and Skip turns into Next', () => {
    const utils = view(lesson('x', [LISTEN, CHECK]));
    hear(utils, 'listening', E4);
    wait(300);
    hear(utils, 'listening', F4);
    wait(300);

    expect(screen.getByTestId('listen-complete')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-skip')).not.toBeInTheDocument();
    expect(next()).toBeEnabled();
    expect(mic.current.stop).toHaveBeenCalled();
  });

  it('forgives the detector an octave in either direction', () => {
    const utils = view(lesson('x', [LISTEN, CHECK]));
    hear(utils, 'listening', E4 - 12);
    wait(300);
    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play F (Fa)');

    hear(utils, 'listening', F4 + 12);
    wait(300);
    expect(screen.getByTestId('listen-complete')).toBeInTheDocument();
  });

  it('does not count a wrong note', () => {
    const utils = view(lesson('x', [LISTEN, CHECK]));
    hear(utils, 'listening', E4 + 2);
    wait(1000);
    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play E (Mi)');
    expect(screen.getByTestId('listen-status')).toHaveTextContent('F# (Fa#)');
  });

  it('does not count a note that is only touched, not held', () => {
    const utils = view(lesson('x', [LISTEN, CHECK]));
    hear(utils, 'listening', E4);
    wait(150);
    hear(utils, 'listening', null);
    wait(1000);
    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play E (Mi)');
  });

  it('does not tick off its own Hear it sound through the speaker', () => {
    const utils = view(lesson('x', [LISTEN, CHECK]));
    hear(utils, 'listening', E4);
    // The mic hears E right as Hear it is tapped: that is the app, not the player.
    fireEvent.click(screen.getByTestId('listen-hear'));
    wait(1000);
    expect(screen.getByTestId('listen-target')).toHaveTextContent('Play E (Mi)');
  });

  it('asks you to let the string go quiet before a repeated note counts again', () => {
    const repeat: LessonStep = {
      kind: 'listen',
      caption: 'Same note twice.',
      targets: [
        { stringIndex: 5, fret: 0 },
        { stringIndex: 5, fret: 0 },
      ],
    };
    const utils = view(lesson('x', [repeat, CHECK]));
    hear(utils, 'listening', E4);
    wait(300);
    expect(screen.getByText('Note 2 of 2')).toBeInTheDocument();

    // Still ringing: the second E must not count off the first one's sustain.
    wait(2000);
    expect(screen.getByText('Note 2 of 2')).toBeInTheDocument();
    expect(screen.getByTestId('listen-status')).toHaveTextContent(/let the string go quiet/i);

    hear(utils, 'listening', null);
    hear(utils, 'listening', E4);
    wait(300);
    expect(screen.getByTestId('listen-complete')).toBeInTheDocument();
  });

  it('says it is waiting while the microphone permission prompt is up', () => {
    setMic('starting');
    view(lesson('x', [LISTEN, CHECK]));
    expect(screen.getByTestId('listen-status')).toHaveTextContent('Waiting for the microphone');
    expect(screen.getByTestId('listen-mic')).toBeDisabled();
  });

  it('says what to do when the microphone is refused', () => {
    setMic('denied');
    view(lesson('x', [LISTEN, CHECK]));
    expect(screen.getByTestId('listen-status')).toHaveTextContent(/tap Skip/);
    expect(screen.getByTestId('lesson-skip')).toBeInTheDocument();
  });

  it('hides the microphone button on a device that has none', () => {
    setMic('unsupported');
    view(lesson('x', [LISTEN, CHECK]));
    expect(screen.queryByTestId('listen-mic')).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-skip')).toBeInTheDocument();
  });
});

describe('LessonView: riff and song steps', () => {
  it('shows a riff with its tab and does not start it by itself', () => {
    view(lesson('x', [{ kind: 'riff', riffId: 'open-strings-walk', caption: 'Play each string.' }, CHECK]));

    expect(screen.getByText('Play each string.')).toBeInTheDocument();
    expect(screen.getByTestId('player-panel')).toBeInTheDocument();
    expect(audio.players).toHaveLength(1);
    expect((audio.players[0] as FakePlayer).start).not.toHaveBeenCalled();
  });

  it('plays and stops from the button', () => {
    view(lesson('x', [{ kind: 'riff', riffId: 'open-strings-walk' }, CHECK]));
    const player = audio.players[0] as FakePlayer;

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(player.start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(player.stop).toHaveBeenCalled();
  });

  it('stops and disposes the player and the metronome on leaving the step', () => {
    view(lesson('x', [{ kind: 'riff', riffId: 'open-strings-walk' }, { kind: 'text', body: ['Next.'] }, CHECK]));
    const player = audio.players[0] as FakePlayer;
    const metronome = audio.metronomes[0] as FakeMetronome;

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(player.dispose).not.toHaveBeenCalled();

    clickNext();

    expect(screen.getByText('Next.')).toBeInTheDocument();
    expect(player.stop).toHaveBeenCalled();
    expect(player.dispose).toHaveBeenCalledTimes(1);
    expect(metronome.stop).toHaveBeenCalled();
    expect(metronome.dispose).toHaveBeenCalledTimes(1);
    expect(audio.alive).toBe(0);
  });

  it('stops and disposes when the lesson is closed', () => {
    view(lesson('x', [{ kind: 'song', songId: 'ode-to-joy' }, CHECK]));
    const player = audio.players[0] as FakePlayer;
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    // The parent unmounts the view on close; that is what releases the audio.
    cleanup();
    expect(player.stop).toHaveBeenCalled();
    expect(player.dispose).toHaveBeenCalledTimes(1);
  });

  it('never has two players alive at once across consecutive player steps', () => {
    view(
      lesson('x', [
        { kind: 'riff', riffId: 'open-strings-walk' },
        { kind: 'song', songId: 'ode-to-joy' },
        { kind: 'riff', riffId: 'mi-fa-sol' },
        CHECK,
      ]),
    );
    clickNext();
    clickNext();
    fireEvent.click(screen.getByTestId('lesson-back'));
    fireEvent.click(screen.getByTestId('lesson-back'));

    expect(audio.players.length).toBeGreaterThanOrEqual(4);
    expect(audio.mostAlive).toBe(1);
    expect(audio.alive).toBe(1);
  });

  it('shows a chord-chart song as a chart, and a melody song as tab', () => {
    const chart = view(lesson('x', [{ kind: 'song', songId: 'tom-dooley' }, CHECK]));
    expect(screen.getByTestId('chord-chart')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /tab/i })).not.toBeInTheDocument();
    chart.unmount();

    view(lesson('y', [{ kind: 'song', songId: 'ode-to-joy' }, CHECK]));
    expect(screen.queryByTestId('chord-chart')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /tab/i })).toBeInTheDocument();
  });

  it('turns the metronome on and counts in before playing', async () => {
    view(lesson('x', [{ kind: 'riff', riffId: 'open-strings-walk' }, CHECK]));
    const player = audio.players[0] as FakePlayer;
    const metronome = audio.metronomes[0] as FakeMetronome;

    fireEvent.click(screen.getByTestId('metronome-toggle'));
    expect(screen.getByTestId('metronome-toggle')).toHaveAttribute('aria-pressed', 'true');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    });

    expect(metronome.playCountIn).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(metronome.start).toHaveBeenCalledTimes(1);
  });
});

describe('LessonView: chord and fretboard steps', () => {
  it('shows a chord with its name, solfège name and tones, and strums on tap', () => {
    const { engine } = view(lesson('x', [{ kind: 'chord', chordId: 'Em-open', caption: 'Two fingers.' }, CHECK]));

    expect(screen.getByText('Em')).toBeInTheDocument();
    expect(screen.getByText('Mi minor')).toBeInTheDocument();
    expect(screen.getByTestId('chord-tones')).toHaveTextContent('E (Mi) · G (Sol) · B (Si)');
    expect(screen.getByText('Two fingers.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chord-strum'));
    expect(engine.strum).toHaveBeenCalledTimes(1);
    expect(engine.strum).toHaveBeenCalledWith(expect.any(Array), { strings: [0, 1, 2, 3, 4, 5] });
  });

  it('lists the notes on a fretboard with solfège, and plays one when tapped', () => {
    const { engine } = view(
      lesson('x', [
        {
          kind: 'fretboard',
          caption: 'The notes on the high string.',
          fretRange: [0, 3],
          positions: [
            { stringIndex: 5, fret: 0 },
            { stringIndex: 5, fret: 1 },
            { stringIndex: 5, fret: 3 },
          ],
          tapToHear: true,
        },
        CHECK,
      ]),
    );

    expect(screen.getByText('The notes on the high string.')).toBeInTheDocument();
    const notes = screen.getByTestId('neck-notes');
    expect(notes).toHaveTextContent('E (Mi)');
    expect(notes).toHaveTextContent('F (Fa)');
    expect(notes).toHaveTextContent('G (Sol)');

    fireEvent.click(screen.getByTestId('cell-s5f3'));
    expect(engine.playNote).toHaveBeenCalledWith(fretToMidi(STANDARD_TUNING, 5, 3), { stringIndex: 5 });
    expect(screen.getByTestId('neck-heard')).toHaveTextContent('G (Sol)');
  });

  it('is silent when tapToHear is off', () => {
    view(
      lesson('x', [
        { kind: 'fretboard', caption: 'Look.', fretRange: [0, 3], positions: [{ stringIndex: 0, fret: 0 }] },
        CHECK,
      ]),
    );
    expect(screen.queryByTestId('cell-s0f0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('neck-heard')).not.toBeInTheDocument();
  });

  it('names a step that points at nothing instead of crashing', () => {
    view(lesson('x', [{ kind: 'chord', chordId: 'no-such-chord' }, CHECK]));
    expect(screen.getByTestId('step-missing')).toBeInTheDocument();
    expect(next()).toBeEnabled();
  });
});

describe('LessonView: the tuner step', () => {
  it('embeds the tuner and never holds Next back', () => {
    view(lesson('x', [{ kind: 'tuner' }, CHECK]));
    expect(screen.getByTestId('tuner')).toBeInTheDocument();
    expect(next()).toBeEnabled();
  });
});

describe('LessonView: drill steps', () => {
  const DRILL: LessonStep = { kind: 'drill', strings: [0], fretRange: [0, 5], count: 3 };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Reads which fret the question is about off the board, and works out the answer from the theory core. */
  function answerFor(): { right: string; wrong: string } {
    const marker = document.querySelector('[data-testid^="marker-"]');
    const match = /^marker-s(\d)f(\d+)$/.exec(marker?.getAttribute('data-testid') ?? '');
    if (match === null) throw new Error('no question on screen');
    const right = noteName(fretToMidi(STANDARD_TUNING, Number(match[1]), Number(match[2])));
    const grid = within(screen.getByTestId('answer-grid'));
    const wrong = grid
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .find((text) => text !== withSolfege(right));
    if (wrong === undefined) throw new Error('no wrong option');
    return { right, wrong };
  }

  function answerRight() {
    fireEvent.click(screen.getByRole('button', { name: withSolfege(answerFor().right) }));
    act(() => void vi.advanceTimersByTime(1100));
  }

  it('asks `count` questions, then unlocks Next', () => {
    view(lesson('x', [DRILL]));
    expect(next()).toBeDisabled();
    expect(screen.getByTestId('drill-count')).toHaveTextContent('1 / 3');

    answerRight();
    expect(screen.getByTestId('drill-count')).toHaveTextContent('2 / 3');
    answerRight();
    expect(next()).toBeDisabled();
    answerRight();

    expect(screen.getByTestId('drill-summary')).toHaveTextContent('3 / 3');
    expect(next()).toBeEnabled();
  });

  it('shows the options with solfège but compares the plain note', () => {
    view(lesson('x', [DRILL]));
    const buttons = within(screen.getByTestId('answer-grid')).getAllByRole('button');
    for (const button of buttons) expect(button.textContent).toMatch(/^[A-G][#b]? \([A-Za-z#]+\)$/);
  });

  it('explains a miss and waits for you', () => {
    view(lesson('x', [DRILL]));
    fireEvent.click(screen.getByRole('button', { name: answerFor().wrong }));
    act(() => void vi.advanceTimersByTime(5000));

    expect(screen.getByTestId('drill-explanation')).toHaveTextContent(/String 6/);
    expect(screen.getByTestId('drill-count')).toHaveTextContent('1 / 3');
    fireEvent.click(screen.getByText('Next question →'));
    expect(screen.getByTestId('drill-count')).toHaveTextContent('2 / 3');
  });

  it('lets you finish with misses, and offers another go', () => {
    view(lesson('x', [DRILL]));
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: answerFor().wrong }));
      fireEvent.click(screen.getByText(i === 2 ? 'See how you did →' : 'Next question →'));
    }

    expect(screen.getByTestId('drill-summary')).toHaveTextContent('0 / 3');
    expect(next()).toBeEnabled();
    fireEvent.click(screen.getByTestId('drill-again'));
    expect(screen.getByTestId('drill-count')).toHaveTextContent('1 / 3');
  });

  it('only asks about the strings and frets it was given', () => {
    view(lesson('x', [{ kind: 'drill', strings: [1], fretRange: [2, 4], count: 6 }]));
    for (let i = 0; i < 6; i += 1) {
      const marker = document.querySelector('[data-testid^="marker-"]');
      const [, string, fret] = /^marker-s(\d)f(\d+)$/.exec(marker?.getAttribute('data-testid') ?? '') ?? [];
      expect(string).toBe('1');
      expect(Number(fret)).toBeGreaterThanOrEqual(2);
      expect(Number(fret)).toBeLessThanOrEqual(4);
      answerRight();
    }
  });
});
