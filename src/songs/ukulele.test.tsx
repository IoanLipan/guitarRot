import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { SONGS, getSong, songsFor } from '@/content';
import { InstrumentProvider } from '@/instrument';
import type { InstrumentId } from '@/music';

const created = vi.hoisted(() => ({ riffs: [] as { instrument?: string; events: { stringIndex: number }[] }[] }));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn((riff: (typeof created.riffs)[number]) => {
      created.riffs.push(riff);
      return {
        start: vi.fn(),
        stop: vi.fn(),
        dispose: vi.fn(),
        setSpeed: vi.fn(),
        progress: vi.fn(() => 0),
        currentBeat: vi.fn(() => 0),
        isPlaying: vi.fn(() => true),
        setLoopRange: vi.fn(),
        totalBeats: 16,
      };
    }),
    createMetronome: vi.fn(() => ({
      sync: vi.fn(),
      setOn: vi.fn(),
      playCountIn: vi.fn(() => Promise.resolve()),
      dispose: vi.fn(),
    })),
  };
});

const { Songs } = await import('./Songs');

function engine(): AudioEngine {
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

function Harness({ instrument, initial = null }: { instrument: InstrumentId; initial?: string | null }) {
  const [openSongId, setOpenSongId] = useState<string | null>(initial);
  return (
    <InstrumentProvider id={instrument}>
      <Songs engine={engine()} openSongId={openSongId} onOpenSongChange={setOpenSongId} />
    </InstrumentProvider>
  );
}

const rowIds = () =>
  screen
    .getAllByTestId(/^song-row-/)
    .map((row) => row.getAttribute('data-testid')?.replace('song-row-', ''))
    .sort();

describe('the song list', () => {
  it('lists every song on the guitar, as it always did', () => {
    render(<Harness instrument="guitar" />);
    expect(rowIds()).toEqual(SONGS.map((song) => song.id).sort());
  });

  it('lists only the songs the ukulele can play: strummed charts whose every chord it has, and its own editions of the tunes', () => {
    render(<Harness instrument="ukulele" />);

    const expected = songsFor('ukulele').map((song) => song.id);
    expect(expected.length).toBeGreaterThan(0);
    expect(rowIds()).toEqual([...expected].sort());
    expect(rowIds().length).toBeLessThan(SONGS.length);
    // Every strummed chart song is here, and so is every riff song the ukulele has an edition of: none of the guitar's tabs.
    const charts = SONGS.filter((song) => song.chart !== undefined).map((song) => song.id);
    for (const id of charts) expect(rowIds(), id).toContain(id);
    for (const id of rowIds()) {
      const song = getSong(id ?? '');
      if (song?.riff !== undefined) expect(song.instrument, id).toBe('ukulele');
    }
  });

  it('searches within what the ukulele can play, not the whole catalogue', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Harness instrument="ukulele" />);

    // The guitar\'s tab of the tune is not here; the ukulele\'s own edition is.
    await userEvent.type(screen.getByTestId('song-search'), 'ode to joy');
    expect(screen.queryByTestId('song-row-ode-to-joy')).toBeNull();
    expect(screen.getByTestId('song-row-uke-ode-to-joy')).toBeInTheDocument();
  });

  it('finds nothing for a guitar-only tune, such as a thrash-metal gallop', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Harness instrument="ukulele" />);

    await userEvent.type(screen.getByTestId('song-search'), 'gallop');
    expect(screen.queryByTestId('song-row-gallop-in-e')).toBeNull();
    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it('finds the same song on the guitar', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Harness instrument="guitar" />);

    await userEvent.type(screen.getByTestId('song-search'), 'ode to joy');
    expect(screen.getByTestId('song-row-ode-to-joy')).toBeInTheDocument();
  });
});

describe('a chart song on the ukulele', () => {
  it('is drawn and played with the ukulele\'s shapes: a four-line tab, G C E A, four strings in the riff', () => {
    created.riffs.length = 0;
    render(<Harness instrument="ukulele" initial="scarborough-fair" />);

    const riff = created.riffs.at(-1);
    expect(riff?.instrument).toBe('ukulele');
    expect(Math.max(...(riff?.events.map((event) => event.stringIndex) ?? [0]))).toBeLessThan(4);
  });

  it('is the same song on the guitar, with the guitar\'s six strings and no instrument named', () => {
    created.riffs.length = 0;
    render(<Harness instrument="guitar" initial="scarborough-fair" />);

    const riff = created.riffs.at(-1);
    expect(riff).not.toHaveProperty('instrument');
    expect(Math.max(...(riff?.events.map((event) => event.stringIndex) ?? [0]))).toBeGreaterThan(3);
  });

  it('shows the chord of the playing bar as a ukulele diagram: four strings', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Harness instrument="ukulele" initial="scarborough-fair" />);

    // Open the tab view to see its four lines and their names.
    await userEvent.click(screen.getByTestId('view-tab'));
    expect(screen.getAllByTestId(/^staff-line-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/^string-label-/).map((label) => label.textContent)).toEqual(['G', 'C', 'E', 'A']);
  });

  it('draws the fretboard view as a four-string neck', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Harness instrument="ukulele" initial="scarborough-fair" />);

    await userEvent.click(screen.getByTestId('view-fretboard'));
    const view = within(screen.getByTestId('fretboard-view'));
    expect(view.getByRole('group', { name: /^Ukulele neck for bar/ })).toBeInTheDocument();
    expect(view.getAllByTestId(/^string-\d$/)).toHaveLength(4);
  });
});

describe('a song the other instrument cannot play', () => {
  it('is not opened: the browser stands in for it, so no player is made for a tab that has no ukulele fingering', () => {
    created.riffs.length = 0;
    render(<Harness instrument="ukulele" initial="ode-to-joy" />);

    expect(created.riffs).toHaveLength(0);
    expect(screen.getByTestId('song-list')).toBeInTheDocument();
  });
});
