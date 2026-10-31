/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { LessonStep, Visual } from '@/content';
import { CHORDS } from '@/content';
import { chordStrings, chordVoicing, STANDARD_TUNING } from '@/music';
import { NOTE_COLORS } from '@/render/noteColors';
import { fakeEngine } from '../testkit';
import { ExplainStep } from './ExplainStep';

// The real drawings arrive from two other workstreams; these tests must not care which exist.
vi.mock('../illustrations', () => ({
  illustrationFor: (name: string) =>
    name === 'string-order' ? () => <svg role="img" aria-label="Six strings, thick to thin" /> : undefined,
}));

type Explain = Extract<LessonStep, { kind: 'explain' }>;

function card(overrides: Partial<Explain> = {}): Explain {
  return {
    kind: 'explain',
    headline: 'Six strings, thick to thin',
    visual: { kind: 'illustration', name: 'string-order' },
    points: ['String **6** is the thickest.', 'String **1** is the thinnest.'],
    ...overrides,
  };
}

function show(step: Explain, engine = fakeEngine()) {
  render(<ExplainStep step={step} engine={engine} />);
  return engine;
}

describe('ExplainStep', () => {
  it('shows the headline, then the points in order', () => {
    show(card());
    expect(screen.getByRole('heading', { level: 2, name: 'Six strings, thick to thin' })).toBeInTheDocument();
    const points = screen.getAllByTestId('explain-point');
    expect(points).toHaveLength(2);
    expect(points[0]).toHaveTextContent('1String 6 is the thickest.');
    expect(points[1]).toHaveTextContent('2String 1 is the thinnest.');
    expect(screen.getByRole('list', { name: 'Key points' })).toBeInTheDocument();
  });

  it('puts the picture before the words', () => {
    show(card());
    const article = screen.getByTestId('step-explain');
    expect(article.firstElementChild).toBe(screen.getByTestId('explain-visual'));
  });

  it('gives a lone point a dot, not a lonely "1"', () => {
    show(card({ points: ['Just the one idea.'] }));
    expect(screen.getByTestId('explain-point')).toHaveTextContent(/^Just the one idea\.$/);
  });

  it('renders the markup in the headline, points, tip and mistake', () => {
    show(
      card({
        headline: 'Play ==two notes== of Em (Mi minor)',
        points: ['Fret **3** is G (Sol).'],
        tip: 'Hear it: ==slowly==.',
        warn: 'Never **rush** B (Si).',
      }),
    );
    const root = screen.getByTestId('step-explain');
    expect(root.querySelectorAll('mark')).toHaveLength(2);
    expect(root.querySelectorAll('strong')).toHaveLength(2);
    expect(Array.from(root.querySelectorAll<HTMLElement>('[data-note-chip]'), (c) => c.dataset.noteChip)).toEqual([
      'Em',
      'G',
      'B',
    ]);
    // Heard as the author wrote it.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Play two notes of Em (Mi minor)');
  });

  it('shows a tip as a labelled callout, and no callout when there is none', () => {
    const { unmount } = render(<ExplainStep step={card({ tip: 'Keep your thumb behind the neck.' })} engine={fakeEngine()} />);
    const tip = screen.getByTestId('explain-tip');
    expect(tip).toHaveAttribute('role', 'note');
    expect(tip).toHaveTextContent('Tip');
    expect(tip).toHaveTextContent('Keep your thumb behind the neck.');
    expect(screen.queryByTestId('explain-warn')).not.toBeInTheDocument();
    unmount();

    show(card());
    expect(screen.queryByTestId('explain-tip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('explain-warn')).not.toBeInTheDocument();
  });

  it('shows a mistake as a red "Common mistake" callout, after the tip', () => {
    show(card({ tip: 'A tip.', warn: 'Pressing in the middle of the gap buzzes.' }));
    const warn = screen.getByTestId('explain-warn');
    expect(warn).toHaveTextContent('Common mistake');
    expect(warn).toHaveTextContent('Pressing in the middle of the gap buzzes.');
    expect(warn).toHaveClass('bg-bad/10', '[--rich-strong:var(--color-bad)]');
    expect(warn).toHaveTextContent('Common mistake');
    const tip = screen.getByTestId('explain-tip');
    expect(tip.compareDocumentPosition(warn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps amber for the one thing to tap: a tip is a step up in tone, not a colour', () => {
    show(card({ tip: 'A tip.', warn: 'A mistake.' }));
    for (const id of ['explain-tip', 'explain-warn']) {
      const callout = screen.getByTestId(id);
      expect(callout.className).not.toMatch(/accent/);
      // Sentence case, no tracked capitals.
      expect(callout.querySelector('p')?.className).not.toMatch(/uppercase|tracking-/);
    }
    expect(screen.getByTestId('explain-tip')).toHaveClass('bg-surface-2');
  });

  it('brings each element in 80ms after the one before, picture first', () => {
    show(card({ points: ['One.', 'Two.', 'Three.'], tip: 'Tip.', warn: 'Warn.' }));
    const delay = (el: HTMLElement) => el.style.getPropertyValue('--delay');
    expect(screen.getByTestId('explain-visual')).toHaveClass('explain-pop');
    expect(delay(screen.getByRole('heading', { level: 2 }))).toBe('80ms');
    expect(screen.getAllByTestId('explain-point').map(delay)).toEqual(['160ms', '240ms', '320ms']);
    expect(delay(screen.getByTestId('explain-tip'))).toBe('400ms');
    expect(delay(screen.getByTestId('explain-warn'))).toBe('480ms');
  });

  it('turns every entrance animation off under prefers-reduced-motion', () => {
    // Vitest stubs CSS imports, so read the stylesheet itself.
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    for (const name of ['.explain-pop', '.explain-rise', '.note-ping', '.lesson-step-in']) {
      expect(block).toContain(name);
    }
    expect(block).toMatch(/animation:\s*none/);
  });
});

describe('ExplainStep visuals', () => {
  describe('illustration', () => {
    it('draws the registered illustration', () => {
      show(card());
      expect(screen.getByRole('img', { name: 'Six strings, thick to thin' })).toBeInTheDocument();
      expect(screen.getByTestId('visual-illustration')).toHaveAttribute('data-illustration', 'string-order');
      expect(screen.queryByTestId('illustration-missing')).not.toBeInTheDocument();
    });

    it('holds the place of an illustration that is not drawn yet, naming it', () => {
      show(card({ visual: { kind: 'illustration', name: 'guitar-parts' } }));
      const missing = screen.getByTestId('illustration-missing');
      expect(missing).toHaveTextContent('guitar-parts');
      expect(missing).toHaveTextContent(/illustration coming/i);
      // The words still show: a missing picture must not take the lesson down.
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('neck', () => {
    const neck = (overrides: Partial<Extract<Visual, { kind: 'neck' }>> = {}): Visual => ({
      kind: 'neck',
      fretRange: [0, 5],
      dots: [
        { stringIndex: 0, fret: 3 },
        { stringIndex: 1, fret: 2, label: 'solfege' },
        { stringIndex: 2, fret: 2, label: '3' },
        { stringIndex: 3, fret: 0, label: 'none' },
      ],
      ...overrides,
    });

    it('labels dots by their note, their solfège, a finger number or nothing', () => {
      show(card({ visual: neck() }));
      expect(screen.getByTestId('marker-s0f3')).toHaveTextContent('G');
      expect(screen.getByTestId('marker-s1f2')).toHaveTextContent('Si');
      expect(screen.getByTestId('marker-s2f2')).toHaveTextContent('3');
      expect(screen.getByTestId('marker-s3f0')).toHaveTextContent('');
    });

    it('colours every dot by the note it is', () => {
      show(card({ visual: neck() }));
      const fill = (testId: string) => screen.getByTestId(testId).previousElementSibling?.getAttribute('fill');
      expect(fill('marker-s0f3')).toBe(NOTE_COLORS.G); // low E string, fret 3
      expect(fill('marker-s1f2')).toBe(NOTE_COLORS.B); // A string, fret 2
      expect(fill('marker-s2f2')).toBe(NOTE_COLORS.E); // D string, fret 2
    });

    it('rings an open string in its note colour instead of filling it', () => {
      show(card({ visual: neck() }));
      const ring = screen.getByTestId('marker-s3f0').previousElementSibling;
      expect(ring?.getAttribute('fill')).toBe('none');
      expect(ring?.getAttribute('stroke')).toBe(NOTE_COLORS.G); // open G string
    });

    it('draws highlighted strings bright and fades the rest', () => {
      show(card({ visual: neck({ highlightStrings: [1] }) }));
      expect(screen.getByTestId('string-1')).toHaveAttribute('data-state', 'highlighted');
      expect(screen.getByTestId('string-glow-1')).toBeInTheDocument();
      expect(screen.getByTestId('string-0')).toHaveAttribute('data-state', 'dimmed');
      expect(screen.getByTestId('string-5')).toHaveAttribute('data-state', 'dimmed');
    });

    it('leaves every string alone when none is highlighted', () => {
      show(card({ visual: neck() }));
      expect(screen.getByTestId('string-0')).not.toHaveAttribute('data-state');
      expect(screen.queryByTestId('string-glow-0')).not.toBeInTheDocument();
    });

    it('plays the fret you tap on its own string when tapToHear is on', () => {
      const engine = show(card({ visual: neck({ tapToHear: true }) }));
      // Low E string, fret 3: G2 is MIDI 43.
      fireEvent.click(screen.getByTestId('cell-s0f3'));
      expect(engine.playNote).toHaveBeenCalledWith(43, { stringIndex: 0 });
      // The B string, fret 1: C4 is 60.
      fireEvent.click(screen.getByTestId('cell-s4f1'));
      expect(engine.playNote).toHaveBeenLastCalledWith(60, { stringIndex: 4 });
      expect(screen.getByTestId('neck-heard')).toHaveTextContent('C (Do)');
      expect(screen.getByTestId('neck-heard')).toHaveTextContent('string 2, fret 1');
    });

    it('is only a picture when tapToHear is off', () => {
      const engine = show(card({ visual: neck() }));
      expect(screen.queryByTestId('cell-s0f3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('neck-heard')).not.toBeInTheDocument();
      expect(engine.playNote).not.toHaveBeenCalled();
    });

    it('gives the board a little less height on a phone-height screen', () => {
      const tall = neck({ tapToHear: true });
      const widthOn = (shortScreen: boolean) => {
        const original = window.matchMedia;
        window.matchMedia = vi.fn().mockReturnValue({
          matches: shortScreen,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        });
        const { unmount } = render(<ExplainStep step={card({ visual: tall })} engine={fakeEngine()} />);
        const wrapper = screen.getByTestId('neck').firstElementChild as HTMLElement;
        const width = Number.parseFloat(wrapper.style.maxWidth);
        unmount();
        window.matchMedia = original;
        return width;
      };
      expect(widthOn(true)).toBeLessThan(widthOn(false));
    });

    it('describes the neck for a screen reader', () => {
      show(card({ visual: neck() }));
      expect(screen.getByRole('img', { name: /Guitar neck, frets 0 to 5\. G \(Sol\) on string 6, fret 3/ })).toBeInTheDocument();
    });
  });

  describe('chords', () => {
    const chords = (ids: string[]): Visual => ({ kind: 'chords', chordIds: ids });

    it('shows each chord with its name, its solfège name and its diagram', () => {
      show(card({ visual: chords(['A-open', 'Am-open']) }));
      const a = screen.getByTestId('chord-tile-A-open');
      const am = screen.getByTestId('chord-tile-Am-open');
      expect(a).toHaveTextContent('A');
      expect(a).toHaveTextContent('La major');
      expect(am).toHaveTextContent('Am');
      expect(am).toHaveTextContent('La minor');
      expect(within(a).getByRole('img', { name: 'A chord diagram', hidden: true })).toBeInTheDocument();
      expect(within(am).getByRole('img', { name: 'Am chord diagram', hidden: true })).toBeInTheDocument();
    });

    it('colours the name by its root note and the finger dots by their notes', () => {
      show(card({ visual: chords(['Am-open']) }));
      const tile = screen.getByTestId('chord-tile-Am-open');
      expect(within(tile).getByText('Am')).toHaveStyle({ color: NOTE_COLORS.A });
      // Am: finger 1 on the B string, fret 1 is C.
      const dot = within(tile).getByTestId('marker-s4f1').previousElementSibling;
      expect(dot?.getAttribute('fill')).toBe(NOTE_COLORS.C);
    });

    it('strums exactly the strings the chord uses when you tap it', () => {
      const engine = show(card({ visual: chords(['A-open', 'Am-open']) }));
      const am = CHORDS.find((chord) => chord.id === 'Am-open');
      if (am === undefined) throw new Error('fixture chord missing');

      fireEvent.click(screen.getByTestId('chord-tile-Am-open'));
      expect(engine.strum).toHaveBeenCalledTimes(1);
      expect(engine.strum).toHaveBeenCalledWith(chordVoicing(am, STANDARD_TUNING), { strings: chordStrings(am) });
      expect(screen.getByTestId('chord-tile-Am-open')).toHaveAttribute('data-playing', 'true');
      expect(screen.getByTestId('chord-tile-A-open')).not.toHaveAttribute('data-playing');
    });

    it('names the chord and says it can be tapped, for a screen reader', () => {
      show(card({ visual: chords(['Em-open']) }));
      expect(screen.getByRole('button', { name: /Em, Mi minor\. Notes: E \(Mi\), G \(Sol\), B \(Si\)\. Tap to strum it\./ })).toBeInTheDocument();
    });

    it('fits three chords side by side', () => {
      show(card({ visual: chords(['G-open', 'C-open', 'D-open']) }));
      expect(screen.getAllByTestId(/^chord-tile-/)).toHaveLength(3);
    });

    it('skips a chord id it does not know instead of breaking the card', () => {
      show(card({ visual: chords(['Am-open', 'no-such-chord']) }));
      expect(screen.getAllByTestId(/^chord-tile-/)).toHaveLength(1);
    });
  });

  describe('notes', () => {
    const notes = (list: string[]): Visual => ({ kind: 'notes', notes: list });

    it('shows a big bubble per note: the letter inside, the solfège under, in its colour', () => {
      show(card({ visual: notes(['E', 'G', 'B']) }));
      const bubbles = [0, 1, 2].map((i) => screen.getByTestId(`note-bubble-${i}`));
      expect(bubbles.map((b) => b.dataset.note)).toEqual(['E', 'G', 'B']);
      expect(bubbles[0]).toHaveTextContent('EMi');
      expect(bubbles[1]).toHaveTextContent('GSol');
      expect(bubbles[2]).toHaveTextContent('BSi');
      expect(bubbles[0]?.lastElementChild).toHaveStyle({ color: NOTE_COLORS.E });
      expect(bubbles[2]?.lastElementChild).toHaveStyle({ color: NOTE_COLORS.B });
    });

    it('plays the note you tap, climbing the way the row reads', () => {
      const engine = show(card({ visual: notes(['A', 'B', 'C']) }));
      fireEvent.click(screen.getByTestId('note-bubble-0'));
      expect(engine.playNote).toHaveBeenLastCalledWith(57);
      fireEvent.click(screen.getByTestId('note-bubble-2'));
      expect(engine.playNote).toHaveBeenLastCalledWith(60);
      expect(screen.getByTestId('note-bubble-2')).toHaveAttribute('data-playing', 'true');
    });

    it('lets a sharp keep its accidental', () => {
      show(card({ visual: notes(['F#']) }));
      expect(screen.getByTestId('note-bubble-0')).toHaveAttribute('data-note', 'F#');
      expect(screen.getByTestId('note-bubble-0')).toHaveTextContent('F#Fa#');
    });

    it('lays out a long list in even rows', () => {
      show(card({ visual: notes(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']) }));
      const grid = screen.getByTestId('note-bubble-0').parentElement;
      expect(grid?.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    });

    it('labels each bubble for a screen reader', () => {
      show(card({ visual: notes(['E']) }));
      expect(screen.getByRole('button', { name: 'E (Mi). Tap to hear it.' })).toBeInTheDocument();
    });
  });
});
