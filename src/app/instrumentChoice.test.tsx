import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, toneProfilesFor, type AudioEngine } from '@/audio';
import { emptyProgressState, withInstrument } from '@/progress';
import { InstrumentSwitch } from './InstrumentSwitch';
import { StartScreen } from './StartScreen';
import { fakeProgressHandle, returningState } from './testkit';
import { planStart, startLabel, type StartPlan } from './startPlan';
import { FIXTURE_COURSE } from '@/learn/testkit';

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => false } };
});

const { SettingsSheet } = await import('./SettingsSheet');

const first: StartPlan = { kind: 'first', lesson: FIXTURE_COURSE[0]! };

function fakeEngine(): AudioEngine {
  return {
    backend: 'sampled',
    unlocked: true,
    tone: getToneProfile('acoustic'),
    setTone: vi.fn(),
    init: vi.fn(() => Promise.resolve()),
    unlock: vi.fn(() => Promise.resolve()),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('the first-run question', () => {
  function ask(overrides: Partial<Parameters<typeof StartScreen>[0]> = {}) {
    const onPickInstrument = vi.fn();
    const onChoose = vi.fn();
    render(
      <StartScreen
        plan={first}
        loading={false}
        failed={false}
        chosen={null}
        sharedLink={false}
        onChoose={onChoose}
        needsInstrument
        onPickInstrument={onPickInstrument}
        {...overrides}
      />,
    );
    return { onPickInstrument, onChoose };
  }

  it('is "What do you play?", with the logo and the name still there', () => {
    ask();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('guitarRot');
    expect(screen.getByRole('heading', { level: 2, name: 'What do you play?' })).toBeInTheDocument();
  });

  it('offers two large choices, each a button naming the instrument and its strings, each with its own drawing', () => {
    ask();

    const guitar = screen.getByTestId('pick-guitar');
    const ukulele = screen.getByTestId('pick-ukulele');
    expect(guitar).toHaveTextContent('Guitar');
    expect(guitar).toHaveTextContent('Six strings');
    expect(ukulele).toHaveTextContent('Ukulele');
    expect(ukulele).toHaveTextContent('Four strings');
    // Drawn, not written: an svg of its own in each, and no emoji.
    expect(within(guitar).getByTestId('guitar-art').tagName.toLowerCase()).toBe('svg');
    expect(within(ukulele).getByTestId('ukulele-art').tagName.toLowerCase()).toBe('svg');
    expect(`${guitar.textContent}${ukulele.textContent}`).not.toMatch(/\p{Extended_Pictographic}/u);
    // The pictures are decoration; the button's text is its name.
    expect(within(guitar).getByTestId('guitar-art')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reports the instrument that was tapped', () => {
    const { onPickInstrument } = ask();

    fireEvent.click(screen.getByTestId('pick-ukulele'));
    fireEvent.click(screen.getByTestId('pick-guitar'));

    expect(onPickInstrument.mock.calls).toEqual([['ukulele'], ['guitar']]);
  });

  it('is two touch targets of a size a thumb can hit', () => {
    ask();
    for (const id of ['pick-guitar', 'pick-ukulele']) {
      expect(screen.getByTestId(id)).toHaveClass('flex', 'flex-col', 'rounded-3xl');
    }
  });

  it('puts no start buttons beside it: nothing starts until the question is answered', () => {
    ask();

    expect(screen.queryByTestId('start-learn')).toBeNull();
    expect(screen.queryByTestId('start-feed')).toBeNull();
  });

  it('is not shown when nothing asks for it, and the usual two buttons are', () => {
    ask({ needsInstrument: false });

    expect(screen.queryByTestId('pick-guitar')).toBeNull();
    expect(screen.getByTestId('start-learn')).toBeInTheDocument();
    expect(screen.getByTestId('start-feed')).toBeInTheDocument();
  });
});

describe('the start plan for an instrument with no lessons yet', () => {
  it('is an empty plan, which says what Learn has instead', () => {
    const plan = planStart(true, [], []);
    expect(plan).toEqual({ kind: 'empty' });
    expect(startLabel(plan)).toBe('Tune up and explore');
  });

  it('waits for progress to load before saying so', () => {
    expect(planStart(false, [], [])).toEqual({ kind: 'loading' });
  });
});

describe('InstrumentSwitch', () => {
  it('is a 44px round button drawn as the instrument now in use', () => {
    render(<InstrumentSwitch instrument="ukulele" onSwitch={vi.fn()} />);
    const button = screen.getByTestId('instrument-switch');

    expect(button).toHaveClass('h-11', 'w-11', 'rounded-full');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws a different picture for each instrument', () => {
    const { container, rerender } = render(<InstrumentSwitch instrument="guitar" onSwitch={vi.fn()} />);
    const guitar = container.querySelector('svg')?.innerHTML;
    rerender(<InstrumentSwitch instrument="ukulele" onSwitch={vi.fn()} />);
    expect(container.querySelector('svg')?.innerHTML).not.toBe(guitar);
  });

  it('is named for what is on and what a tap does', () => {
    const { rerender } = render(<InstrumentSwitch instrument="guitar" onSwitch={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Guitar. Switch to ukulele');

    rerender(<InstrumentSwitch instrument="ukulele" onSwitch={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Ukulele. Switch to guitar');
  });

  it('asks for the other instrument, once per tap', () => {
    const onSwitch = vi.fn();
    const { rerender } = render(<InstrumentSwitch instrument="guitar" onSwitch={onSwitch} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onSwitch).toHaveBeenLastCalledWith('ukulele');

    rerender(<InstrumentSwitch instrument="ukulele" onSwitch={onSwitch} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSwitch).toHaveBeenLastCalledWith('guitar');
    expect(onSwitch).toHaveBeenCalledTimes(2);
  });
});

describe('Settings: Instrument', () => {
  let engine: AudioEngine;
  beforeEach(() => {
    engine = fakeEngine();
  });

  function open(state = returningState(), onInstrumentChange?: (id: 'guitar' | 'ukulele') => void) {
    const progress = fakeProgressHandle({ state });
    render(
      <SettingsSheet open onClose={vi.fn()} engine={engine} progress={progress} onInstrumentChange={onInstrumentChange} />,
    );
    return progress;
  }

  it('is a radio group at the top, above the tone, with the instrument in use checked', () => {
    open();

    const group = screen.getByRole('radiogroup', { name: 'Instrument' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('data-testid'))).toEqual(['instrument-guitar', 'instrument-ukulele']);
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false']);

    const groups = screen.getAllByRole('radiogroup');
    expect(groups[0]).toBe(group);
  });

  it('says how many strings each has and what they are called', () => {
    open();

    expect(screen.getByTestId('instrument-guitar')).toHaveTextContent('Six strings: E A D G B e');
    expect(screen.getByTestId('instrument-ukulele')).toHaveTextContent('Four strings: G C E A');
  });

  it('marks the ukulele when it is the one in use, and is one Tab stop', () => {
    open({ ...returningState(), settings: withInstrument(returningState().settings, 'ukulele') });

    expect(screen.getByTestId('instrument-ukulele')).toHaveAttribute('aria-checked', 'true');
    const group = within(screen.getByRole('radiogroup', { name: 'Instrument' }));
    expect(group.getAllByRole('radio').filter((radio) => radio.tabIndex === 0)).toEqual([
      screen.getByTestId('instrument-ukulele'),
    ]);
  });

  it('switches through the shell\'s handler when given one, stops the sound, and plays the new instrument\'s first chord', async () => {
    const onInstrumentChange = vi.fn();
    const progress = open(returningState(), onInstrumentChange);

    await userEvent.click(screen.getByTestId('instrument-ukulele'));

    expect(onInstrumentChange).toHaveBeenCalledWith('ukulele');
    expect(progress.setInstrument).not.toHaveBeenCalled();
    expect(engine.stopAll).toHaveBeenCalled();
    // The tone it will sound in is set before the chord is played.
    expect(engine.setTone).toHaveBeenCalledWith(getToneProfile('ukulele'));
    expect(engine.strum).toHaveBeenCalledTimes(1);
    // An open C: G4 C4 E4 C5, on the ukulele's four strings, in string order.
    expect(engine.strum).toHaveBeenCalledWith([67, 60, 64, 72], { strings: [0, 1, 2, 3] });
  });

  it('changes the setting itself when no handler is given', async () => {
    const progress = open();

    await userEvent.click(screen.getByTestId('instrument-ukulele'));

    expect(progress.setInstrument).toHaveBeenCalledWith('ukulele');
  });

  it('does nothing when the instrument already in use is tapped', async () => {
    const progress = open();

    await userEvent.click(screen.getByTestId('instrument-guitar'));

    expect(progress.setInstrument).not.toHaveBeenCalled();
    expect(engine.strum).not.toHaveBeenCalled();
  });

  it('moves with the arrow keys like the tone list, choosing and hearing the next instrument', async () => {
    const onInstrumentChange = vi.fn();
    open(returningState(), onInstrumentChange);

    screen.getByTestId('instrument-guitar').focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(onInstrumentChange).toHaveBeenCalledWith('ukulele');
    expect(document.activeElement).toBe(screen.getByTestId('instrument-ukulele'));
  });
});

describe('Settings: the tone list follows the instrument', () => {
  function open(instrument: 'guitar' | 'ukulele') {
    const state = returningState();
    const progress = fakeProgressHandle({
      state: { ...state, settings: withInstrument(state.settings, instrument) },
    });
    const engine = fakeEngine();
    render(<SettingsSheet open onClose={vi.fn()} engine={engine} progress={progress} />);
    return Object.assign(progress, { engine });
  }

  it('lists the guitar\'s tones for the guitar, headed for it', () => {
    open('guitar');

    const tones = screen.getByRole('radiogroup', { name: 'Guitar tone' });
    expect(within(tones).getAllByRole('radio').map((radio) => radio.getAttribute('data-testid'))).toEqual(
      toneProfilesFor('guitar').map((profile) => `tone-${profile.id}`),
    );
  });

  it('lists the ukulele\'s tones for the ukulele, headed for it, and none of the guitar\'s electric ones', () => {
    open('ukulele');

    const tones = screen.getByRole('radiogroup', { name: 'Ukulele tone' });
    const ids = within(tones).getAllByRole('radio').map((radio) => radio.getAttribute('data-testid'));
    expect(ids).toEqual(toneProfilesFor('ukulele').map((profile) => `tone-${profile.id}`));
    for (const electric of ['tone-rock', 'tone-blues', 'tone-country', 'tone-clean', 'tone-acoustic']) {
      expect(ids).not.toContain(electric);
    }
  });

  it('shows the tone in use as checked, and one Tab stop, on the ukulele', () => {
    open('ukulele');

    const tones = within(screen.getByRole('radiogroup', { name: 'Ukulele tone' }));
    const radios = tones.getAllByRole('radio');
    expect(radios.filter((radio) => radio.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(radios.filter((radio) => radio.tabIndex === 0)).toHaveLength(1);
  });

  it('auditions a ukulele tone with a ukulele chord, not an open E', async () => {
    const progress = open('ukulele');
    const [tone] = toneProfilesFor('ukulele');
    if (tone === undefined) throw new Error('no ukulele tone');

    await userEvent.click(screen.getByTestId(`tone-${tone.id}`));

    expect(progress.updateSettings).toHaveBeenCalledWith({ toneId: tone.id });
    expect(progress.engine.strum).toHaveBeenCalledWith([67, 60, 64, 72], { strings: [0, 1, 2, 3] });
  });
});

describe('a fresh install', () => {
  it('is asked, and a saved one is not (the state each is in)', () => {
    expect(emptyProgressState().settings.instrumentChosen).toBe(false);
    expect(returningState().settings.instrumentChosen).toBe(true);
  });
});
