import { StrictMode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';
import { SONGS } from '@/content';

const players: {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}[] = [];
const metronomes: {
  sync: ReturnType<typeof vi.fn>;
  setOn: ReturnType<typeof vi.fn>;
  playCountIn: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}[] = [];
/** What the next players' start() answers; undefined is a mock that says nothing, which counts as started. */
const startAnswers = vi.hoisted(() => ({ next: undefined as boolean | undefined }));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => {
      const player = {
        start: vi.fn(() => startAnswers.next),
        stop: vi.fn(),
        dispose: vi.fn(),
        setSpeed: vi.fn(),
        progress: vi.fn(() => 0),
        currentBeat: vi.fn(() => 0),
        setLoopRange: vi.fn(),
        totalBeats: 16,
      };
      players.push(player);
      return player;
    }),
    createMetronome: vi.fn(() => {
      const metronome = {
        sync: vi.fn(),
        setOn: vi.fn(),
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

beforeEach(() => {
  players.length = 0;
  metronomes.length = 0;
  startAnswers.next = undefined;
});

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
    render(<SongsHarness initial="tom-dooley" />);

    // Autoplay starts the song immediately; pause it before testing the
    // count-in, or there is nothing to press Play on.
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await userEvent.click(screen.getByTestId('metronome-toggle'));
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    const metronome = metronomes[0]!;
    const player = players[0]!;
    expect(metronome.setOn).toHaveBeenLastCalledWith(true);
    expect(metronome.playCountIn).toHaveBeenCalledTimes(1);
    // The count-in finishes before the song comes back in.
    expect(metronome.playCountIn.mock.invocationCallOrder[0]).toBeLessThan(player.start.mock.invocationCallOrder[1]!);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('puts the click back on the transport right after every start, or play after pause is silent', async () => {
    render(<SongsHarness initial="tom-dooley" />);
    const player = players[0]!;
    const metronome = metronomes[0]!;

    // Opening the song starts it, and puts the click on the transport with it.
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(metronome.sync).toHaveBeenCalledTimes(1);
    expect(player.start.mock.invocationCallOrder[0]).toBeLessThan(metronome.sync.mock.invocationCallOrder[0]!);

    // Pause, then Play with the click on: start() wipes the transport again.
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await userEvent.click(screen.getByTestId('metronome-toggle'));
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(player.start).toHaveBeenCalledTimes(2);
    expect(metronome.sync).toHaveBeenCalledTimes(2);
    expect(player.start.mock.invocationCallOrder[1]).toBeLessThan(metronome.sync.mock.invocationCallOrder[1]!);
  });

  it('puts the click back after a start with the metronome off too, so it can be turned on later', async () => {
    render(<SongsHarness initial="tom-dooley" />);
    const player = players[0]!;
    const metronome = metronomes[0]!;

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(metronome.playCountIn).not.toHaveBeenCalled();
    expect(player.start).toHaveBeenCalledTimes(2);
    expect(metronome.sync).toHaveBeenCalledTimes(2);
  });

  it('switches the click on mid-playback without a count-in, and without touching the riff', async () => {
    render(<SongsHarness initial="tom-dooley" />);
    const player = players[0]!;
    const metronome = metronomes[0]!;

    await userEvent.click(screen.getByTestId('metronome-toggle'));

    expect(metronome.playCountIn).not.toHaveBeenCalled();
    expect(metronome.setOn).toHaveBeenLastCalledWith(true);
    // The riff plays on: not restarted, not stopped, still showing Pause.
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.stop).not.toHaveBeenCalled();
    expect(metronome.sync).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('switches the click off again without touching the riff', async () => {
    render(<SongsHarness initial="tom-dooley" />);
    const player = players[0]!;
    const metronome = metronomes[0]!;

    await userEvent.click(screen.getByTestId('metronome-toggle'));
    await userEvent.click(screen.getByTestId('metronome-toggle'));

    expect(metronome.setOn.mock.calls).toEqual([[true], [false]]);
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.stop).not.toHaveBeenCalled();
    expect(screen.getByTestId('metronome-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  it('turns the click on or off once per tap, even where React runs state updaters twice', async () => {
    render(
      <StrictMode>
        <SongsHarness initial="tom-dooley" />
      </StrictMode>,
    );
    // StrictMode mounts the player twice; the live one is the last made.
    const metronome = metronomes.at(-1)!;

    await userEvent.click(screen.getByTestId('metronome-toggle'));

    expect(metronome.setOn).toHaveBeenCalledTimes(1);
    expect(metronome.setOn).toHaveBeenCalledWith(true);
  });

  it('does not claim to play when the player could not start', async () => {
    startAnswers.next = false;
    render(<SongsHarness initial="tom-dooley" />);

    // Opening it asked the player to start; it said no.
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(players[0]!.start).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
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
