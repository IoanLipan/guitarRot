import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ACHIEVEMENTS } from '@/progress';
import { ACHIEVEMENT_GLYPH, GLYPHS, glyphForAchievement, type GlyphName } from './glyphs';
import { LevelEmblem } from './LevelEmblem';
import { MiniPicks } from './MiniPicks';
import { CATEGORY_COLOR, darken, GOLD, lighten, LOCKED, STEEL, tierForLevel } from './materials';
import { AchievementPick, Pick } from './Pick';

const stopColors = (svg: Element) =>
  [...svg.querySelectorAll('stop')].map((stop) => stop.getAttribute('stop-color'));

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (svg === null) throw new Error('no svg rendered');
  return svg;
}

describe('Pick', () => {
  it('strikes celluloid in the colour of its category, with blotches and a light on its shoulder', () => {
    const { container } = render(<Pick tier="celluloid" category="quiz" glyph="note" />);
    const svg = svgOf(container);

    expect(svg).toHaveAttribute('data-tier', 'celluloid');
    expect(stopColors(svg)).toContain(CATEGORY_COLOR.quiz);
    // Lighter at the top-left and darker toward the rim, both mixed from the category colour.
    expect(stopColors(svg)).toContain(lighten(CATEGORY_COLOR.quiz, 0.5));
    expect(stopColors(svg)).toContain(darken(CATEGORY_COLOR.quiz, 0.4));
    expect(svg.querySelectorAll('ellipse')).toHaveLength(3);
    expect(svg.querySelector('path[stroke-linecap="round"][stroke-opacity="0.5"]')).not.toBeNull();
  });

  it.each([
    ['steel', STEEL],
    ['gold', GOLD],
  ] as const)('sweeps %s from light to dark and back, with its glyph engraved in its own ink', (tier, metal) => {
    const { container } = render(<Pick tier={tier} glyph="book" />);
    const svg = svgOf(container);

    expect(svg).toHaveAttribute('data-tier', tier);
    expect(stopColors(svg).slice(0, 4)).toEqual([...metal.stops]);
    // The engraving, and the pale copy a hair lower that is its lit lower edge.
    expect(svg.querySelectorAll(`path[fill="${metal.engrave}"]`).length).toBeGreaterThan(0);
    expect(svg.querySelectorAll(`path[fill="${metal.edge}"]`).length).toBeGreaterThan(0);
    // No plastic blotches on metal.
    expect(svg.querySelectorAll('ellipse')).toHaveLength(0);
  });

  it('draws a pick not earned yet as smoked glass: flat, a 1.5px rim, and only the outline of its glyph', () => {
    const { container } = render(<Pick tier="gold" glyph="book" locked />);
    const svg = svgOf(container);

    expect(svg).toHaveAttribute('data-tier', 'locked');
    const body = svg.querySelector(`path[fill="${LOCKED.fill}"]`);
    expect(body).not.toBeNull();
    const rim = svg.querySelector(`path[stroke="${LOCKED.rim}"]`);
    expect(rim).toHaveAttribute('stroke-width', '1.5');
    expect(rim).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    // Nothing is filled from a gradient, and the glyph is stroke only.
    expect(svg.querySelector('path[fill^="url("]')).toBeNull();
    const glyphPaths = [...svg.querySelectorAll(`path[stroke="${LOCKED.glyph}"]`)];
    expect(glyphPaths.length).toBeGreaterThan(0);
    for (const path of glyphPaths) expect(path).toHaveAttribute('fill', 'none');
  });

  it('draws a numeral glyph as text in the display face, and outlines it when locked', () => {
    const earned = render(<Pick tier="steel" glyph="num-25" />);
    const text = earned.container.querySelector('text');
    expect(text).toHaveTextContent('25');
    expect(text).toHaveClass('font-display');
    earned.unmount();

    const locked = render(<Pick tier="steel" glyph="num-25" locked />);
    const outline = locked.container.querySelector('text');
    expect(outline).toHaveAttribute('fill', 'none');
    expect(outline).toHaveAttribute('stroke', LOCKED.glyph);
  });

  it('gives every instance its own gradient ids, so two picks on one screen cannot borrow each other', () => {
    const { container } = render(
      <>
        <Pick tier="gold" glyph="play" />
        <Pick tier="gold" glyph="play" />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is decorative until it is given a name, then a labelled image', () => {
    const { container, rerender } = render(<Pick tier="gold" glyph="play" />);
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true');
    expect(svgOf(container)).not.toHaveAttribute('role');

    rerender(<Pick tier="gold" glyph="play" label="First song, earned" />);
    expect(screen.getByRole('img', { name: 'First song, earned' })).toBeInTheDocument();
  });

  it('keeps the pick the logo is: its proportions follow the shape, whatever the width', () => {
    const { container } = render(<Pick tier="gold" size={100} />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('width', '100');
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(100);
  });

  it('draws itself on when asked: an outline that travels and a glyph that punches in', () => {
    const { container } = render(<Pick tier="steel" glyph="level-5" draw />);
    expect(container.querySelector('path.level-draw')).toHaveAttribute('pathLength', '1');
    expect(container.querySelector('g.level-punch')).not.toBeNull();
  });
});

describe('the glyphs', () => {
  it('has an engraved glyph for every one of the achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(25);
    for (const achievement of ACHIEVEMENTS) {
      const name = ACHIEVEMENT_GLYPH[achievement.id];
      expect(name, achievement.id).toBeDefined();
      expect(GLYPHS[name as GlyphName].length, achievement.id).toBeGreaterThan(0);
      expect(glyphForAchievement(achievement.id)).toBe(name);
    }
  });

  it('draws each glyph as shapes, at every tier and locked', () => {
    for (const name of Object.keys(GLYPHS) as GlyphName[]) {
      for (const props of [{ tier: 'celluloid' as const }, { tier: 'steel' as const }, { tier: 'gold' as const, locked: true }]) {
        const { container, unmount } = render(<Pick {...props} glyph={name} />);
        const drawn = container.querySelectorAll('g[transform] path, g[transform] text');
        expect(drawn.length, `${name} ${props.tier}`).toBeGreaterThan(0);
        unmount();
      }
    }
  });

  it('sets the streak and level numerals as numbers, and the song counts as one, two and three records', () => {
    const text = (name: GlyphName) =>
      GLYPHS[name].flatMap((shape) => (shape.kind === 'text' ? [shape.text] : []));
    expect(text('num-10')).toEqual(['10']);
    expect(text('num-25')).toEqual(['25']);
    expect(text('num-50')).toEqual(['50']);
    expect(text('level-5')).toEqual(['5']);
    expect(text('level-10')).toEqual(['10']);
    // A record is a rim and a label; the ones behind it are drawn as bare arcs.
    const labels = (name: GlyphName) => GLYPHS[name].filter((shape) => shape.kind === 'fill').length;
    expect([labels('discs-1'), labels('discs-2'), labels('discs-3')]).toEqual([1, 1, 1]);
    expect([GLYPHS['discs-1'].length, GLYPHS['discs-2'].length, GLYPHS['discs-3'].length]).toEqual([2, 3, 4]);
  });
});

describe('AchievementPick', () => {
  it('takes its tier, colour and glyph from the catalogue, and goes smoked until earned', () => {
    const { container, rerender } = render(<AchievementPick id="songs-30" earned />);
    expect(svgOf(container)).toHaveAttribute('data-tier', 'gold');

    rerender(<AchievementPick id="first-song" earned />);
    expect(svgOf(container)).toHaveAttribute('data-tier', 'celluloid');
    expect(stopColors(svgOf(container))).toContain(CATEGORY_COLOR.songs);

    rerender(<AchievementPick id="first-song" earned={false} />);
    expect(svgOf(container)).toHaveAttribute('data-tier', 'locked');
  });
});

describe('MiniPicks', () => {
  it.each([0, 1, 2, 3])('shows %i of three struck in gold and the rest smoked', (earned) => {
    const { container } = render(<MiniPicks filled={earned} />);
    const picks = [...container.querySelectorAll('svg')];
    expect(picks).toHaveLength(3);
    expect(picks.filter((pick) => pick.getAttribute('data-tier') === 'gold')).toHaveLength(earned);
    expect(picks.filter((pick) => pick.getAttribute('data-tier') === 'locked')).toHaveLength(3 - earned);
    expect(screen.getByRole('img', { name: `${earned} of 3 picks` })).toBeInTheDocument();
  });

  it('never shows more than three or fewer than none', () => {
    render(<MiniPicks filled={9} />);
    expect(screen.getByRole('img', { name: '3 of 3 picks' })).toBeInTheDocument();
  });

  it('drops only the earned ones in, one after another', () => {
    const { container } = render(<MiniPicks filled={2} drop startDelayMs={1000} />);
    const picks = [...container.querySelectorAll('svg')];
    expect(picks.map((pick) => pick.classList.contains('pick-drop'))).toEqual([true, true, false]);
    expect(picks.slice(0, 2).map((pick) => pick.style.getPropertyValue('--delay'))).toEqual(['1000ms', '1220ms']);
  });
});

describe('LevelEmblem', () => {
  it('engraves the level number into a pick, named for the level and its rank', () => {
    const { container } = render(<LevelEmblem level={3} />);
    expect(container.querySelector('text')).toHaveTextContent('3');
    expect(screen.getByRole('img', { name: 'Level 3, Riff Apprentice' })).toBeInTheDocument();
  });

  it('climbs from plastic to steel at level 5 and gold at 10', () => {
    expect([1, 4, 5, 9, 10, 40].map(tierForLevel)).toEqual(['celluloid', 'celluloid', 'steel', 'steel', 'gold', 'gold']);
    const { container, rerender } = render(<LevelEmblem level={4} />);
    expect(svgOf(container)).toHaveAttribute('data-tier', 'celluloid');
    rerender(<LevelEmblem level={12} />);
    expect(svgOf(container)).toHaveAttribute('data-tier', 'gold');
    expect(container.querySelector('text')).toHaveTextContent('12');
  });

  it('puts the rank title under it when asked, in the display face', () => {
    render(<LevelEmblem level={10} showTitle />);
    expect(screen.getByText('Road Legend')).toHaveClass('font-display');
  });
});

describe('the materials', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

  it('are the same numbers in the stylesheet tokens and in the code that mixes shades from them', () => {
    for (const [category, hex] of Object.entries(CATEGORY_COLOR)) {
      expect(css, category).toContain(`--color-${category}: ${hex};`);
    }
    STEEL.stops.forEach((hex, index) => expect(css).toContain(`--color-steel-${index + 1}: ${hex};`));
    GOLD.stops.forEach((hex, index) => expect(css).toContain(`--color-gold-${index + 1}: ${hex};`));
    expect(css).toContain(`--color-steel-engrave: ${STEEL.engrave};`);
    expect(css).toContain(`--color-gold-engrave: ${GOLD.engrave};`);
    expect(css).toContain(`--color-locked: ${LOCKED.fill};`);
    expect(css).toContain(`--color-locked-rim: ${LOCKED.rim};`);
    expect(css).toContain(`--color-locked-glyph: ${LOCKED.glyph};`);
  });

  it('are served the display face self-hosted, with its licence beside it', () => {
    expect(css).toMatch(/@font-face\s*\{[^}]*Big Shoulders Display[^}]*font-display:\s*swap/);
    expect(css).toMatch(/\/fonts\/BigShouldersDisplay-latin\.woff2/);
    expect(readFileSync(resolve(process.cwd(), 'public/fonts/OFL.txt'), 'utf8')).toContain('SIL Open Font License');
  });

  it('mix lights and darks that stay valid colours', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(lighten('#3ddc84', 1)).toBe('#ffffff');
    expect(darken('#3ddc84', 1)).toBe('#000000');
  });
});
