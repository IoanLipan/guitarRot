import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { CHORDS } from '@/content';
import { Explore } from './Explore';

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

describe('Explore', () => {
  it('shows a placeholder caption before any fret is tapped', () => {
    render(<Explore engine={fakeEngine()} />);
    expect(screen.getByText('Tap any fret to hear it.')).toBeInTheDocument();
  });

  it('plays the tapped note and updates the caption', () => {
    const engine = fakeEngine();
    render(<Explore engine={engine} />);

    // Low E string (string 6), fret 5 -> A.
    fireEvent.click(screen.getByTestId('cell-s0f5'));

    expect(engine.playNote).toHaveBeenCalledWith(45, { stringIndex: 0 });
    expect(screen.getByText(/You tapped fret 5, string 6/)).toBeInTheDocument();
    expect(screen.getByTestId('tapped-note')).toHaveTextContent('A (La)');
  });

  it('renders one tile per library chord', () => {
    render(<Explore engine={fakeEngine()} />);
    expect(screen.getAllByTestId(/^chord-tile-/)).toHaveLength(CHORDS.length);
  });

  it('strums the tapped chord', () => {
    const engine = fakeEngine();
    render(<Explore engine={engine} />);

    fireEvent.click(screen.getByTestId('chord-tile-Am-open'));

    expect(engine.strum).toHaveBeenCalledTimes(1);
  });

  it('names the chord and its tones after a tap, and marks the tile pressed', () => {
    render(<Explore engine={fakeEngine()} />);
    expect(screen.getByTestId('chord-caption')).toHaveTextContent(
      'Tap a shape to hear it strummed.',
    );

    fireEvent.click(screen.getByTestId('chord-tile-Am-open'));

    expect(screen.getByTestId('chord-caption')).toHaveTextContent(
      'Am — La minor — A (La) · C (Do) · E (Mi)',
    );
    expect(screen.getByTestId('chord-tile-Am-open')).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts the chord caption above the grid of tiles, and sticks it to the top of the scroll', () => {
    render(<Explore engine={fakeEngine()} />);

    const caption = screen.getByTestId('chord-caption');
    const firstTile = screen.getByTestId(`chord-tile-${CHORDS[0]!.id}`);
    // A caption under 29 tiles is off screen from any tile but the last; above them it is in view.
    expect(caption.compareDocumentPosition(firstTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(caption.parentElement).toHaveClass('sticky', 'top-0');
    expect(caption.parentElement).toHaveClass('bg-ground');
    expect(caption).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the caption in view with the chord named, whichever tile was tapped', () => {
    render(<Explore engine={fakeEngine()} />);
    const last = CHORDS[CHORDS.length - 1]!;

    fireEvent.click(screen.getByTestId(`chord-tile-${last.id}`));

    expect(screen.getByTestId('chord-caption')).toHaveTextContent(last.name);
    expect(screen.getByTestId('chord-caption').parentElement).toHaveClass('sticky');
  });

  it('holds the fretboard inside the page gutters, as a scroller that fades where there is more', () => {
    render(<Explore engine={fakeEngine()} />);

    const scroller = screen.getByTestId('scroll-fade');
    expect(scroller).toContainElement(screen.getByRole('img', { name: 'Fretboard explorer' }));
    // The old scroller pulled itself out to the screen edges (-mx-5) and so ran past the right gutter.
    expect(scroller.className).not.toMatch(/-mx-/);
  });

  it('heads its three sections in the quiet label style, in sentence case', () => {
    render(<Explore engine={fakeEngine()} />);

    for (const name of ['Fretboard explorer', 'Chord library', /^Scale positions/]) {
      const head = screen.getByRole('heading', { level: 2, name });
      expect(head).toHaveClass('label');
      expect(head.className).not.toMatch(/uppercase|tracking-/);
    }
    expect(screen.getByText(`${CHORDS.length} shapes`)).toHaveClass('text-ink-faint');
  });
});
