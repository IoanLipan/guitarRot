import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { CHORDS } from '@/content';
import { ChordCard } from './ChordCard';

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

describe('ChordCard solfège', () => {
  it('names the chord and every tone in solfège under the chord name', () => {
    const chord = CHORDS.find((c) => c.name === 'Am');
    if (chord === undefined) throw new Error('missing Am fixture');

    render(<ChordCard chord={chord} engine={fakeEngine()} />);

    const card = screen.getByTestId(`chord-card-${chord.id}`);
    expect(card).toHaveTextContent('Am');
    expect(card).toHaveTextContent('La minor');
    expect(card).toHaveTextContent('A (La) · C (Do) · E (Mi)');
  });
});
