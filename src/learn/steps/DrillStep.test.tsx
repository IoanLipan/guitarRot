import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('DrillStep on a small phone', () => {
  /** Renders the drill where `(max-height: 700px)` does, or does not, match, and hands back what was asked. */
  function onScreen<T>(
    tight: boolean,
    read: () => T,
    drill: Extract<LessonStep, { kind: 'drill' }> = step,
  ): { value: T; asked: string[] } {
    const original = window.matchMedia;
    const matchMedia = vi.fn().mockReturnValue({
      matches: tight,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    window.matchMedia = matchMedia;
    try {
      const { unmount } = render(<DrillStep step={drill} engine={fakeEngine()} onDone={vi.fn()} />);
      const value = read();
      unmount();
      return { value, asked: matchMedia.mock.calls.map(([query]) => String(query)) };
    } finally {
      window.matchMedia = original;
    }
  }

  /**
   * The tallest the board is drawn, in pixels: its widest width over its own aspect ratio. A board that
   * scrolls sideways is held at its minimum width, which wins over its maximum.
   */
  function boardHeight(): number {
    const wrapper = screen.getByTestId('neck').firstElementChild as HTMLElement;
    const [width, height] = (wrapper.style.aspectRatio.split('/') as [string, string]).map(Number) as [number, number];
    const widest = Math.max(Number.parseFloat(wrapper.style.maxWidth), Number.parseFloat(wrapper.style.minWidth) || 0);
    return (widest * height) / width;
  }

  it('has no eyebrow: the progress row is the first thing, and the question is the heading', () => {
    show();
    expect(screen.queryByText('Practice')).not.toBeInTheDocument();
    const root = screen.getByTestId('step-drill');
    expect(root.firstElementChild).toContainElement(screen.getByTestId('drill-count'));
    expect(root.firstElementChild?.querySelector('ol')).not.toBeNull();
  });

  it('draws the board no taller than 160px, so four answers fit under it on a 568px phone', () => {
    const tight = onScreen(true, boardHeight);
    const roomy = onScreen(false, boardHeight);
    expect(tight.value).toBeLessThanOrEqual(160 + 0.5);
    expect(roomy.value).toBeGreaterThan(tight.value);
    // It asks the question the `tight:` variant asks (src/index.css).
    expect(tight.asked).toContain('(max-height: 700px)');
  });

  it('does the same for the frets 0 to 12 drills, whose board scrolls sideways and used to ignore the limit', () => {
    const wide: Extract<LessonStep, { kind: 'drill' }> = { kind: 'drill', strings: [0], fretRange: [0, 12], count: 3 };
    const tight = onScreen(true, boardHeight, wide);
    const roomy = onScreen(false, boardHeight, wide);
    expect(tight.value).toBeLessThanOrEqual(160 + 0.5);
    expect(roomy.value).toBeGreaterThan(200);
    expect(tight.value).toBeLessThan(roomy.value);
  });

  it('asks the same question as the tight: variant', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');
    expect(css).toContain('@custom-variant tight (@media (max-height: 700px));');
  });

  it('keeps a roomy verdict block normally and one line of it when tight, so the answers are not pushed out', () => {
    show();
    expect(screen.getByRole('status')).toHaveClass('min-h-28', 'tight:min-h-7');
  });

  it('closes its gaps under tight: and keeps the question and the answers in the order they are read', () => {
    show();
    const root = screen.getByTestId('step-drill');
    expect(root).toHaveClass('gap-4', 'tight:gap-3');
    const order = [
      screen.getByTestId('neck'),
      screen.getByRole('heading', { level: 2 }),
      screen.getByTestId('answer-grid'),
      screen.getByRole('status'),
    ];
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
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
