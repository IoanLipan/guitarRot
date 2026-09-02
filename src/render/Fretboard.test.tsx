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
      'G2, string 6, fret 3',
    );
  });
});
