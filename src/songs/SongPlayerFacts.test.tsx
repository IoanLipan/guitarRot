import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';

/** A player whose `currentBeat()` is whatever `playback.beat` says, so a test can put the song at any bar. */
const playback = vi.hoisted(() => ({ beat: 0 }));

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
      currentBeat: vi.fn(() => playback.beat),
      isPlaying: vi.fn(() => true),
      setLoopRange: vi.fn(),
      totalBeats: 16,
    })),
    createMetronome: vi.fn(() => ({
      sync: vi.fn(),
      setOn: vi.fn(),
      playCountIn: vi.fn(() => Promise.resolve()),
      dispose: vi.fn(),
    })),
  };
});

const { Songs } = await import('./Songs');

function makeEngine(): AudioEngine {
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

function Harness({ songId }: { songId: string }) {
  const [openSongId, setOpenSongId] = useState<string | null>(songId);
  return <Songs engine={makeEngine()} openSongId={openSongId} onOpenSongChange={setOpenSongId} />;
}

function open(songId: string) {
  return render(<Harness songId={songId} />);
}

beforeEach(() => {
  playback.beat = 0;
});

describe('the song screen: plain facts, sentence case, flat', () => {
  it('reads its facts as one line: difficulty, style, key, tempo', () => {
    open('scarborough-fair');
    const key = screen.getByText('Key Am (La minor)');
    const facts = key.closest('p') as HTMLElement;
    expect(facts).toHaveTextContent('Medium · English folk · Key Am (La minor) · 96 bpm');
    expect(facts.className).not.toMatch(/uppercase|tracking/);
    // Each fact is kept whole when the line has to wrap: "Key Am (La minor)" is never cut mid-word.
    expect(key.className).toContain('whitespace-nowrap');
  });

  it('shows the difficulty as a coloured dot and the word in sentence case', () => {
    open('scarborough-fair');
    const difficulty = screen.getByTestId('difficulty-medium');
    expect(difficulty).toHaveTextContent('Medium');
    expect(difficulty.className).not.toMatch(/uppercase|tracking/);
    expect(difficulty.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('keeps the view buttons in sentence case with no tracking, so "Fretboard" fits a 320px phone', () => {
    open('scarborough-fair');
    for (const view of ['chart', 'tab', 'fretboard']) {
      const button = screen.getByTestId(`view-${view}`);
      expect(button.className).not.toMatch(/uppercase|tracking/);
      expect(button.className).toContain('text-meta');
    }
    expect(screen.getByTestId('view-fretboard')).toHaveTextContent('Fretboard');
    // The track spans the row, so its three buttons share it instead of growing past the screen.
    expect(screen.getByTestId('view-toggle').className).toContain('w-full');
    expect(screen.getByTestId('view-toggle').className).not.toContain('self-start');
  });

  it('has no amber glow on the play button and no gradient behind the screen', () => {
    const { container } = open('scarborough-fair');
    const play = screen.getByRole('button', { name: /Pause|Play/ });
    expect(play.className).toContain('bg-accent');
    expect(play.className).not.toContain('shadow');
    expect(container.innerHTML).not.toContain('bg-linear');
    expect(container.innerHTML).not.toMatch(/rgba\(255,\s*176,\s*32/);
  });

  it('labels the speed slider in sentence case', () => {
    open('scarborough-fair');
    const row = screen.getByText('Speed').parentElement as HTMLElement;
    expect(row.className).toContain('label');
    expect(row.className).not.toMatch(/uppercase|tracking/);
  });

  it('names the chord the little diagram shows, and draws its dots in note colours', async () => {
    open('scarborough-fair');
    playback.beat = 2;
    const diagram = await screen.findByTestId('current-chord');
    expect(within(diagram).getByText('Am')).toBeInTheDocument();
    expect(within(diagram).getByRole('img', { name: 'Am chord diagram' })).toBeInTheDocument();
    const fills = [...diagram.querySelectorAll('circle')].map((circle) => circle.getAttribute('fill'));
    expect(fills).not.toContain('var(--color-accent)');
    expect(fills.some((fill) => fill?.startsWith('#'))).toBe(true);
  });

  it('draws the tab with its string names beside the scroller, not in it', async () => {
    open('scarborough-fair');
    await userEvent.click(screen.getByTestId('view-tab'));
    const scroller = screen.getByTestId('tab-scroller');
    expect(scroller).toContainElement(screen.getByTestId('tab-staff'));
    expect(scroller).not.toContainElement(screen.getByTestId('tab-string-names'));
    expect(screen.getByTestId('tab-string-names')).toHaveTextContent('EADGBe');
  });

  it('draws the fretboard view with string names and note colours', async () => {
    open('scarborough-fair');
    await userEvent.click(screen.getByTestId('view-fretboard'));
    const board = screen.getByTestId('fretboard');
    expect(board.querySelector('[data-testid="string-name-0"]')).toHaveTextContent('E');
    expect(screen.getByTestId('fretboard-loop').className).not.toMatch(/uppercase|tracking/);
  });
});
