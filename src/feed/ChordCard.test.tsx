import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { CHORDS } from '@/content';
import { noteColor } from '@/render';
import { ChordCard } from './ChordCard';

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

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

const am = CHORDS.find((c) => c.name === 'Am');
if (am === undefined) throw new Error('missing Am fixture');

describe('ChordCard', () => {
  it('is one button, named for what it does: "Strum Am", not a run of its own text', () => {
    render(<ChordCard chord={am} engine={fakeEngine()} />);
    const card = screen.getByRole('button', { name: 'Strum Am' });
    expect(card).toBe(screen.getByTestId(`chord-card-${am.id}`));
    expect(card.getAttribute('aria-label')).toBe('Strum Am');
  });

  it('strums when tapped', () => {
    const engine = fakeEngine();
    render(<ChordCard chord={am} engine={engine} />);
    fireEvent.click(screen.getByRole('button', { name: 'Strum Am' }));
    expect(engine.strum).toHaveBeenCalledTimes(1);
  });

  it('shows the tones as the lessons do: note chips, each in its note colour', () => {
    render(<ChordCard chord={am} engine={fakeEngine()} />);
    const card = screen.getByTestId(`chord-card-${am.id}`);
    const chips = [...card.querySelectorAll('[data-note-chip]')];
    expect(chips.map((chip) => chip.getAttribute('data-note-chip'))).toEqual(['A', 'C', 'E']);
    expect((chips[0] as HTMLElement).style.color).not.toBe('');
    expect(card.querySelector('[data-note-chip="E"]')).toHaveStyle({ color: noteColor('E') });
  });

  it('colours the dots of its diagram by note, with the finger in each', () => {
    render(<ChordCard chord={am} engine={fakeEngine()} />);
    const dots = [...screen.getByTestId(`chord-card-${am.id}`).querySelectorAll('[data-testid^="marker-"]')];
    expect(dots).toHaveLength(3);
    const fills = dots.map((text) => text.previousElementSibling?.getAttribute('fill'));
    expect(fills).toEqual([noteColor('E'), noteColor('A'), noteColor('C')]);
    expect(fills).not.toContain('var(--color-accent)');
  });

  it('says what a tap does in sentence case, and says "Strumming…" while it rings', () => {
    render(<ChordCard chord={am} engine={fakeEngine()} />);
    const card = screen.getByTestId(`chord-card-${am.id}`);
    expect(card).toHaveTextContent('Tap anywhere to hear it');
    expect(card).not.toHaveTextContent('tap anywhere');
    fireEvent.click(card);
    expect(card).toHaveTextContent('Strumming…');
    expect(card).not.toHaveTextContent('strumming');
  });

  it('is a flat card, with no gradient', () => {
    render(<ChordCard chord={am} engine={fakeEngine()} />);
    expect(screen.getByTestId(`chord-card-${am.id}`).className).not.toContain('gradient');
    expect(screen.getByTestId(`chord-card-${am.id}`).className).toContain('bg-ground');
  });

  it('writes the solfège name in sentence case, not capitals', () => {
    render(<ChordCard chord={am} engine={fakeEngine()} />);
    const name = screen.getByText('La minor');
    expect(name.className).not.toMatch(/uppercase|tracking/);
  });
});
