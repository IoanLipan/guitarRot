import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';
import { SONGS } from '@/content';

const metronomes: {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  playCountIn: ReturnType<typeof vi.fn>;
}[] = [];

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      setSpeed: vi.fn(),
      progress: vi.fn(() => 0),
      currentBeat: vi.fn(() => 0),
      setLoopRange: vi.fn(),
      totalBeats: 16,
    })),
    createMetronome: vi.fn(() => {
      const metronome = {
        start: vi.fn(),
        stop: vi.fn(),
        playCountIn: vi.fn(() => Promise.resolve()),
        dispose: vi.fn(),
      };
      metronomes.push(metronome);
      return metronome;
    }),
  };
});

const { Songs } = await import('./Songs');

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

/** Holds the open song the way the app shell does, so the tests can drive Songs by clicking. */
function SongsHarness({ initial = null }: { initial?: string | null }) {
  const [openSongId, setOpenSongId] = useState<string | null>(initial);
  return <Songs engine={fakeEngine()} openSongId={openSongId} onOpenSongChange={setOpenSongId} />;
}

describe('Songs', () => {
  it('lists the whole catalogue with a difficulty on every row', () => {
    render(<SongsHarness />);
    const list = screen.getByTestId('song-list');

    expect(within(list).getAllByRole('listitem')).toHaveLength(SONGS.length);
    const firstRow = within(list).getAllByRole('listitem')[0]!;
    expect(within(firstRow).getByText(/easy|medium|hard/i)).toBeInTheDocument();
  });

  it('narrows the list as you type', async () => {
    render(<SongsHarness />);

    await userEvent.type(screen.getByTestId('song-search'), 'greensleeves');

    const rows = within(screen.getByTestId('song-list')).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Greensleeves');
  });

  it('filters by difficulty', async () => {
    render(<SongsHarness />);

    await userEvent.click(screen.getByTestId('filter-hard'));

    const list = screen.getByTestId('song-list');
    const hardCount = SONGS.filter((song) => song.difficulty === 'hard').length;
    expect(within(list).getAllByRole('listitem')).toHaveLength(hardCount);
  });

  it('says so when nothing matches instead of showing an empty list', async () => {
    render(<SongsHarness />);

    await userEvent.type(screen.getByTestId('song-search'), 'zzzz');

    expect(screen.getByTestId('song-list')).toHaveTextContent('Nothing matches that');
  });

  it('opens a chord-chart song into a playable chart', async () => {
    render(<SongsHarness />);

    await userEvent.click(screen.getByTestId('song-row-tom-dooley'));

    expect(screen.getByRole('heading', { name: 'Tom Dooley' })).toBeInTheDocument();
    expect(screen.getByTestId('chord-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-bar-0')).toHaveTextContent('G');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('shows the key with its solfège, minor keys included', async () => {
    render(<SongsHarness />);

    await userEvent.click(screen.getByTestId('song-row-tom-dooley'));
    expect(screen.getByText('Key G (Sol)')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('song-back'));
    await userEvent.click(screen.getByTestId('song-row-greensleeves'));
    expect(screen.getByText('Key Am (La minor)')).toBeInTheDocument();
  });

  it('opens a riff song into a tab staff rather than a chart', async () => {
    render(<SongsHarness />);

    await userEvent.click(screen.getByTestId('song-row-gallop-in-e'));

    expect(screen.queryByTestId('chord-chart')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Gallop in E' })).toBeInTheDocument();
  });

  it('goes back to the list, keeping the search that got you there', async () => {
    render(<SongsHarness />);

    await userEvent.type(screen.getByTestId('song-search'), 'dooley');
    await userEvent.click(screen.getByTestId('song-row-tom-dooley'));
    await userEvent.click(screen.getByTestId('song-back'));

    expect(screen.getByTestId('song-search')).toHaveValue('dooley');
  });

  it('opens straight into the song a shared link named', () => {
    render(<SongsHarness initial="greensleeves" />);

    expect(screen.getByRole('heading', { name: 'Greensleeves' })).toBeInTheDocument();
  });

  it('offers a share link from the player', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    render(<SongsHarness initial="tom-dooley" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(writeText).toHaveBeenCalledWith('https://guitar-rot.vercel.app/?p=song:tom-dooley');
    vi.unstubAllGlobals();
  });

  it('plays a count-in before starting once the metronome is on', async () => {
    metronomes.length = 0;
    render(<SongsHarness initial="tom-dooley" />);

    // Autoplay starts the song immediately; pause it before testing the
    // count-in, or there is nothing to press Play on.
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await userEvent.click(screen.getByTestId('metronome-toggle'));
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    const metronome = metronomes[0]!;
    expect(metronome.playCountIn).toHaveBeenCalledTimes(1);
    expect(metronome.start).toHaveBeenCalledTimes(1);
  });

  it('starts the click immediately when turned on mid-playback, no count-in', async () => {
    metronomes.length = 0;
    render(<SongsHarness initial="tom-dooley" />);

    await userEvent.click(screen.getByTestId('metronome-toggle'));

    const metronome = metronomes[0]!;
    expect(metronome.playCountIn).not.toHaveBeenCalled();
    expect(metronome.start).toHaveBeenCalledTimes(1);
  });

  it('loops a tapped bar, and clears it on a second tap of the same bar', async () => {
    render(<SongsHarness initial="tom-dooley" />);

    await userEvent.click(screen.getByTestId('chart-bar-1'));
    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 2–2');
    expect(screen.getByTestId('chart-bar-1')).toHaveAttribute('data-looped', 'true');

    await userEvent.click(screen.getByTestId('chart-bar-1'));
    expect(screen.queryByTestId('loop-range-label')).toBeNull();
  });

  it('stretches the loop to a second, different bar', async () => {
    render(<SongsHarness initial="tom-dooley" />);

    await userEvent.click(screen.getByTestId('chart-bar-1'));
    await userEvent.click(screen.getByTestId('chart-bar-3'));

    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 2–4');
    expect(screen.getByTestId('chart-bar-2')).toHaveAttribute('data-looped', 'true');
  });

  it('clears the loop from its own button', async () => {
    render(<SongsHarness initial="tom-dooley" />);

    await userEvent.click(screen.getByTestId('chart-bar-0'));
    await userEvent.click(screen.getByTestId('loop-clear'));

    expect(screen.queryByTestId('loop-range-label')).toBeNull();
  });
});
