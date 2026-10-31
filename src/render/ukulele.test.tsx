import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstrumentProvider } from '@/instrument';
import { getChord, type Riff } from '@/content';
import { GUITAR, UKULELE } from '@/music';
import { Fretboard } from './Fretboard';
import { createFretboardGeometry } from './fretboardGeometry';
import { chordShapeToFretboard } from './chordAdapter';
import { noteColor } from './noteColors';
import { TabStaff, TabStringNames } from './TabStaff';
import { TabView } from './TabView';
import { createTabGeometry, stringSpacingForHeight } from './tabGeometry';

/** A one-bar ukulele tab: the open G, then the A string at fret 3 (a C). */
const ukuleleRiff: Riff = {
  id: 'uke-test',
  instrument: 'ukulele',
  title: 'Four strings',
  style: 'Test',
  level: 1,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 1,
  source: 'original',
  tags: [],
  events: [
    { stringIndex: 0, fret: 0, beat: 0, duration: 1 },
    { stringIndex: 3, fret: 3, beat: 1, duration: 1 },
  ],
};

describe('a four-string fretboard', () => {
  it('draws four strings, and a marker on the fourth', () => {
    render(
      <Fretboard
        instrument={UKULELE}
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[{ stringIndex: 3, fret: 3 }]}
        labelMode="note"
      />,
    );

    expect(screen.getAllByTestId(/^string-\d$/)).toHaveLength(4);
    // The A string (the top line), third fret: C.
    expect(screen.getByTestId('marker-s3f3')).toHaveTextContent('C');
  });

  it('names the strings G C E A, the first string at the bottom as in a tab', () => {
    render(<Fretboard instrument={UKULELE} orientation="horizontal" fretRange={[0, 5]} markers={[]} />);

    expect([0, 1, 2, 3].map((index) => screen.getByTestId(`string-name-${index}`).textContent)).toEqual([
      'G',
      'C',
      'E',
      'A',
    ]);
    expect(screen.queryByTestId('string-name-4')).toBeNull();
    // Bottom to top on the page: index 0 has the largest y.
    const y = (index: number) => Number(screen.getByTestId(`string-name-${index}`).getAttribute('y'));
    expect(y(0)).toBeGreaterThan(y(1));
    expect(y(2)).toBeGreaterThan(y(3));
  });

  it('draws its strings at the ukulele\'s own widths', () => {
    render(<Fretboard instrument={UKULELE} orientation="horizontal" fretRange={[0, 5]} markers={[]} />);

    const widths = [0, 1, 2, 3].map((index) => Number(screen.getByTestId(`string-${index}`).getAttribute('stroke-width')));
    expect(widths).toEqual([...UKULELE.stringWidths]);
  });

  it('follows the instrument the app is set to, and says so to a screen reader', () => {
    render(
      <InstrumentProvider id="ukulele">
        <Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} />
      </InstrumentProvider>,
    );

    expect(screen.getByRole('img', { name: 'Ukulele fretboard' })).toBeInTheDocument();
    expect(screen.getAllByTestId(/^string-\d$/)).toHaveLength(4);
  });

  it('is still the six-string guitar board when nothing says otherwise', () => {
    render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} />);

    expect(screen.getAllByTestId(/^string-\d$/)).toHaveLength(6);
    expect(screen.getByRole('img', { name: 'Guitar fretboard' })).toBeInTheDocument();
    expect([0, 1, 2, 3, 4, 5].map((index) => screen.getByTestId(`string-name-${index}`).textContent)).toEqual(
      GUITAR.stringNames,
    );
  });

  it('taps name the notes of a ukulele: the open first string is G, the fourth string\'s third fret is C', () => {
    render(
      <Fretboard instrument={UKULELE} orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} />,
    );

    expect(screen.getByTestId('cell-s0f0')).toHaveAttribute('aria-label', 'G4 (Sol), string 4, open');
    expect(screen.getByTestId('cell-s3f3')).toHaveAttribute('aria-label', 'C5 (Do), string 1, fret 3');
    expect(screen.queryByTestId('cell-s4f0')).toBeNull();
  });

  it('reaches only its four strings with the arrow keys', () => {
    render(
      <Fretboard instrument={UKULELE} orientation="horizontal" fretRange={[0, 5]} markers={[]} onFretTap={() => {}} />,
    );
    const top = screen.getByTestId('cell-s3f2');
    top.focus();
    top.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    // There is no fifth string to move to: the cursor stays on the top line.
    expect(document.activeElement).toBe(top);
  });
});

