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

const { Tuner } = await import('./Tuner');

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

      expect(screen.getByTestId('tuner-unsupported')).toHaveTextContent(/can't|cannot|doesn't/i);
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
  });
});
