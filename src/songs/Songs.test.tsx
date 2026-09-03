import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';
import { SONGS } from '@/content';

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
      totalBeats: 16,
    })),
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

describe('Songs', () => {
  it('lists the whole catalogue with a difficulty on every row', () => {
    render(<Songs engine={fakeEngine()} />);
    const list = screen.getByTestId('song-list');

    expect(within(list).getAllByRole('listitem')).toHaveLength(SONGS.length);
    const firstRow = within(list).getAllByRole('listitem')[0]!;
    expect(within(firstRow).getByText(/easy|medium|hard/i)).toBeInTheDocument();
  });

  it('narrows the list as you type', async () => {
    render(<Songs engine={fakeEngine()} />);

    await userEvent.type(screen.getByTestId('song-search'), 'greensleeves');

    const rows = within(screen.getByTestId('song-list')).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Greensleeves');
  });

  it('filters by difficulty', async () => {
    render(<Songs engine={fakeEngine()} />);

    await userEvent.click(screen.getByTestId('filter-hard'));

    const list = screen.getByTestId('song-list');
    const hardCount = SONGS.filter((song) => song.difficulty === 'hard').length;
    expect(within(list).getAllByRole('listitem')).toHaveLength(hardCount);
  });

  it('says so when nothing matches instead of showing an empty list', async () => {
    render(<Songs engine={fakeEngine()} />);

    await userEvent.type(screen.getByTestId('song-search'), 'zzzz');

    expect(screen.getByTestId('song-list')).toHaveTextContent('Nothing matches that');
  });

  it('opens a chord-chart song into a playable chart', async () => {
    render(<Songs engine={fakeEngine()} />);

    await userEvent.click(screen.getByTestId('song-row-tom-dooley'));

    expect(screen.getByRole('heading', { name: 'Tom Dooley' })).toBeInTheDocument();
    expect(screen.getByTestId('chord-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-bar-0')).toHaveTextContent('G');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('opens a riff song into a tab staff rather than a chart', async () => {
    render(<Songs engine={fakeEngine()} />);

    await userEvent.click(screen.getByTestId('song-row-gallop-in-e'));

    expect(screen.queryByTestId('chord-chart')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Gallop in E' })).toBeInTheDocument();
  });

  it('goes back to the list, keeping the search that got you there', async () => {
    render(<Songs engine={fakeEngine()} />);

    await userEvent.type(screen.getByTestId('song-search'), 'dooley');
    await userEvent.click(screen.getByTestId('song-row-tom-dooley'));
    await userEvent.click(screen.getByTestId('song-back'));

    expect(screen.getByTestId('song-search')).toHaveValue('dooley');
  });

  it('opens straight into the song a shared link named', () => {
    render(<Songs engine={fakeEngine()} openSongId="greensleeves" />);

    expect(screen.getByRole('heading', { name: 'Greensleeves' })).toBeInTheDocument();
  });

  it('offers a share link from the player', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    render(<Songs engine={fakeEngine()} openSongId="tom-dooley" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(writeText).toHaveBeenCalledWith('https://guitar-rot.vercel.app/?p=song:tom-dooley');
    vi.unstubAllGlobals();
  });
});
