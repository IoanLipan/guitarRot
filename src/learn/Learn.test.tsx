import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AudioEngine } from '@/audio';
import { Learn } from './Learn';

function fakeEngine(): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('Learn', () => {
  it('shows a placeholder caption before any fret is tapped', () => {
    render(<Learn engine={fakeEngine()} />);
    expect(screen.getByText('Tap a fret to hear it.')).toBeInTheDocument();
  });

  it('plays the tapped note and updates the caption', () => {
    const engine = fakeEngine();
    render(<Learn engine={engine} />);

    // Low E string (string 6), fret 5 -> A.
    fireEvent.click(screen.getByTestId('cell-s0f5'));

    expect(engine.playNote).toHaveBeenCalledWith(45, { stringIndex: 0 });
    expect(screen.getByText(/You tapped fret 5, string 6/)).toBeInTheDocument();
    expect(screen.getByTestId('tapped-note')).toHaveTextContent('A');
  });

  it('renders one tile per library chord', () => {
    render(<Learn engine={fakeEngine()} />);
    expect(screen.getAllByTestId(/^chord-tile-/)).toHaveLength(9);
  });

  it('strums the tapped chord', () => {
    const engine = fakeEngine();
    render(<Learn engine={engine} />);

    fireEvent.click(screen.getByTestId('chord-tile-Am-open'));

    expect(engine.strum).toHaveBeenCalledTimes(1);
  });
});