describe('four-string geometry', () => {
  it('spaces four strings wider than six, so the board is not a ribbon, and lays them out bottom to top', () => {
    const six = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5] });
    const four = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], stringCount: 4 });

    expect(six.stringCount).toBe(6);
    expect(four.stringCount).toBe(4);
    expect(four.stringSpacing).toBeGreaterThan(six.stringSpacing);
    expect(four.height).toBeLessThan(six.height);
    expect(four.stringLine(0).y1).toBeGreaterThan(four.stringLine(3).y1);
    expect(() => four.stringLine(4)).toThrow('String index out of range');
  });

  it('is exactly what it was for six strings', () => {
    const six = createFretboardGeometry({ orientation: 'vertical', fretRange: [0, 4] });
    expect(six.stringSpacing).toBe(34);
    expect(six.width).toBe(26 + 5 * 34 + 20);
  });
});

describe('a four-line tab', () => {
  it('draws four staff lines and a name for each, bottom line first', () => {
    const geometry = createTabGeometry({ bars: 1, timeSignature: [4, 4], stringCount: 4 });
    render(<TabStaff riff={ukuleleRiff} geometry={geometry} />);

    expect(screen.getAllByTestId(/^staff-line-/)).toHaveLength(4);
    expect(geometry.yForString(0)).toBeGreaterThan(geometry.yForString(3));
    expect(() => geometry.yForString(4)).toThrow('String index out of range');
  });

  it('puts G C E A in the names column, level with the lines', () => {
    const geometry = createTabGeometry({ bars: 1, timeSignature: [4, 4], stringCount: 4 });
    render(<TabStringNames geometry={geometry} names={UKULELE.stringNames} />);

    expect([0, 1, 2, 3].map((index) => screen.getByTestId(`string-label-${index}`).textContent)).toEqual([
      'G',
      'C',
      'E',
      'A',
    ]);
    expect(screen.queryByTestId('string-label-4')).toBeNull();
  });

  it('is built by TabView from the riff\'s own instrument: four lines, G C E A', () => {
    render(<TabView riff={ukuleleRiff} stringSpacing={30} />);

    expect(screen.getAllByTestId(/^staff-line-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/^string-label-/).map((label) => label.textContent)).toEqual(['G', 'C', 'E', 'A']);
    expect(screen.getAllByTestId(/^tab-note-/)).toHaveLength(2);
  });

  it('fills the room the card has with fewer lines: each one is further apart', () => {
    expect(stringSpacingForHeight(240, 4)).toBeGreaterThan(stringSpacingForHeight(240, 6));
    expect(stringSpacingForHeight(240)).toBe(stringSpacingForHeight(240, 6));
  });
});

describe('a ukulele chord diagram', () => {
  const c = getChord('uke-C');
  const g = getChord('uke-G');
  if (c === undefined || g === undefined) throw new Error('ukulele chords missing');

  it('colours each dot by the note it is on the ukulele\'s tuning: C is the A string at fret 3, a C', () => {
    const { markers, openStrings, mutedStrings } = chordShapeToFretboard(c);

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ stringIndex: 3, fret: 3, label: '3', color: noteColor('C') });
    expect(openStrings).toEqual([0, 1, 2]);
    expect(mutedStrings).toEqual([]);
  });

  it('colours G\'s dots as D, G and B, not as the guitar\'s notes at the same strings and frets', () => {
    const { markers } = chordShapeToFretboard(g);
    expect(markers.map((marker) => marker.color)).toEqual([noteColor('D'), noteColor('G'), noteColor('B')]);
  });

  it('draws as a four-string diagram when handed the instrument', () => {
    const diagram = chordShapeToFretboard(g);
    render(
      <Fretboard
        instrument={UKULELE}
        orientation="vertical"
        fretRange={diagram.fretRange}
        markers={diagram.markers}
        mutedStrings={diagram.mutedStrings}
        openStrings={diagram.openStrings}
        labelMode="custom"
        ariaLabel="G chord diagram"
      />,
    );

    expect(screen.getAllByTestId(/^string-\d$/)).toHaveLength(4);
    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(3);
    // G is open on the first string.
    expect(screen.getByTestId('open-s0')).toBeInTheDocument();
  });
});
