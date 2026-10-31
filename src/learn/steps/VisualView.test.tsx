import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Visual } from '@/content';
import { fakeEngine } from '../testkit';
import { MissingIllustration, VisualCard, VisualView } from './VisualView';

const show = (visual: Visual) => render(<VisualCard visual={visual} engine={fakeEngine()} />);

describe('the picture that has not been drawn yet', () => {
  it('names itself in plain words: no emoji, no monospace, no capitals', () => {
    render(<MissingIllustration name="some-picture" />);
    const box = screen.getByTestId('illustration-missing');
    expect(box).toHaveAttribute('aria-label', 'Illustration "some-picture" is not drawn yet');
    expect(box).toHaveTextContent('some-picture');
    expect(box).toHaveTextContent('Illustration coming soon');
    expect(box.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(box.innerHTML).not.toMatch(/font-mono|uppercase|tracking-/);
    expect(box.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

describe('the card a picture sits in', () => {
  it('is a flat tone step: no gradient, no glow, no shadow', () => {
    show({ kind: 'illustration', name: 'string-order' });
    const card = screen.getByTestId('explain-visual');
    expect(card).toHaveClass('bg-surface', 'rounded-3xl');
    expect(card.getAttribute('style') ?? '').not.toMatch(/gradient|shadow/);
    expect(card.className).not.toMatch(/shadow|gradient/);
  });

  it('keeps a drawing as wide as the card, and only holds it shorter on a short phone', () => {
    show({ kind: 'illustration', name: 'string-order' });
    const wrapper = screen.getByTestId('visual-illustration');
    // The 228px cap on every phone is gone; the vh cap is under `tight:` only, and is not 22vh.
    expect(wrapper.className).not.toContain('max-h-[228px]');
    expect(wrapper.className).not.toMatch(/(^|\s)short:/);
    expect(wrapper.className).toContain('tight:[&_svg]:max-h-[min(256px,33vh)]!');
    expect(wrapper.className).not.toContain('22vh');
  });

  it('draws a row of notes as flat bubbles, with no resting glow', () => {
    show({ kind: 'notes', notes: ['C', 'D', 'E'] });
    for (const bubble of screen.getAllByTestId(/^note-bubble-/)) {
      const disc = bubble.querySelector('[aria-hidden="true"]') as HTMLElement;
      const style = disc.getAttribute('style') ?? '';
      expect(style).not.toMatch(/gradient|box-shadow/);
      expect(style).toMatch(/background/);
    }
  });

  it('sets the note names under the bubbles in sentence case at the label size', () => {
    render(<VisualView visual={{ kind: 'notes', notes: ['C'] }} engine={fakeEngine()} />);
    const name = screen.getByTestId('note-bubble-0').querySelectorAll('[aria-hidden="true"]')[1] as HTMLElement;
    expect(name).toHaveClass('text-label');
    expect(screen.getByText('Tap a note to hear it')).toHaveClass('label');
  });
});
