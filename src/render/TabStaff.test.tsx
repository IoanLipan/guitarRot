import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabStaff } from './TabStaff';
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

  it('labels the strings low to high', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getByTestId('string-label-0')).toHaveTextContent('E');
    expect(screen.getByTestId('string-label-5')).toHaveTextContent('e');
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
});
