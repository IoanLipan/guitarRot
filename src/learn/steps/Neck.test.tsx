import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Neck } from './Neck';

describe('Neck string names', () => {
  it('draws them in the board when the whole board fits', () => {
    render(<Neck fretRange={[0, 5]} markers={[]} ariaLabel="A short neck" />);
    expect(screen.queryByTestId('neck-string-names')).toBeNull();
    expect(screen.getByTestId('string-name-0')).toHaveTextContent('E');
    expect(screen.getByTestId('string-name-5')).toHaveTextContent('e');
  });

  it('fits a board of frets 0 to 5 into a phone instead of scrolling it', () => {
    render(<Neck fretRange={[0, 5]} markers={[]} onFretTap={() => {}} ariaLabel="A short neck" />);
    const board = screen.getByTestId('neck').firstElementChild as HTMLElement;
    expect(board.style.minWidth).toBe('');
  });

  it('keeps them in view beside a board that scrolls, and draws them nowhere else', () => {
    render(<Neck fretRange={[0, 12]} markers={[]} ariaLabel="A long neck" />);
    const names = screen.getByTestId('neck-string-names');
    expect(names.textContent).toBe('EADGBe');
    expect(names.className).toContain('sticky');
    expect(names.className).toContain('pointer-events-none');
    expect(names).toHaveAttribute('aria-hidden', 'true');
    // Not drawn twice: the board keeps the room for them and leaves the drawing to this.
    expect(screen.queryByTestId('string-name-0')).toBeNull();
    const board = screen.getByTestId('neck').firstElementChild as HTMLElement;
    expect(board.style.minWidth).not.toBe('');
  });

  it('puts each name level with its string', () => {
    render(<Neck fretRange={[0, 12]} markers={[]} ariaLabel="A long neck" />);
    const tops = [...screen.getByTestId('neck-string-names').children].map((name) =>
      Number.parseFloat((name as HTMLElement).style.top),
    );
    // Low E at the bottom, high e at the top.
    expect(tops).toEqual([...tops].sort((a, b) => b - a));
    expect(tops[0]).toBeGreaterThan(70);
    expect(tops[5]).toBeLessThan(30);
  });

  it('centres a focused dot that has no label, measuring its group and not its empty text', () => {
    const measured: string[] = [];
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function measure(this: Element) {
      measured.push(this.tagName.toLowerCase());
      return original.call(this);
    };
    try {
      render(
        <Neck
          fretRange={[0, 12]}
          markers={[{ stringIndex: 0, fret: 9, tone: 'root' }]}
          labelMode="none"
          focus={{ stringIndex: 0, fret: 9 }}
          ariaLabel="A question"
        />,
      );
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
    expect(measured).toContain('g');
    expect(measured).not.toContain('text');
  });

  it('passes revealNotes on: a question board names no note to a screen reader', () => {
    render(
      <Neck fretRange={[0, 5]} markers={[]} onFretTap={() => {}} revealNotes={false} ariaLabel="A question" />,
    );
    expect(screen.getByTestId('cell-s0f3')).toHaveAttribute('aria-label', 'String 6, fret 3');
  });

  it('still says the note on a picture of the answer', () => {
    render(<Neck fretRange={[0, 5]} markers={[]} onFretTap={() => {}} ariaLabel="A neck" />);
    expect(screen.getByTestId('cell-s0f3')).toHaveAttribute('aria-label', 'G2 (Sol), string 6, fret 3');
  });
});
