import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Fretboard } from './Fretboard';

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
