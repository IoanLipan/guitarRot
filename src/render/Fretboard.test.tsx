import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Fretboard } from './Fretboard';
import { createFretboardGeometry } from './fretboardGeometry';

describe('Fretboard', () => {
  it('renders one marker per position', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[
          { stringIndex: 0, fret: 3 },
          { stringIndex: 2, fret: 2 },
        ]}
      />,
    );
    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(2);
  });

  it('labels markers with note names in note mode', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        labelMode="note"
        markers={[{ stringIndex: 0, fret: 3 }]}
      />,
    );
    expect(screen.getByTestId('marker-s0f3')).toHaveTextContent('G');
  });

  it('labels markers with intervals when given a root', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        labelMode="interval"
        intervalRootMidi={40}
        markers={[{ stringIndex: 0, fret: 5 }]}
      />,
    );
    // The open low E is MIDI 40; fret 5 is 45, a perfect fourth above it.
    expect(screen.getByTestId('marker-s0f5')).toHaveTextContent('P4');
  });

  it('uses the marker label in custom mode', () => {
    render(
      <Fretboard
        orientation="vertical"
        fretRange={[0, 4]}
        labelMode="custom"
        markers={[{ stringIndex: 3, fret: 2, label: '3' }]}
      />,
    );
    expect(screen.getByTestId('marker-s3f2')).toHaveTextContent('3');
  });

  it('marks muted and open strings', () => {
    render(
      <Fretboard
        orientation="vertical"
        fretRange={[0, 4]}
        markers={[]}
        mutedStrings={[0]}
        openStrings={[1, 5]}
      />,
    );
    expect(screen.getByTestId('muted-s0')).toBeInTheDocument();
    expect(screen.getByTestId('open-s1')).toBeInTheDocument();
    expect(screen.getByTestId('open-s5')).toBeInTheDocument();
  });

  it('draws a barre when given one', () => {
    render(
      <Fretboard
        orientation="vertical"
        fretRange={[0, 4]}
        markers={[]}
        barre={{ fret: 1, fromStringIndex: 0, toStringIndex: 5 }}
      />,
    );
    expect(screen.getByTestId('barre')).toBeInTheDocument();
  });

  it('reports the tapped position', () => {
    const onFretTap = vi.fn();
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[]}
        onFretTap={onFretTap}
      />,
    );
    fireEvent.click(screen.getByTestId('cell-s2f3'));
    expect(onFretTap).toHaveBeenCalledWith({ stringIndex: 2, fret: 3 });
  });

  it('offers an open-string tap target when the nut is shown', () => {
    const onFretTap = vi.fn();
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[]}
        onFretTap={onFretTap}
      />,
    );
    fireEvent.click(screen.getByTestId('cell-s0f0'));
    expect(onFretTap).toHaveBeenCalledWith({ stringIndex: 0, fret: 0 });
  });

  it('renders no tap targets when it is not interactive', () => {
    render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} />);
    expect(screen.queryByTestId('cell-s2f3')).toBeNull();
  });

  it('gives each tap target an accessible label naming the note', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[]}
        onFretTap={() => {}}
      />,
    );
    expect(screen.getByTestId('cell-s0f3')).toHaveAttribute(
      'aria-label',
      'G2 (Sol), string 6, fret 3',
    );
  });

  describe('per-marker colour', () => {
    function dot(testId: string) {
      return screen.getByTestId(testId).previousElementSibling as SVGElement;
    }

    it('fills a fretted dot with the colour it is given, and writes its label dark', () => {
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          labelMode="note"
          markers={[{ stringIndex: 0, fret: 3, color: '#2ec4d6' }]}
        />,
      );
      expect(dot('marker-s0f3')).toHaveAttribute('fill', '#2ec4d6');
      expect(screen.getByTestId('marker-s0f3')).toHaveAttribute('fill', 'var(--color-ground)');
    });

    it('rings an open string in that colour, and writes its label in it too', () => {
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          labelMode="note"
          markers={[{ stringIndex: 0, fret: 0, color: '#ffd84d' }]}
        />,
      );
      expect(dot('marker-s0f0')).toHaveAttribute('fill', 'none');
      expect(dot('marker-s0f0')).toHaveAttribute('stroke', '#ffd84d');
      expect(screen.getByTestId('marker-s0f0')).toHaveAttribute('fill', '#ffd84d');
    });

    it('keeps the tone colours when no colour is given', () => {
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          markers={[{ stringIndex: 0, fret: 3, tone: 'correct' }]}
        />,
      );
      expect(dot('marker-s0f3')).toHaveAttribute('fill', 'var(--color-good)');
    });
  });

  describe('highlightStrings', () => {
    it('draws the named strings bright with a glow and fades the others', () => {
      render(
        <Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} highlightStrings={[0, 2]} />,
      );
      for (const i of [0, 2]) {
        expect(screen.getByTestId(`string-${i}`)).toHaveAttribute('data-state', 'highlighted');
        expect(screen.getByTestId(`string-glow-${i}`)).toBeInTheDocument();
      }
      for (const i of [1, 3, 4, 5]) {
        expect(screen.getByTestId(`string-${i}`)).toHaveAttribute('data-state', 'dimmed');
        expect(screen.queryByTestId(`string-glow-${i}`)).toBeNull();
      }
    });

    it('treats an empty list like no list: every string is the same', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} highlightStrings={[]} />);
      expect(screen.getByTestId('string-3')).not.toHaveAttribute('data-state');
    });
  });

  describe('markerScale', () => {
    function radius() {
      const dot = screen.getByTestId('marker-s0f3').previousElementSibling;
      return Number(dot?.getAttribute('r'));
    }

    it('grows the dots, and leaves them alone at the default', () => {
      const { unmount } = render(
        <Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[{ stringIndex: 0, fret: 3 }]} />,
      );
      const normal = radius();
      unmount();
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          markers={[{ stringIndex: 0, fret: 3 }]}
          markerScale={1.5}
        />,
      );
      expect(radius()).toBeCloseTo(normal * 1.5);
    });
  });

  describe('emphasis', () => {
    const markers = [
      { stringIndex: 0, fret: 3, emphasis: 'lit' as const },
      { stringIndex: 1, fret: 3, emphasis: 'next' as const },
      { stringIndex: 2, fret: 3, emphasis: 'dim' as const },
      { stringIndex: 3, fret: 3 },
    ];
    const group = (id: string) => screen.getByTestId(id).parentElement as HTMLElement;

    it('grows the lit dot with a glow, rings the next one, and fades the rest', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={markers} />);

      expect(group('marker-s0f3')).toHaveAttribute('data-emphasis', 'lit');
      expect(group('marker-s0f3').style.transform).toBe('scale(1.3)');
      expect(group('marker-s0f3').querySelectorAll('circle')).toHaveLength(2);

      expect(group('marker-s1f3')).toHaveAttribute('data-emphasis', 'next');
      const ring = group('marker-s1f3').querySelector('circle[fill="none"]');
      expect(ring).toHaveAttribute('stroke', 'var(--color-ink)');
      expect(group('marker-s1f3').querySelectorAll('circle')).toHaveLength(2);

      expect(group('marker-s2f3')).toHaveAttribute('data-emphasis', 'dim');
      expect(Number(group('marker-s2f3').style.opacity)).toBeLessThan(0.5);
      expect(group('marker-s2f3').querySelectorAll('circle')).toHaveLength(1);
    });

    it('lets the dot ease between states, and draws a dot without emphasis exactly as before', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={markers} />);
      expect(group('marker-s0f3')).toHaveClass('fb-dot-emph');
      expect(group('marker-s3f3')).not.toHaveClass('fb-dot-emph');
      expect(group('marker-s3f3')).not.toHaveAttribute('data-emphasis');
      expect(group('marker-s3f3')).not.toHaveAttribute('style');
      expect(group('marker-s3f3').querySelectorAll('circle')).toHaveLength(1);
    });

    it('works on an open string too: the ring is lit, not a solid dot', () => {
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          markers={[{ stringIndex: 2, fret: 0, color: '#ff9f43', emphasis: 'lit' }]}
        />,
      );
      expect(group('marker-s2f0')).toHaveAttribute('data-emphasis', 'lit');
      expect(screen.getByTestId('marker-s2f0').previousElementSibling).toHaveAttribute('fill', 'none');
    });
  });

  it('puts the high e string at the top and the low E at the bottom, like the tab', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[
          { stringIndex: 0, fret: 1 },
          { stringIndex: 5, fret: 1 },
        ]}
      />,
    );
    const y = (id: string) => Number(screen.getByTestId(id).getAttribute('y'));
    expect(y('marker-s5f1')).toBeLessThan(y('marker-s0f1'));
  });

  describe('a question board does not give its answer away', () => {
    const question = (
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[{ stringIndex: 3, fret: 3, tone: 'root' }]}
        onFretTap={() => {}}
        revealNotes={false}
      />
    );

    it('names only where each tap target is, never the note', () => {
      render(question);
      expect(screen.getByTestId('cell-s3f5')).toHaveAttribute('aria-label', 'String 3, fret 5');
      expect(screen.getByTestId('cell-s3f3')).toHaveAttribute('aria-label', 'String 3, fret 3');
      expect(screen.getByTestId('cell-s0f0')).toHaveAttribute('aria-label', 'String 6, open');
      for (const cell of screen.getAllByRole('button')) {
        expect(cell.getAttribute('aria-label')).toMatch(/^String \d, (fret \d+|open)$/);
      }
    });

    it('still says the note on a board that is a picture of the answer', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} />);
      // The G string, two frets up.
      expect(screen.getByTestId('cell-s3f2')).toHaveAttribute('aria-label', 'A3 (La), string 3, fret 2');
    });

    it('prints nothing in the dot', () => {
      render(question);
      expect(screen.getByTestId('marker-s3f3')).toHaveTextContent('');
    });
  });

  describe('keyboard', () => {
    function board(onFretTap = vi.fn()) {
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          markers={[{ stringIndex: 2, fret: 3 }]}
          onFretTap={onFretTap}
        />,
      );
      return onFretTap;
    }

    it('is one tab stop: the cell of the first dot, every other cell out of the tab order', () => {
      board();
      const stops = screen.getAllByRole('button').filter((cell) => cell.getAttribute('tabindex') === '0');
      expect(stops).toHaveLength(1);
      expect(stops[0]).toBe(screen.getByTestId('cell-s2f3'));
    });

    it('starts on the low E string at the nut when there is no dot', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} />);
      expect(screen.getByTestId('cell-s0f0')).toHaveAttribute('tabindex', '0');
    });

    it('moves with the arrow keys and carries the tab stop along', () => {
      board();
      const start = screen.getByTestId('cell-s2f3');
      start.focus();
      fireEvent.keyDown(start, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s2f4'));
      expect(screen.getByTestId('cell-s2f4')).toHaveAttribute('tabindex', '0');
      expect(screen.getByTestId('cell-s2f3')).toHaveAttribute('tabindex', '-1');

      // The high string is on top of a horizontal board, so Up is the next string index.
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s3f4'));

      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' });
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s2f3'));
    });

    it('jumps to the ends of the string with Home and End, and stops at the edges', () => {
      board();
      const start = screen.getByTestId('cell-s2f3');
      start.focus();
      fireEvent.keyDown(start, { key: 'End' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s2f5'));
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s2f5'));
      fireEvent.keyDown(document.activeElement as Element, { key: 'Home' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s2f0'));
    });

    it('goes down a vertical board with the Down arrow, and across it with Right', () => {
      render(
        <Fretboard
          orientation="vertical"
          fretRange={[0, 4]}
          markers={[{ stringIndex: 1, fret: 1 }]}
          onFretTap={() => {}}
        />,
      );
      const start = screen.getByTestId('cell-s1f1');
      start.focus();
      fireEvent.keyDown(start, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s1f2'));
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(screen.getByTestId('cell-s2f2'));
    });

    it('taps the focused cell with Enter or Space', () => {
      const onFretTap = board();
      const cell = screen.getByTestId('cell-s2f3');
      cell.focus();
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(onFretTap).toHaveBeenLastCalledWith({ stringIndex: 2, fret: 3 });
      fireEvent.keyDown(cell, { key: ' ' });
      expect(onFretTap).toHaveBeenCalledTimes(2);
    });

    it('is a group of buttons when it can be tapped, and an image when it cannot', () => {
      const { unmount } = render(
        <Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} ariaLabel="Tappable" />,
      );
      expect(screen.getByRole('group', { name: 'Tappable' })).toBeInTheDocument();
      unmount();
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} ariaLabel="Just a picture" />);
      expect(screen.getByRole('img', { name: 'Just a picture' })).toBeInTheDocument();
    });
  });

  describe('string names', () => {
    const geometry = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], stringLabels: true });

    it('names the six strings as the tab does, the low E at the bottom, each level with its string', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} />);
      const names = [0, 1, 2, 3, 4, 5].map((i) => screen.getByTestId(`string-name-${i}`));
      expect(names.map((name) => name.textContent)).toEqual(['E', 'A', 'D', 'G', 'B', 'e']);
      names.forEach((name, i) => {
        expect(Number(name.getAttribute('y'))).toBeCloseTo(geometry.stringLine(i).y1);
        // In the gutter at the nut end, left of everything the board draws.
        expect(Number(name.getAttribute('x'))).toBeLessThan(geometry.markerPoint({ stringIndex: i, fret: 0 }).x - 20);
      });
    });

    it('is not on a vertical board, and can be switched off', () => {
      const { unmount } = render(<Fretboard orientation="vertical" fretRange={[0, 4]} markers={[]} />);
      expect(screen.queryByTestId('string-name-0')).toBeNull();
      unmount();
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} stringNames={false} />);
      expect(screen.queryByTestId('string-name-0')).toBeNull();
    });

    it('can keep the room for the names and leave the drawing to its caller', () => {
      const { container, unmount } = render(
        <Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} stringNames="gutter" />,
      );
      expect(screen.queryByTestId('string-name-0')).toBeNull();
      const withGutter = container.querySelector('svg')?.getAttribute('viewBox');
      unmount();
      const bare = render(
        <Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} stringNames={false} />,
      ).container.querySelector('svg')?.getAttribute('viewBox');
      expect(withGutter).not.toBe(bare);
    });
  });

  describe('the numbers and names are legible', () => {
    function labelSizes() {
      const svg = screen.getByTestId('fretboard');
      return [...svg.querySelectorAll('text')]
        .filter((text) => /^\d+$/.test(text.textContent ?? '') || text.getAttribute('data-testid')?.startsWith('string-name'))
        .map((text) => Number(text.getAttribute('font-size')));
    }

    it('draws fret numbers and string names at 12px or more at natural size', () => {
      render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} />);
      const sizes = labelSizes();
      expect(sizes).toHaveLength(11);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(12);
    });

    describe('on a board scaled to fit its box', () => {
      const geometry = createFretboardGeometry({
        orientation: 'horizontal',
        fretRange: [0, 5],
        interactive: true,
        stringLabels: true,
      });

      function boxedAt(scale: number) {
        Object.defineProperty(window.SVGElement.prototype, 'clientWidth', {
          configurable: true,
          get: () => geometry.width * scale,
        });
        Object.defineProperty(window.SVGElement.prototype, 'clientHeight', {
          configurable: true,
          get: () => geometry.height * scale,
        });
      }

      afterEach(() => {
        Reflect.deleteProperty(window.SVGElement.prototype, 'clientWidth');
        Reflect.deleteProperty(window.SVGElement.prototype, 'clientHeight');
      });

      it('asks for 13 real pixels: a board at 0.7 draws about 18 units, which is 13px', () => {
        boxedAt(0.7);
        render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} fit />);
        for (const size of labelSizes()) {
          expect(size).toBeCloseTo(18, 0);
          expect(size * 0.7).toBeGreaterThanOrEqual(12);
        }
      });

      it('does not blow the text up on a board that is already large', () => {
        boxedAt(1.4);
        render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} fit />);
        for (const size of labelSizes()) {
          expect(size).toBeLessThan(13);
          expect(size * 1.4).toBeGreaterThanOrEqual(12);
        }
      });
    });
  });

  describe('notes and markers', () => {
    it('draws a dot that is not a note in the marker colour, never amber', () => {
      render(
        <Fretboard
          orientation="horizontal"
          fretRange={[0, 5]}
          markers={[
            { stringIndex: 0, fret: 3, tone: 'root' },
            { stringIndex: 1, fret: 3, tone: 'accent' },
            { stringIndex: 2, fret: 3 },
          ]}
        />,
      );
      for (const id of ['marker-s0f3', 'marker-s1f3', 'marker-s2f3']) {
        const dot = screen.getByTestId(id).previousElementSibling;
        expect(dot).toHaveAttribute('fill', 'var(--color-marker)');
        expect(screen.getByTestId(id)).toHaveAttribute('fill', 'var(--color-ground)');
      }
      expect(screen.getByTestId('fretboard').innerHTML).not.toContain('var(--color-accent)');
    });
  });

  it('shrinks a long label so "Sol" still fits inside its dot', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        labelMode="custom"
        markers={[
          { stringIndex: 0, fret: 3, label: 'G' },
          { stringIndex: 1, fret: 3, label: 'Sol' },
        ]}
      />,
    );
    const size = (id: string) => Number(screen.getByTestId(id).getAttribute('font-size'));
    expect(size('marker-s1f3')).toBeLessThan(size('marker-s0f3'));
  });
});
