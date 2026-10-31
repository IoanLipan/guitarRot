import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MicPitchHandle } from '@/app/useMicPitch';
import type { ProgressHandle } from '@/app/useProgress';
import { COURSE, chordsFor, type LessonStep } from '@/content';
import { InstrumentProvider } from '@/instrument';
import { emptyProgressState } from '@/progress';
import { UKULELE, noteName, type InstrumentId } from '@/music';
import { START_PLACE, type LearnPlace } from './learnPlace';
import { fakeEngine } from './testkit';

vi.mock('@/app/useMicPitch', () => ({
  useMicPitch: (): MicPitchHandle => ({
    status: 'idle',
    reading: null,
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  }),
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

const { Learn } = await import('./Learn');
const { Explore } = await import('./Explore');
const { ChordStep } = await import('./steps/ChordStep');
const { DrillStep } = await import('./steps/DrillStep');
const { FretboardStep } = await import('./steps/FretboardStep');
const { VisualView } = await import('./steps/VisualView');

const on = (id: InstrumentId, ui: React.ReactElement) => <InstrumentProvider id={id}>{ui}</InstrumentProvider>;

function LearnHarness({ instrument }: { instrument: InstrumentId }) {
  const [place, setPlace] = useState<LearnPlace>(START_PLACE);
  const progress: Pick<ProgressHandle, 'state' | 'completeLesson'> = {
    state: emptyProgressState(),
    completeLesson: vi.fn(),
  };
  return on(
    instrument,
    <Learn engine={fakeEngine()} progress={progress} place={place} onPlaceChange={setPlace} />,
  );
}

describe('Learn on the ukulele', () => {
  it('says plainly that its course is not written yet, and what works meanwhile, instead of a blank list', () => {
    render(<LearnHarness instrument="ukulele" />);

    expect(screen.getByTestId('course-empty')).toHaveTextContent(
      'The ukulele lessons are on their way. The tuner and the chord explorer work in the meantime.',
    );
    expect(screen.queryByTestId('course-continue')).toBeNull();
  });

  it('still has the tuner and the explorer', () => {
    render(<LearnHarness instrument="ukulele" />);

    fireEvent.click(screen.getByTestId('learn-tab-tuner'));
    expect(screen.getByTestId('hear-string-3')).toBeInTheDocument();
    expect(screen.queryByTestId('hear-string-4')).toBeNull();
  });

  it('is the guitar course when the guitar is the instrument', () => {
    render(<LearnHarness instrument="guitar" />);

    expect(screen.queryByTestId('course-empty')).toBeNull();
    expect(screen.getByTestId('course-continue')).toBeInTheDocument();
    expect(screen.getByTestId('course-progress')).toHaveTextContent(`0 of ${COURSE.length} lessons`);
  });

  it('puts the quick switch beside the section tabs, when given one', () => {
    const progress = { state: emptyProgressState(), completeLesson: vi.fn() };
    render(
      <Learn
        engine={fakeEngine()}
        progress={progress}
        place={START_PLACE}
        onPlaceChange={vi.fn()}
        instrumentSwitch={<button type="button" data-testid="the-switch" />}
      />,
    );

    const tabs = screen.getByRole('tablist', { name: 'Learn sections' });
    expect(tabs.nextElementSibling).toBe(screen.getByTestId('the-switch'));
  });
});

describe('Explore on the ukulele', () => {
  const tiles = () => screen.getAllByTestId(/^chord-tile-/);

  it('is its own chord library: every ukulele shape, none of the guitar\'s', () => {
    render(on('ukulele', <Explore engine={fakeEngine()} />));

    const library = chordsFor('ukulele');
    expect(tiles().map((tile) => tile.getAttribute('data-testid'))).toEqual(
      library.map((chord) => `chord-tile-${chord.id}`),
    );
    expect(screen.getByText(`${library.length} shapes`)).toBeInTheDocument();
  });

  it('strums a chord with the ukulele\'s voicing, on its four strings', () => {
    const engine = fakeEngine();
    render(on('ukulele', <Explore engine={engine} />));

    fireEvent.click(screen.getByTestId('chord-tile-uke-Am'));

    // A minor, 2000: A4 C4 E4 A4.
    expect(engine.strum).toHaveBeenCalledWith([69, 60, 64, 69], { strings: [0, 1, 2, 3] });
    expect(screen.getByTestId('chord-caption')).toHaveTextContent('Am');
    expect(screen.getByTestId('chord-caption')).toHaveTextContent('A (La) · C (Do) · E (Mi)');
  });

  it('draws the explorer as a four-string neck and names what is tapped by the ukulele\'s tuning', () => {
    const engine = fakeEngine();
    render(on('ukulele', <Explore engine={engine} />));
    const board = screen.getByRole('group', { name: 'Fretboard explorer' });

    expect(within(board).getAllByTestId(/^string-\d$/)).toHaveLength(4);
    fireEvent.click(within(board).getByTestId('cell-s0f2'));

    // The fourth string, second fret: G4 + 2 = A4.
    expect(engine.playNote).toHaveBeenCalledWith(69, { stringIndex: 0 });
    expect(screen.getByTestId('tapped-note')).toHaveTextContent('A (La)');
    expect(screen.getByText(/string 4/)).toBeInTheDocument();
  });

  it('shows a scale shape that fits four strings: the C major pentatonic, every dot one of C D E G A', () => {
    render(on('ukulele', <Explore engine={fakeEngine()} />));

    expect(screen.getByText(/C \(Do\) major pentatonic, first position/)).toBeInTheDocument();
    const board = screen.getByRole('img', { name: 'C major pentatonic, first position' });
    const letters = [...board.querySelectorAll('[data-testid^="marker-"]')].map((marker) => {
      const match = /^marker-s(\d)f(\d+)$/.exec(marker.getAttribute('data-testid') ?? '');
      return noteName((UKULELE.tuning[Number(match?.[1])] ?? 0) + Number(match?.[2]));
    });
    expect([...new Set(letters)].sort()).toEqual(['A', 'C', 'D', 'E', 'G']);
    expect(within(board as unknown as HTMLElement).getAllByTestId(/^string-\d$/)).toHaveLength(4);
  });

  it('is exactly the old explorer for the guitar', () => {
    render(<Explore engine={fakeEngine()} />);

    expect(screen.getByText('E (Mi) minor pentatonic, box 1', { exact: false })).toBeInTheDocument();
    expect(tiles()).toHaveLength(chordsFor('guitar').length);
    expect(within(screen.getByRole('group', { name: 'Fretboard explorer' })).getAllByTestId(/^string-\d$/)).toHaveLength(6);
  });
});

describe('lesson steps on the ukulele', () => {
  it('a chord step shows the ukulele shape, its tones, and strums four strings', () => {
    const engine = fakeEngine();
    const step: Extract<LessonStep, { kind: 'chord' }> = { kind: 'chord', chordId: 'uke-G7' };
    render(on('ukulele', <ChordStep step={step} engine={engine} />));

    expect(screen.getByRole('heading', { name: 'G7' })).toBeInTheDocument();
    expect(within(screen.getByTestId('chord-tones')).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Strum all four strings.')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^string-\d$/)).toHaveLength(4);

    fireEvent.click(screen.getByTestId('chord-strum'));
    // 0212: G4 D4 F4 B4.
    expect(engine.strum).toHaveBeenCalledWith([67, 62, 65, 71], { strings: [0, 1, 2, 3] });
  });

  it('a chord step is still "all six strings" for a six-string chord', () => {
    const step: Extract<LessonStep, { kind: 'chord' }> = { kind: 'chord', chordId: 'E-open' };
    render(<ChordStep step={step} engine={fakeEngine()} />);
    expect(screen.getByText('Strum all six strings.')).toBeInTheDocument();
  });

  it('a chord step for a chord that exists only for the other instrument is a missing step, not a broken screen', () => {
    const step: Extract<LessonStep, { kind: 'chord' }> = { kind: 'chord', chordId: 'uke-nope' };
    render(on('ukulele', <ChordStep step={step} engine={fakeEngine()} />));
    expect(screen.getByText(/uke-nope/)).toBeInTheDocument();
  });

  it('a fretboard step names its notes by the ukulele\'s tuning and its strings from the top', () => {
    const step: Extract<LessonStep, { kind: 'fretboard' }> = {
      kind: 'fretboard',
      caption: 'The open strings.',
      fretRange: [0, 3],
      positions: [
        { stringIndex: 0, fret: 0 },
        { stringIndex: 3, fret: 0 },
      ],
    };
    render(on('ukulele', <FretboardStep step={step} engine={fakeEngine()} />));

    const notes = within(screen.getByTestId('neck-notes')).getAllByRole('listitem');
    expect(notes[0]).toHaveTextContent('G (Sol)');
    expect(notes[0]).toHaveTextContent('string 4, open');
    expect(notes[1]).toHaveTextContent('A (La)');
    expect(notes[1]).toHaveTextContent('string 1, open');
  });

  it('a drill asks about the ukulele\'s strings and names every note right', () => {
    const step: Extract<LessonStep, { kind: 'drill' }> = { kind: 'drill', strings: [0, 1, 2, 3], fretRange: [0, 5], count: 3 };
    const engine = fakeEngine();
    render(on('ukulele', <DrillStep step={step} engine={engine} onDone={vi.fn()} />));

    const marker = document.querySelector('[data-testid^="marker-"]');
    const match = /^marker-s(\d)f(\d+)$/.exec(marker?.getAttribute('data-testid') ?? '');
    const stringIndex = Number(match?.[1]);
    const fret = Number(match?.[2]);
    expect(stringIndex).toBeLessThan(4);
    expect(screen.getAllByTestId(/^string-\d$/)).toHaveLength(4);

    const answer = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][
      ((UKULELE.tuning[stringIndex] ?? 0) + fret) % 12
    ];
    const buttons = screen.getAllByRole('button').filter((button) => /\(/.test(button.textContent ?? ''));
    expect(buttons.some((button) => button.textContent?.startsWith(`${answer} (`))).toBe(true);
  });

  it('a notes row on the ukulele starts above middle C, where its lowest string is', () => {
    const engine = fakeEngine();
    render(on('ukulele', <VisualView visual={{ kind: 'notes', notes: ['A', 'B', 'C'] }} engine={engine} />));

    fireEvent.click(screen.getByTestId('note-bubble-0'));
    expect(engine.playNote).toHaveBeenCalledWith(69);
  });

  it('a neck picture is the ukulele\'s: four strings, described in its own words', () => {
    render(
      on(
        'ukulele',
        <VisualView
          visual={{ kind: 'neck', fretRange: [0, 3], dots: [{ stringIndex: 3, fret: 3 }], tapToHear: true }}
          engine={fakeEngine()}
        />,
      ),
    );

    expect(screen.getByRole('group', { name: /^Ukulele neck, frets 0 to 3\. C \(Do\) on string 1, fret 3/ })).toBeInTheDocument();
  });

  it('a chords picture draws a ukulele chord as four strings', () => {
    render(on('ukulele', <VisualView visual={{ kind: 'chords', chordIds: ['uke-C', 'uke-Am'] }} engine={fakeEngine()} />));

    expect(screen.getByTestId('chord-tile-uke-C')).toBeInTheDocument();
    for (const tile of screen.getAllByTestId(/^chord-tile-/)) {
      expect(within(tile).getAllByTestId(/^string-\d$/)).toHaveLength(4);
    }
  });
});
