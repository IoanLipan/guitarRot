import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { LessonStep } from '@/content';
import { fretToMidi, noteName, STANDARD_TUNING, withSolfege } from '@/music';
import { fakeEngine } from '../testkit';
import { DrillStep } from './DrillStep';

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

const step: Extract<LessonStep, { kind: 'drill' }> = { kind: 'drill', strings: [0, 1, 2], fretRange: [0, 5], count: 3 };

function show() {
  const engine = fakeEngine();
  render(<DrillStep step={step} engine={engine} onDone={vi.fn()} />);
  return engine;
}

/** Where the question's dot is, read off the board. */
function dotPosition(): { stringIndex: number; fret: number } {
  const marker = document.querySelector('[data-testid^="marker-"]');
  const match = /^marker-s(\d)f(\d+)$/.exec(marker?.getAttribute('data-testid') ?? '');
  if (match === null) throw new Error('no question on screen');
  return { stringIndex: Number(match[1]), fret: Number(match[2]) };
}

describe('DrillStep does not print its answer', () => {
  it('draws the dot with nothing in it: the question is "name this note"', () => {
    show();
    const { stringIndex, fret } = dotPosition();
    expect(screen.getByTestId(`marker-s${stringIndex}f${fret}`)).toHaveTextContent('');
    // Not a letter anywhere in the dots of the board.
    for (const marker of document.querySelectorAll('[data-testid^="marker-"]')) {
      expect(marker.textContent).toBe('');
    }
  });

  it('draws the question dot as a marker, not as an amber or a note-coloured dot', () => {
    show();
    const { stringIndex, fret } = dotPosition();
    const dot = screen.getByTestId(`marker-s${stringIndex}f${fret}`).previousElementSibling;
    // An open string is a ring, so its colour is the stroke.
    expect(dot?.getAttribute(fret === 0 ? 'stroke' : 'fill')).toBe('var(--color-marker)');
  });

  it('has tap targets that say where they are, and not which note they play', () => {
    show();
    const board = screen.getByTestId('step-drill');
    const cells = within(board).getAllByTestId(/^cell-/);
    expect(cells.length).toBeGreaterThan(30);
    for (const cell of cells) {
      expect(cell.getAttribute('aria-label')).toMatch(/^String \d, (fret \d+|open)$/);
    }
  });

  it('describes the board by the position of the dot, and says no note', () => {
    show();
    const { stringIndex, fret } = dotPosition();
    const label = screen.getByRole('group', { name: /Name this note/ }).getAttribute('aria-label') ?? '';
    expect(label).toContain(`string ${6 - stringIndex}`);
    expect(label).toContain(fret === 0 ? 'open' : `fret ${fret}`);
    const answer = noteName(fretToMidi(STANDARD_TUNING, stringIndex, fret));
    expect(label).not.toContain(withSolfege(answer));
    expect(label).not.toMatch(/\([A-Z][a-z]+#?\)/);
  });

  it('still plays the note you tap, which is the ear-training half of the question', () => {
    const engine = show();
    fireEvent.click(screen.getByTestId('cell-s0f3'));
    expect(engine.playNote).toHaveBeenCalledWith(fretToMidi(STANDARD_TUNING, 0, 3), { stringIndex: 0 });
  });
});

describe('DrillStep board', () => {
  it('is one tab stop, on the dot, and Enter on it plays that fret', () => {
    const engine = show();
    const { stringIndex, fret } = dotPosition();
    const cell = screen.getByTestId(`cell-s${stringIndex}f${fret}`);
    const stops = within(screen.getByTestId('step-drill'))
      .getAllByRole('button')
      .filter((button) => button.getAttribute('tabindex') === '0' && button.hasAttribute('data-cell'));
    expect(stops).toEqual([cell]);

    cell.focus();
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(engine.playNote).toHaveBeenCalledWith(fretToMidi(STANDARD_TUNING, stringIndex, fret), { stringIndex });
  });

  it('names the strings on a board that scrolls, in a column that stays in view', () => {
    render(
      <DrillStep
        step={{ kind: 'drill', strings: [0], fretRange: [0, 12], count: 3 }}
        engine={fakeEngine()}
        onDone={vi.fn()}
      />,
    );
    const names = screen.getByTestId('neck-string-names');
    expect(names.textContent).toBe('EADGBe');
    expect(names.className).toContain('sticky');
    expect(names).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('DrillStep after a wrong answer', () => {
  it('marks the right option green and explains', () => {
    show();
    const { stringIndex, fret } = dotPosition();
    const right = withSolfege(noteName(fretToMidi(STANDARD_TUNING, stringIndex, fret)));
    const wrong = within(screen.getByTestId('answer-grid'))
      .getAllByRole('button')
      .find((button) => button.textContent !== right);
    if (wrong === undefined) throw new Error('no wrong option');
    fireEvent.click(wrong);

    expect(screen.getByRole('button', { name: right })).toHaveAttribute('data-correct', 'true');
    expect(screen.getByTestId('drill-explanation')).toBeInTheDocument();
  });
});
