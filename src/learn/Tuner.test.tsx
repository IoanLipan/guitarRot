import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import type { MicPitchHandle, MicReading, MicStatus } from '@/app/useMicPitch';
import { STANDARD_TUNING } from '@/music';

/** The tuner is exercised against a scripted microphone; the hook has its own tests. */
const mic = vi.hoisted(() => ({
  current: null as unknown as MicPitchHandle,
}));

vi.mock('@/app/useMicPitch', () => ({
  useMicPitch: () => mic.current,
}));

const { Tuner, ANNOUNCE_GAP_MS } = await import('./Tuner');

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

function setMic(status: MicStatus, reading: MicReading | null = null) {
  mic.current = { status, reading, start: vi.fn(() => Promise.resolve()), stop: vi.fn() };
}

/** hz is not what the tuner shows for the note, but keep it honest anyway. */
function reading(midi: number, cents: number): MicReading {
  return { midi, cents, hz: 440 * 2 ** ((midi + cents / 100 - 69) / 12) };
}

describe('Tuner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setMic('idle');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('hear-it buttons', () => {
    it('shows six strings, E A D G B E, each with its solfège', () => {
      render(<Tuner engine={fakeEngine()} />);

      const buttons = STANDARD_TUNING.map((_, index) => screen.getByTestId(`hear-string-${index}`));
      expect(buttons.map((button) => button.textContent)).toEqual([
        'E (Mi)String 6',
        'A (La)String 5',
        'D (Re)String 4',
        'G (Sol)String 3',
        'B (Si)String 2',
        'E (Mi)String 1',
      ]);
    });

    it.each(STANDARD_TUNING.map((midi, stringIndex) => ({ midi, stringIndex })))(
      'plays open string $stringIndex (midi $midi) through the engine',
      ({ midi, stringIndex }) => {
        const engine = fakeEngine();
        render(<Tuner engine={engine} />);

        fireEvent.click(screen.getByTestId(`hear-string-${stringIndex}`));

        expect(engine.playNote).toHaveBeenCalledTimes(1);
        expect(engine.playNote).toHaveBeenCalledWith(midi, { stringIndex });
      },
    );

    it('works with no microphone at all', () => {
      setMic('unsupported');
      const engine = fakeEngine();
      render(<Tuner engine={engine} />);

      fireEvent.click(screen.getByTestId('hear-string-3'));

      expect(engine.playNote).toHaveBeenCalledWith(55, { stringIndex: 3 });
    });
  });

  describe('starting the microphone', () => {
    it('offers a Start tuner button that opens the mic', () => {
      render(<Tuner engine={fakeEngine()} />);

      fireEvent.click(screen.getByTestId('tuner-start'));

      expect(mic.current.start).toHaveBeenCalledTimes(1);
    });

    it('does not ask for the microphone until you tap', () => {
      render(<Tuner engine={fakeEngine()} />);
      expect(mic.current.start).not.toHaveBeenCalled();
      expect(screen.getByTestId('tuner-prompt')).toHaveTextContent(/start tuner/i);
    });

    it('shows a waiting state while the permission prompt is up', () => {
      setMic('starting');
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-start')).toBeDisabled();
    });

    it('offers Stop while listening, and stops the mic when tapped', () => {
      setMic('listening');
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.queryByTestId('tuner-start')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('tuner-stop'));

      expect(mic.current.stop).toHaveBeenCalledTimes(1);
    });

    it('tells you to play a string while it is listening to silence', () => {
      setMic('listening');
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-prompt')).toHaveTextContent(/play one string/i);
      expect(screen.getByTestId('tuner-note')).not.toHaveTextContent(/\(/);
    });
  });

  describe('when the microphone is not available', () => {
    it('explains a denied microphone kindly, and lets you try again', () => {
      setMic('denied');
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-denied')).toHaveTextContent(/microphone/i);
      expect(screen.getByTestId('tuner-denied')).toHaveTextContent(/by ear/i);

      fireEvent.click(screen.getByTestId('tuner-start'));
      expect(mic.current.start).toHaveBeenCalledTimes(1);
    });

    it('explains an unsupported device and hides the start button that could not work', () => {
      setMic('unsupported');
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-unsupported')).toHaveTextContent(/can’t|cannot|doesn’t/i);
      expect(screen.getByTestId('tuner-unsupported')).toHaveTextContent(/by ear/i);
      expect(screen.queryByTestId('tuner-start')).not.toBeInTheDocument();
    });

    it('shows neither message when the microphone is fine', () => {
      setMic('listening');
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.queryByTestId('tuner-denied')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tuner-unsupported')).not.toBeInTheDocument();
    });
  });

  describe('reading display', () => {
    it('shows the note with its solfège, octave, and the nearest string', () => {
      setMic('listening', reading(40, 2));
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-note')).toHaveTextContent('E (Mi)');
      expect(screen.getByTestId('tuner-detail')).toHaveTextContent('E2');
      expect(screen.getByTestId('tuner-string')).toHaveTextContent('String 6');
      expect(screen.getByTestId('hear-string-0')).toHaveAttribute('data-closest', 'true');
      expect(screen.getByTestId('hear-string-1')).toHaveAttribute('data-closest', 'false');
    });

    it('picks the closest string by pitch, counting how far off it is', () => {
      // An A string pulled 60 cents flat reads as G#2 plus 40 cents. The nearest
      // *note* is G#, but the string being tuned is clearly the A.
      setMic('listening', reading(44, 40));
      render(<Tuner engine={fakeEngine()} />);
      expect(screen.getByTestId('tuner-string')).toHaveTextContent('String 5');
    });

    it('spells accidentals with the sharp solfège', () => {
      setMic('listening', reading(66, 0));
      render(<Tuner engine={fakeEngine()} />);
      expect(screen.getByTestId('tuner-note')).toHaveTextContent('F# (Fa#)');
    });

    it('moves the needle across a -50 to +50 cents meter', () => {
      setMic('listening', reading(45, -25));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);

      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuemin', '-50');
      expect(meter).toHaveAttribute('aria-valuemax', '50');
      expect(meter).toHaveAttribute('aria-valuenow', '-25');
      // The needle rides a rail that is slid by a percentage of the meter's width.
      expect(screen.getByTestId('tuner-needle-rail').style.transform).toBe('translateX(25%)');

      setMic('listening', reading(45, 50));
      rerender(<Tuner engine={fakeEngine()} />);
      expect(screen.getByTestId('tuner-needle-rail').style.transform).toBe('translateX(100%)');
    });

    it('tells you to tighten a string that is too low', () => {
      setMic('listening', reading(45, -22));
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-hint')).toHaveTextContent('Tighten (too low)');
      expect(screen.getByTestId('tuner-cents')).toHaveTextContent('-22 cents');
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();
    });

    it('tells you to loosen a string that is too high', () => {
      setMic('listening', reading(45, 31));
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-hint')).toHaveTextContent('Loosen (too high)');
      expect(screen.getByTestId('tuner-cents')).toHaveTextContent('+31 cents');
    });
  });

  describe('in tune', () => {
    it('says In tune only after the string has held within 5 cents for about 0.4 s', () => {
      setMic('listening', reading(52, 1.4));
      render(<Tuner engine={fakeEngine()} />);

      // Within 5 cents, but only just arrived: not yet.
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();
      expect(screen.getByTestId('tuner-hint')).not.toHaveTextContent(/tighten|loosen/i);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.getByTestId('tuner-in-tune')).toHaveTextContent('In tune');
    });

    it('lights the target zone green once the note is held, and not before', () => {
      setMic('listening', reading(52, 1.4));
      render(<Tuner engine={fakeEngine()} />);
      expect(screen.getByTestId('tuner-zone')).toHaveAttribute('data-lit', 'false');

      act(() => {
        vi.advanceTimersByTime(450);
      });

      expect(screen.getByTestId('tuner-zone')).toHaveAttribute('data-lit', 'true');
      expect(screen.getByTestId('tuner-in-tune')).toHaveClass('pop-in');
    });

    it('moves the needle by transform on a rail, so it can ease, and never by left', () => {
      setMic('listening', reading(52, 10));
      render(<Tuner engine={fakeEngine()} />);

      const rail = screen.getByTestId('tuner-needle-rail');
      expect(rail).toHaveClass('tuner-needle');
      expect(rail.style.transform).toBe('translateX(60%)');
      expect(screen.getByTestId('tuner-needle').style.left).toBe('');
      expect(rail).toContainElement(screen.getByTestId('tuner-needle'));
    });

    it('starts the hold again if the string drifts out and back', () => {
      setMic('listening', reading(52, 2));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      setMic('listening', reading(52, 12));
      rerender(<Tuner engine={fakeEngine()} />);
      expect(screen.getByTestId('tuner-hint')).toHaveTextContent('Loosen (too high)');

      setMic('listening', reading(52, 3));
      rerender(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.getByTestId('tuner-in-tune')).toBeInTheDocument();
    });

    it('does not say In tune at exactly 5 cents out', () => {
      setMic('listening', reading(52, 5));
      render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();
    });

    it('drops the In tune badge when the string goes quiet', () => {
      setMic('listening', reading(52, 0));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByTestId('tuner-in-tune')).toBeInTheDocument();

      setMic('listening', null);
      rerender(<Tuner engine={fakeEngine()} />);
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();
    });

    it('makes the next string earn In tune for itself, even when it follows the last without a break', () => {
      setMic('listening', reading(52, 0));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByTestId('tuner-in-tune')).toBeInTheDocument();

      setMic('listening', reading(57, 0));
      rerender(<Tuner engine={fakeEngine()} />);
      expect(screen.queryByTestId('tuner-in-tune')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(screen.getByTestId('tuner-in-tune')).toBeInTheDocument();
    });
  });

  describe('tuning all six strings', () => {
    /** Plays one reading into a mounted tuner and holds it long enough to be in tune. */
    function hold(rerender: (ui: React.ReactElement) => void, ui: () => React.ReactElement, midi: number, cents = 0) {
      setMic('listening', reading(midi, cents));
      rerender(ui());
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    it('reports once, on the sixth open string heard in tune', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      STANDARD_TUNING.slice(0, 5).forEach((midi) => hold(rerender, ui, midi));
      expect(onTunedAll).not.toHaveBeenCalled();

      hold(rerender, ui, STANDARD_TUNING[5]!);
      expect(onTunedAll).toHaveBeenCalledTimes(1);
    });

    it('takes the strings in any order and a pause between them', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      [64, 40, 59, 45, 55, 50].forEach((midi) => {
        hold(rerender, ui, midi);
        setMic('listening', null);
        rerender(ui());
      });

      expect(onTunedAll).toHaveBeenCalledTimes(1);
    });

    it('does not report again however much more is tuned', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      for (const midi of [...STANDARD_TUNING, ...STANDARD_TUNING]) hold(rerender, ui, midi);

      expect(onTunedAll).toHaveBeenCalledTimes(1);
    });

    it('needs the six different strings: one string, again and again, is one', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      for (let i = 0; i < 8; i += 1) {
        hold(rerender, ui, 40);
        setMic('listening', null);
        rerender(ui());
      }

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('does not count a note held in tune that is not an open string', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      // Five open strings, and a steady B2: a fret on the A string, not the sixth string.
      STANDARD_TUNING.slice(0, 5).forEach((midi) => hold(rerender, ui, midi));
      hold(rerender, ui, 47);

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('does not count a string that is not yet in tune', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      STANDARD_TUNING.slice(0, 5).forEach((midi) => hold(rerender, ui, midi));
      hold(rerender, ui, STANDARD_TUNING[5]!, 12);

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('does not count a string that was only passed through, not held', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const { rerender } = render(ui());

      STANDARD_TUNING.slice(0, 5).forEach((midi) => hold(rerender, ui, midi));
      setMic('listening', reading(STANDARD_TUNING[5]!, 0));
      rerender(ui());
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('starts again when the tuner is opened afresh', () => {
      const onTunedAll = vi.fn();
      const ui = () => <Tuner engine={fakeEngine()} onTunedAll={onTunedAll} />;
      const first = render(ui());
      STANDARD_TUNING.slice(0, 5).forEach((midi) => hold(first.rerender, ui, midi));
      first.unmount();

      const second = render(ui());
      hold(second.rerender, ui, STANDARD_TUNING[5]!);

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('works without anyone listening', () => {
      const ui = () => <Tuner engine={fakeEngine()} />;
      const { rerender } = render(ui());
      expect(() => STANDARD_TUNING.forEach((midi) => hold(rerender, ui, midi))).not.toThrow();
    });
  });

  describe('before there is a note', () => {
    it('says what to do, at title size, instead of a dash that reads as loading', () => {
      render(<Tuner engine={fakeEngine()} />);

      const note = screen.getByTestId('tuner-note');
      expect(note).toHaveTextContent('Play a string');
      expect(note.textContent).not.toContain('—');
      expect(note).toHaveClass('text-title');
      expect(note).not.toHaveClass('text-display');
    });

    it('shows the note itself, large, once there is one', () => {
      setMic('listening', reading(40, 2));
      render(<Tuner engine={fakeEngine()} />);

      expect(screen.getByTestId('tuner-note')).toHaveClass('text-display');
      expect(screen.getByTestId('tuner-note')).not.toHaveTextContent('Play a string');
    });
  });

  describe('where things sit on a short phone', () => {
    it('puts Start tuner above the meter, and Hear each string after it, so none needs a scroll', () => {
      render(<Tuner engine={fakeEngine()} />);

      const before = (a: HTMLElement, b: HTMLElement) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(before(screen.getByTestId('tuner-start'), screen.getByTestId('tuner-meter'))).toBe(true);
      expect(before(screen.getByTestId('tuner-meter'), screen.getByTestId('hear-string-0'))).toBe(true);
      expect(screen.getByRole('heading', { name: 'Hear each string' })).toHaveClass('label');
    });

    it('keeps Stop tuner in the same place while it listens', () => {
      setMic('listening');
      render(<Tuner engine={fakeEngine()} />);

      const before = Boolean(
        screen.getByTestId('tuner-stop').compareDocumentPosition(screen.getByTestId('tuner-meter')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(before).toBe(true);
    });
  });

  describe('what a screen reader is told', () => {
    it('has one live region, and it is the verdict only: not the note, the hertz or the cents', () => {
      setMic('listening', reading(45, -22));
      const { container } = render(<Tuner engine={fakeEngine()} />);

      const live = container.querySelectorAll('[aria-live]');
      expect(live).toHaveLength(1);
      expect(live[0]).toBe(screen.getByTestId('tuner-live'));
      expect(screen.getByTestId('tuner-live')).toHaveClass('sr-only');
      // The readings themselves are outside it.
      for (const id of ['tuner-note', 'tuner-detail', 'tuner-cents', 'tuner-hint', 'tuner-meter']) {
        expect(screen.getByTestId('tuner-live')).not.toContainElement(screen.getByTestId(id));
      }
    });

    it('says the verdict, in the words on screen', () => {
      setMic('listening', reading(45, -22));
      render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.getByTestId('tuner-live')).toHaveTextContent('Tighten (too low)');
      expect(screen.getByTestId('tuner-live').textContent).not.toMatch(/\d/);
    });

    it('says nothing while nothing is heard, and nothing about a bare note', () => {
      setMic('listening');
      render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(ANNOUNCE_GAP_MS * 2);
      });
      expect(screen.getByTestId('tuner-live')).toBeEmptyDOMElement();
    });

    it('does not follow every reading: the cents moving inside one verdict say nothing new', () => {
      setMic('listening', reading(45, -22));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      const text = () => screen.getByTestId('tuner-live').textContent;
      expect(text()).toBe('Tighten (too low)');

      for (const cents of [-20, -18, -15, -11]) {
        setMic('listening', reading(45, cents));
        rerender(<Tuner engine={fakeEngine()} />);
        act(() => {
          vi.advanceTimersByTime(100);
        });
        expect(text()).toBe('Tighten (too low)');
      }
    });

    it('holds a change of verdict back until the last announcement is a few seconds old, then says the latest', () => {
      setMic('listening', reading(45, -22));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      const text = () => screen.getByTestId('tuner-live').textContent;

      // Over to the high side, and back and forth: none of it is read out inside the gap...
      for (const cents of [22, -22, 22]) {
        setMic('listening', reading(45, cents));
        rerender(<Tuner engine={fakeEngine()} />);
        act(() => {
          vi.advanceTimersByTime(300);
        });
        expect(text()).toBe('Tighten (too low)');
      }

      // ...and when the gap is over, it is the verdict now that is said, not the ones skipped.
      act(() => {
        vi.advanceTimersByTime(ANNOUNCE_GAP_MS);
      });
      expect(text()).toBe('Loosen (too high)');
    });

    it('clears at once when the string goes quiet, so the next verdict is a change', () => {
      setMic('listening', reading(45, -22));
      const { rerender } = render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('tuner-live')).toHaveTextContent('Tighten');

      setMic('listening', null);
      rerender(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('tuner-live')).toBeEmptyDOMElement();
    });

    it('announces In tune once the string is held', () => {
      setMic('listening', reading(52, 1));
      render(<Tuner engine={fakeEngine()} />);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      act(() => {
        vi.advanceTimersByTime(ANNOUNCE_GAP_MS);
      });

      expect(screen.getByTestId('tuner-live')).toHaveTextContent('In tune');
    });
  });

  it('writes its messages with curly apostrophes', () => {
    setMic('denied');
    const denied = render(<Tuner engine={fakeEngine()} />);
    expect(screen.getByTestId('tuner-denied').textContent).toContain('couldn’t');
    expect(screen.getByTestId('tuner-denied').textContent).not.toContain("'");
    denied.unmount();

    setMic('unsupported');
    render(<Tuner engine={fakeEngine()} />);
    expect(screen.getByTestId('tuner-unsupported').textContent).not.toContain("'");
  });
});
