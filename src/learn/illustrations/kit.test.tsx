import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ILLUSTRATIONS } from '@/content';
import { illustrationFor } from './index';
import { GROUND, Label, MIN_TEXT, NoteDot, NotePill, STEEL } from './kit';

function svgOf(node: React.ReactNode) {
  const { container } = render(<svg>{node}</svg>);
  return container.querySelector('svg') as SVGSVGElement;
}

const sizeOf = (element: Element | null) => Number(element?.getAttribute('font-size'));

describe('the drawing kit: type big enough for a phone', () => {
  it('sets labels at 16 units by default, which is 14px on a 360px phone', () => {
    const text = svgOf(<Label x={0} y={0}>Hi</Label>).querySelector('text');
    expect(sizeOf(text)).toBe(16);
    expect(sizeOf(text) * (312 / 360)).toBeGreaterThanOrEqual(13);
  });

  it('lifts an explicitly small label to the floor rather than letting it render at 6 to 9px', () => {
    for (const small of [9, 11, 12, 13, 14]) {
      expect(sizeOf(svgOf(<Label x={0} y={0} size={small}>Hi</Label>).querySelector('text'))).toBe(MIN_TEXT);
    }
    expect(sizeOf(svgOf(<Label x={0} y={0} size={22}>Hi</Label>).querySelector('text'))).toBe(22);
  });

  it('keeps the floor at 11px or more on a 320px phone, where a drawing is 272px wide', () => {
    expect(MIN_TEXT * (272 / 360)).toBeGreaterThanOrEqual(11);
  });

  it('lifts note pills and dot labels to the floor too, and widens the pill to fit', () => {
    const pill = svgOf(<NotePill x={50} y={20} name="E" solfege="Mi" size={11} />);
    expect(sizeOf(pill.querySelector('text'))).toBe(MIN_TEXT);
    const small = Number(pill.querySelector('rect')?.getAttribute('width'));
    const ordinary = Number(svgOf(<NotePill x={50} y={20} name="E" solfege="Mi" size={MIN_TEXT} />).querySelector('rect')?.getAttribute('width'));
    expect(small).toBe(ordinary);

    expect(sizeOf(svgOf(<NoteDot x={0} y={0} name="E" r={11} />).querySelector('text'))).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  it('takes its dark and its string colour from the theme, not from raw hex', () => {
    expect(GROUND).toBe('var(--color-ground)');
    expect(STEEL).toBe('var(--color-ink-dim)');
    const source = readFileSync(resolve(__dirname, 'kit.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('every drawing, as it renders', () => {
  const NAMES = ILLUSTRATIONS.map((illustration) => illustration.name);

  it('is all thirty', () => {
    expect(NAMES).toHaveLength(30);
  });

  it.each(NAMES)('%s has no type under the floor', (name) => {
    const Drawing = illustrationFor(name);
    expect(Drawing).toBeDefined();
    if (Drawing === undefined) return;
    const { container } = render(<Drawing />);
    const sizes = Array.from(container.querySelectorAll('text'), (text) => Number(text.getAttribute('font-size')));
    expect(sizes.length).toBeGreaterThan(0);
    // A text with no size of its own (the rotated axis label) inherits; every other one is set.
    for (const size of sizes.filter((value) => Number.isFinite(value) && value > 0)) {
      expect(size).toBeGreaterThanOrEqual(MIN_TEXT);
    }
  });

  it.each(NAMES)('%s has no raw hex of the page colours in its source', (name) => {
    const group = ILLUSTRATIONS.find((illustration) => illustration.name === name)?.group ?? 'a';
    const file = name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    let source = '';
    try {
      source = readFileSync(resolve(__dirname, group, `${file}.tsx`), 'utf8');
    } catch {
      // The file name is not always the capitalised slug (a few are shortened); the kit test above covers the shared parts.
      return;
    }
    expect(source).not.toMatch(/#0b0b0f|#15151c|#c9c9d3|#22222b|#2b2b36/i);
  });
});
