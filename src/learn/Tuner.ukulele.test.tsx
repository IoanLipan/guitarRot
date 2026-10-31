import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import type { MicPitchHandle, MicReading, MicStatus } from '@/app/useMicPitch';
import { InstrumentProvider } from '@/instrument';
import { UKULELE } from '@/music';

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

function reading(midi: number, cents: number): MicReading {
  return { midi, cents, hz: 440 * 2 ** ((midi + cents / 100 - 69) / 12) };
}

const ui = (onTunedAll?: () => void, engine = fakeEngine()) => (
  <InstrumentProvider id="ukulele">
    <Tuner engine={engine} onTunedAll={onTunedAll} />
  </InstrumentProvider>
);

describe('the tuner on a ukulele', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setMic('idle');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers four strings to hear, G C E A, numbered 4 down to 1', () => {
    render(ui());

    expect([0, 1, 2, 3].map((index) => screen.getByTestId(`hear-string-${index}`).textContent)).toEqual([
      'G (Sol)String 4',
      'C (Do)String 3',
      'E (Mi)String 2',
      'A (La)String 1',
    ]);
    expect(screen.queryByTestId('hear-string-4')).toBeNull();
  });

  it('targets G4 C4 E4 A4: each button plays its open string, on that string', () => {
    const engine = fakeEngine();
    render(ui(undefined, engine));

    for (const [stringIndex, midi] of [67, 60, 64, 69].entries()) {
      fireEvent.click(screen.getByTestId(`hear-string-${stringIndex}`));
      expect(engine.playNote).toHaveBeenLastCalledWith(midi, { stringIndex });
    }
    expect(UKULELE.tuning).toEqual([67, 60, 64, 69]);
  });

  it('talks about the ukulele, not the guitar', () => {
    setMic('unsupported');
    render(ui());
    expect(screen.getByTestId('tuner-unsupported')).toHaveTextContent('match your ukulele to it');
  });

  it('names the closest string by pitch, not by index: a reading near C4 is string 3, which is index 1', () => {
    setMic('listening', reading(60, 10));
    render(ui());

    expect(screen.getByTestId('tuner-string')).toHaveTextContent('String 3');
    expect(screen.getByTestId('hear-string-1')).toHaveAttribute('data-closest', 'true');
    expect(screen.getByTestId('hear-string-0')).toHaveAttribute('data-closest', 'false');
  });

  it('picks the high G over the C below it when you play a G', () => {
    setMic('listening', reading(67, -8));
    render(ui());
    expect(screen.getByTestId('tuner-string')).toHaveTextContent('String 4');
  });

  describe('tuning every string', () => {
    function hold(rerender: (node: React.ReactElement) => void, onTunedAll: () => void, midi: number, cents = 0) {
      setMic('listening', reading(midi, cents));
      rerender(ui(onTunedAll));
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    it('reports once, on the fourth open string heard in tune, whatever the order', () => {
      const onTunedAll = vi.fn();
      const { rerender } = render(ui(onTunedAll));

      // Not the guitar's six: four strings are all it takes. And not in string order, because the strings
      // do not climb: C4 is the lowest.
      for (const midi of [60, 64, 69]) hold(rerender, onTunedAll, midi);
      expect(onTunedAll).not.toHaveBeenCalled();

      hold(rerender, onTunedAll, 67);
      expect(onTunedAll).toHaveBeenCalledTimes(1);
    });

    it('does not count the guitar\'s strings: E2 held in tune is no string of a ukulele', () => {
      const onTunedAll = vi.fn();
      const { rerender } = render(ui(onTunedAll));

      for (const midi of [40, 45, 50, 55, 59]) hold(rerender, onTunedAll, midi);
      for (const midi of [60, 64, 69]) hold(rerender, onTunedAll, midi);

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('does not count the same string four times', () => {
      const onTunedAll = vi.fn();
      const { rerender } = render(ui(onTunedAll));

      for (let i = 0; i < 6; i += 1) {
        hold(rerender, onTunedAll, 69);
        setMic('listening', null);
        rerender(ui(onTunedAll));
      }

      expect(onTunedAll).not.toHaveBeenCalled();
    });

    it('needs the note in tune: a flat G does not count', () => {
      const onTunedAll = vi.fn();
      const { rerender } = render(ui(onTunedAll));

      for (const midi of [60, 64, 69]) hold(rerender, onTunedAll, midi);
      hold(rerender, onTunedAll, 67, -15);

      expect(onTunedAll).not.toHaveBeenCalled();
    });
  });
});
