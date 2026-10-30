import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { fadeMask, ScrollFade } from './ScrollFade';

/** jsdom has no layout: give the scroller the sizes a real one would have. */
function size(node: HTMLElement, sizes: { scrollWidth: number; clientWidth: number; scrollLeft?: number }) {
  Object.defineProperty(node, 'scrollWidth', { configurable: true, value: sizes.scrollWidth });
  Object.defineProperty(node, 'clientWidth', { configurable: true, value: sizes.clientWidth });
  node.scrollLeft = sizes.scrollLeft ?? 0;
}

describe('fadeMask', () => {
  it('is nothing when there is nothing beyond either edge', () => {
    expect(fadeMask({ start: false, end: false })).toBeUndefined();
  });

  it('fades the end only at the start of the scroll', () => {
    expect(fadeMask({ start: false, end: true })).toBe(
      'linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)',
    );
  });

  it('fades the start only once the scroll has reached the end', () => {
    expect(fadeMask({ start: true, end: false })).toBe('linear-gradient(to right, transparent 0, #000 28px, #000 100%)');
  });

  it('fades both in the middle', () => {
    expect(fadeMask({ start: true, end: true })).toBe(
      'linear-gradient(to right, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%)',
    );
  });
});

describe('ScrollFade', () => {
  it('scrolls sideways without passing the scroll on to the page, and holds its children', () => {
    render(
      <ScrollFade className="rounded-2xl">
        <p>board</p>
      </ScrollFade>,
    );

    const node = screen.getByTestId('scroll-fade');
    expect(node).toHaveClass('overflow-x-auto', 'overscroll-x-contain', 'rounded-2xl');
    expect(node).toHaveTextContent('board');
  });

  it('shows no fade at all when what is inside fits', () => {
    render(
      <ScrollFade>
        <p>board</p>
      </ScrollFade>,
    );

    const node = screen.getByTestId('scroll-fade');
    size(node, { scrollWidth: 300, clientWidth: 300 });
    fireEvent.scroll(node);

    expect(node).toHaveAttribute('data-fade-start', 'false');
    expect(node).toHaveAttribute('data-fade-end', 'false');
    expect(node.style.maskImage).toBe('');
  });

  it('fades the far edge when it is wider than its box, and the near edge once scrolled away from the start', () => {
    render(
      <ScrollFade>
        <p>board</p>
      </ScrollFade>,
    );
    const node = screen.getByTestId('scroll-fade');

    size(node, { scrollWidth: 700, clientWidth: 280, scrollLeft: 0 });
    fireEvent.scroll(node);
    expect(node).toHaveAttribute('data-fade-start', 'false');
    expect(node).toHaveAttribute('data-fade-end', 'true');

    size(node, { scrollWidth: 700, clientWidth: 280, scrollLeft: 200 });
    fireEvent.scroll(node);
    expect(node).toHaveAttribute('data-fade-start', 'true');
    expect(node).toHaveAttribute('data-fade-end', 'true');

    // At the end, the last of it is solid: nothing is left half hidden.
    size(node, { scrollWidth: 700, clientWidth: 280, scrollLeft: 420 });
    fireEvent.scroll(node);
    expect(node).toHaveAttribute('data-fade-start', 'true');
    expect(node).toHaveAttribute('data-fade-end', 'false');
  });
});
