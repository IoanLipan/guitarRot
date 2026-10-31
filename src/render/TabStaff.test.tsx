import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabStaff, TabStringNames } from './TabStaff';
import { TabView } from './TabView';
import { createTabGeometry } from './tabGeometry';
import { getRiff } from '@/content';

const riff = getRiff('em-pentatonic-box1');
if (riff === undefined) throw new Error('seed riff missing');

const geometry = createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature });

describe('TabStaff', () => {
  it('draws six staff lines', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getAllByTestId(/^staff-line-/)).toHaveLength(6);
  });

  it('draws one fret number per event', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getAllByTestId(/^tab-note-/)).toHaveLength(riff.events.length);
  });

  it('shows the fret number as the note text', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getByTestId('tab-note-0')).toHaveTextContent('0');
    expect(screen.getByTestId('tab-note-1')).toHaveTextContent('3');
  });

  it('draws one bar line per bar plus the closing line', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getAllByTestId(/^bar-line-/)).toHaveLength(riff.bars + 1);
  });

  it('does not carry the string names: they stand beside it, where scrolling cannot take them', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.queryByTestId('string-label-0')).toBeNull();
  });

  it('draws the staff lines in the fret colour at 0.4 opacity, where they can be seen', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    for (let i = 0; i < 6; i += 1) {
      const line = screen.getByTestId(`staff-line-${i}`);
      expect(line).toHaveAttribute('stroke', 'var(--color-fret)');
      expect(line).toHaveAttribute('stroke-opacity', '0.4');
    }
  });

  it('draws fret numbers at 16 to 18px', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    for (const note of screen.getAllByTestId(/^tab-note-/)) {
      const size = Number(note.getAttribute('font-size'));
      expect(size).toBeGreaterThanOrEqual(16);
      expect(size).toBeLessThanOrEqual(18);
    }
  });

  it('knocks the numbers out of the staff in the colour of the panel it sits on', () => {
    const { container } = render(<TabStaff riff={riff} geometry={geometry} />);
    expect(container.querySelector('rect')).toHaveAttribute('fill', 'var(--color-surface)');
  });

  it('renders a playhead when asked', () => {
    render(<TabStaff riff={riff} geometry={geometry} showPlayhead />);
    expect(screen.getByTestId('playhead')).toBeInTheDocument();
  });

  it('omits the playhead by default', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.queryByTestId('playhead')).toBeNull();
  });

  it('marks palm-muted notes', () => {
    const rock = getRiff('power-chord-drive');
    expect(rock).toBeDefined();
    if (rock === undefined) return;
    const rockGeometry = createTabGeometry({ bars: rock.bars, timeSignature: rock.timeSignature });
    render(<TabStaff riff={rock} geometry={rockGeometry} />);
    expect(screen.getAllByTestId(/^technique-/).length).toBeGreaterThan(0);
  });

  it('draws technique marks (h, p, b, P.M.) at 12px or more', () => {
    const rock = getRiff('power-chord-drive');
    if (rock === undefined) throw new Error('seed riff missing');
    render(
      <TabStaff riff={rock} geometry={createTabGeometry({ bars: rock.bars, timeSignature: rock.timeSignature })} />,
    );
    for (const mark of screen.getAllByTestId(/^technique-/)) {
      expect(Number(mark.getAttribute('font-size'))).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('TabStringNames', () => {
  it('names the strings low to high, level with the staff lines they label', () => {
    render(<TabStringNames geometry={geometry} />);
    const names = [0, 1, 2, 3, 4, 5].map((i) => screen.getByTestId(`string-label-${i}`));
    expect(names.map((name) => name.textContent)).toEqual(['E', 'A', 'D', 'G', 'B', 'e']);
    names.forEach((name, i) => {
      expect(Number(name.getAttribute('y'))).toBe(geometry.yForString(i));
      expect(Number(name.getAttribute('font-size'))).toBeGreaterThanOrEqual(12);
    });
  });

  it('is as tall as the staff, so the names stay level with it', () => {
    render(<TabStringNames geometry={geometry} />);
    expect(screen.getByTestId('tab-string-names')).toHaveAttribute('height', String(geometry.height));
  });
});

describe('TabView', () => {
  it('keeps the string names outside the element that scrolls', () => {
    render(<TabView riff={riff} />);
    const scroller = screen.getByTestId('tab-scroller');
    expect(scroller).toContainElement(screen.getByTestId('tab-staff'));
    expect(scroller).not.toContainElement(screen.getByTestId('tab-string-names'));
    expect(scroller.className).toContain('overflow-x-auto');
    expect(scroller.className).toContain('overscroll-x-contain');
  });

  it('hands the playhead and the scroller to its caller', () => {
    const playheadRef = { current: null as SVGGElement | null };
    const scrollerRef = vi.fn();
    render(<TabView riff={riff} playheadRef={playheadRef} scrollerRef={scrollerRef} />);
    expect(playheadRef.current).toBe(screen.getByTestId('playhead'));
    expect(scrollerRef).toHaveBeenCalledWith(screen.getByTestId('tab-scroller'));
  });

  it('draws at the spacing it is given', () => {
    render(<TabView riff={riff} stringSpacing={36} />);
    const lines = [0, 1].map((i) => Number(screen.getByTestId(`staff-line-${i}`).getAttribute('y1')));
    expect(Math.abs((lines[0] ?? 0) - (lines[1] ?? 0))).toBe(36);
  });

  describe('sizing itself to the room it has', () => {
    function roomOf(height: number) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => height });
    }
    afterEach(() => Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight'));

    const spacing = () =>
      Math.abs(
        Number(screen.getByTestId('staff-line-0').getAttribute('y1')) -
          Number(screen.getByTestId('staff-line-1').getAttribute('y1')),
      );

    it('grows to 40 in a tall card instead of staying a 190px strip', () => {
      roomOf(600);
      render(<TabView riff={riff} />);
      expect(spacing()).toBe(40);
    });

    it('takes the room there is in between, and the least in a cramped one', () => {
      roomOf(54 + 5 * 30);
      const { unmount } = render(<TabView riff={riff} />);
      expect(spacing()).toBe(30);
      unmount();
      roomOf(120);
      render(<TabView riff={riff} />);
      expect(spacing()).toBe(22);
    });
  });
});
