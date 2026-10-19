import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NOTE_COLORS } from '@/render/noteColors';
import { NoteChip, RichText } from './RichText';

function show(text: string, onAccent = false) {
  return render(
    <p data-testid="line">
      <RichText onAccent={onAccent}>{text}</RichText>
    </p>,
  );
}

describe('RichText', () => {
  it('leaves plain text as the paragraph\'s own text', () => {
    show('Just some words.');
    const line = screen.getByTestId('line');
    expect(line).toHaveTextContent('Just some words.');
    expect(line.children).toHaveLength(0);
    // A plain option string must still be findable by its text, on the element that holds it.
    expect(screen.getByText('Just some words.')).toBe(line);
  });

  it('renders **strong** bold in the accent colour', () => {
    show('Press **just behind** the fret.');
    const strong = screen.getByText('just behind');
    expect(strong.tagName).toBe('STRONG');
    expect(strong).toHaveClass('font-extrabold');
    expect(strong.style.color).toBe('var(--rich-strong, var(--color-accent))');
    expect(screen.getByTestId('line')).toHaveTextContent('Press just behind the fret.');
  });

  it('renders ==highlighted== words on a marker stroke', () => {
    show('Pick ==one string== at a time.');
    const mark = screen.getByText('one string');
    expect(mark.tagName).toBe('MARK');
    expect(mark).toHaveClass('rich-mark');
  });

  it('renders a note as a chip in that note\'s colour', () => {
    show('The open string is E (Mi), then A (La).');
    const chips = screen.getByTestId('line').querySelectorAll<HTMLElement>('[data-note-chip]');
    expect(Array.from(chips, (chip) => chip.dataset.noteChip)).toEqual(['E', 'A']);
    expect(chips[0]).toHaveStyle({ color: NOTE_COLORS.E });
    expect(chips[1]).toHaveStyle({ color: NOTE_COLORS.A });
    // A tinted background and a coloured edge: the colour comes from the note, not a fixed theme.
    expect(chips[0]?.style.backgroundColor).not.toBe('');
    expect(chips[0]?.style.borderColor).not.toBe('');
  });

  it('keeps the original wording in the text, for screen readers and copying', () => {
    show('Play E (Mi) now, or F# (Fa#), or Am (La minor).');
    expect(screen.getByTestId('line')).toHaveTextContent('Play E (Mi) now, or F# (Fa#), or Am (La minor).');
    // The brackets are there but visually hidden: the chip shows "E | Mi".
    const brackets = screen.getByTestId('line').querySelectorAll('.sr-only');
    expect(brackets.length).toBe(6);
  });

  it('colours a sharp by its letter and a chord by its root', () => {
    show('F# (Fa#) and Am (La minor)');
    const [sharp, chord] = Array.from(screen.getByTestId('line').querySelectorAll<HTMLElement>('[data-note-chip]'));
    expect(sharp).toHaveStyle({ color: NOTE_COLORS.F });
    expect(chord).toHaveStyle({ color: NOTE_COLORS.A });
    expect(chord).toHaveTextContent('Am (La minor)');
  });

  it('never lets a chip break inside itself', () => {
    show('E (Mi)');
    expect(screen.getByTestId('line').querySelector('[data-note-chip]')).toHaveClass('whitespace-nowrap');
  });

  it('glues punctuation that follows a chip to it, so a comma never starts a line', () => {
    show('E (Mi), then more.');
    const chip = screen.getByTestId('line').querySelector('[data-note-chip]');
    const glue = chip?.parentElement;
    expect(glue?.tagName).toBe('SPAN');
    expect(glue).toHaveClass('whitespace-nowrap');
    expect(glue).toHaveTextContent('E (Mi),');
    expect(screen.getByTestId('line')).toHaveTextContent('E (Mi), then more.');
  });

  it('does not add a wrapper when a space follows the chip', () => {
    show('E (Mi) is low.');
    const chip = screen.getByTestId('line').querySelector('[data-note-chip]');
    expect(chip?.parentElement).toBe(screen.getByTestId('line'));
  });

  it('mixes all three in one sentence', () => {
    show('**Fret 3** is G (Sol): ==listen== for it.');
    const line = screen.getByTestId('line');
    expect(line.querySelector('strong')).toHaveTextContent('Fret 3');
    expect(line.querySelector('mark')).toHaveTextContent('listen');
    expect(line.querySelector('[data-note-chip="G"]')).toBeInTheDocument();
    expect(line).toHaveTextContent('Fret 3 is G (Sol): listen for it.');
  });

  it('leaves a note inside **strong** as plain text, as the markup says', () => {
    show('**E (Mi)** is low.');
    expect(screen.getByTestId('line').querySelector('[data-note-chip]')).toBeNull();
    expect(screen.getByTestId('line').querySelector('strong')).toHaveTextContent('E (Mi)');
  });

  it('draws dark chips and strokes on the amber course card', () => {
    show('Play E (Mi) and **hear** ==it==.', true);
    const line = screen.getByTestId('line');
    expect(line.querySelector('[data-note-chip]')).toHaveStyle({ color: '#0b0b0f' });
    expect(line.querySelector('strong')?.getAttribute('style') ?? '').toBe('');
    expect(line.querySelector('mark')).toHaveClass('rich-mark-dark');
  });

  it('renders nothing for an empty string', () => {
    show('');
    expect(screen.getByTestId('line')).toBeEmptyDOMElement();
  });
});

describe('NoteChip', () => {
  it('shows the letter and the solfège with the brackets only for assistive tech', () => {
    render(<NoteChip name="B" solfege="Si" />);
    const chip = document.querySelector('[data-note-chip="B"]');
    expect(chip).toHaveTextContent('B (Si)');
    expect(chip).toHaveStyle({ color: NOTE_COLORS.B });
  });
});
