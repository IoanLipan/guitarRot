import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MicPitchHandle, MicReading } from '@/app/useMicPitch';
import { fakeProgressHandle } from '@/app/testkit';
import { STANDARD_TUNING } from '@/music';
import { fakeEngine, lesson } from './testkit';

/** The scripted microphone both the Tuner section and a lesson's tuner step listen to. */
const mic = vi.hoisted(() => ({ current: null as unknown as MicPitchHandle }));
vi.mock('@/app/useMicPitch', () => ({ useMicPitch: () => mic.current }));

const { Learn } = await import('./Learn');
const { LessonView } = await import('./LessonView');
const { START_PLACE } = await import('./learnPlace');

function play(midi: number | null) {
  const reading: MicReading | null =
    midi === null ? null : { midi, cents: 0, hz: 440 * 2 ** ((midi - 69) / 12) };
  mic.current = { status: 'listening', reading, start: vi.fn(() => Promise.resolve()), stop: vi.fn() };
}

/** Holds each open string in tune for long enough to count, re-rendering with `ui` as it goes. */
function tuneAllSix(rerender: (ui: React.ReactElement) => void, ui: () => React.ReactElement) {
  for (const midi of STANDARD_TUNING) {
    play(midi);
    rerender(ui());
    act(() => {
      vi.advanceTimersByTime(500);
    });
  }
}

describe('tuning all six strings reaches whoever is listening', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    play(null);
  });
  afterEach(() => vi.useRealTimers());

  it('from the Tuner section of the Learn tab', () => {
    const onTunedAll = vi.fn();
    const ui = () => (
      <Learn
        engine={fakeEngine()}
        progress={fakeProgressHandle()}
        place={{ ...START_PLACE, section: 'tuner' }}
        onPlaceChange={vi.fn()}
        onTunedAll={onTunedAll}
      />
    );
    const { rerender } = render(ui());
    expect(onTunedAll).not.toHaveBeenCalled();

    tuneAllSix(rerender, ui);

    expect(onTunedAll).toHaveBeenCalledTimes(1);
  });

  it('from the tuner step of a lesson', () => {
    const onTunedAll = vi.fn();
    const ui = () => (
      <LessonView
        lesson={lesson('tune', [{ kind: 'tuner' }])}
        engine={fakeEngine()}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onTunedAll={onTunedAll}
      />
    );
    const { rerender } = render(ui());
    expect(screen.getByTestId('step-tuner')).toBeInTheDocument();

    tuneAllSix(rerender, ui);

    expect(onTunedAll).toHaveBeenCalledTimes(1);
  });

  it('and a lesson can be finished without it, as before', () => {
    const onComplete = vi.fn();
    render(
      <LessonView
        lesson={lesson('tune', [{ kind: 'tuner' }])}
        engine={fakeEngine()}
        onClose={vi.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /finish|next|done/i }));

    expect(onComplete).toHaveBeenCalledWith('tune');
  });
});
