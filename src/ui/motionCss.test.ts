import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The stylesheet is where the motion actually lives, and Vitest stubs CSS
 * imports, so these read index.css itself: the rules every animation must
 * follow, and that every animation class the screens use really exists.
 */
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));

/** The classes that exist only to animate; each must be defined in index.css and switched off under reduced motion. */
const ANIMATION_CLASSES = [
  'rise-in',
  'pop-in',
  'scale-in',
  'fill-in',
  'tab-icon-pop',
  'logo-drop',
  'answer-pop',
  'answer-shake',
  'answer-ring',
  'draw-check',
  'flash-wash',
  'bump',
  'advance-sweep',
  'halo',
  'morph-icon',
  'fb-dot-pop',
  'fb-dot-emph',
  'playhead-glow',
  'tuner-needle',
  'tuner-zone',
  'sheet-panel',
  'sheet-backdrop',
  'tab-indicator',
  // The game's moments: results, unlocks, level-ups.
  'pick-drop',
  'pick-flip',
  'stamp-in',
  'float-points',
  'toast-enter',
  'xp-pill',
  'level-draw',
  'level-fade',
  'level-punch',
  'level-disc',
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe('index.css motion', () => {
  it('defines every animation class the screens use', () => {
    for (const name of ANIMATION_CLASSES) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s{:.,\\[]`));
  });

  it('turns everything off under reduced motion: the named entrances and, as a net, every animation and transition', () => {
    expect(reduced).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*animation:\s*none\s*!important/);
    expect(reduced).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*transition:\s*none\s*!important/);
    expect(reduced).toMatch(/::view-transition-new\(\*\)/);
    for (const name of ['.rise-in', '.pop-in', '.scale-in', '.lesson-step-in']) expect(reduced).toContain(name);
  });

  it('has nothing decorative that loops: the decorative glows and the shimmer are gone, no animation repeats forever', () => {
    expect(css).not.toMatch(/\binfinite\b/);
    for (const name of ['logo-glow', 'glow-breathe', 'shimmer', 'lit-pulse', 'glow-pulse', 'shimmer-sweep']) {
      expect(css, name).not.toContain(name);
    }
  });

  it('keeps the reduced-motion block last, so nothing defined after it can switch motion back on', () => {
    const after = reduced.slice(reduced.indexOf('}', reduced.indexOf('::view-transition-new(*)')) + 1);
    expect(after).not.toMatch(/@keyframes|animation\s*:/);
  });

  it('keyframes only move transform and opacity (plus the tiny stroke draw and the old ping)', () => {
    const allowed = new Set(['transform', 'opacity', 'scale', 'stroke-dashoffset', 'box-shadow']);
    const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
    expect(keyframes.length).toBeGreaterThan(20);
    for (const [, name, body] of keyframes) {
      for (const property of String(body).matchAll(/([a-z-]+)\s*:/g)) {
        expect(allowed.has(property[1] ?? ''), `${name} animates ${property[1]}`).toBe(true);
      }
    }
  });

  it('keeps every enter between 200 and 400ms, taps under 200ms and celebrations under 900ms', () => {
    const durations = (selector: RegExp) =>
      [...(css.match(selector) ?? [])].flatMap((rule) => [...rule.matchAll(/(\d+)ms/g)].map((m) => Number(m[1])));
    for (const ms of durations(/\.(?:rise-in|pop-in|scale-in)\s*\{[^}]*\}/g).filter((value) => value > 100)) {
      if (ms < 1000) expect(ms).toBeGreaterThanOrEqual(200);
      expect(ms).toBeLessThanOrEqual(400);
    }
    expect(css).toMatch(/\.press:active[^}]*transition:\s*scale 90ms/);
    expect(css).toMatch(/\.halo\s*\{[^}]*animation:\s*halo-expand 760ms/);
  });

  it('lets the press feel be the one shared utility, applied to the main controls', () => {
    expect(css).toMatch(/\.press:active:not\(:disabled/);
    expect(css).toMatch(/scale:\s*var\(--press-scale,\s*0\.96\)/);
    const used = sources(resolve(process.cwd(), 'src')).map((path) => readFileSync(path, 'utf8'));
    expect(used.filter((text) => /\bpress\b/.test(text)).length).toBeGreaterThan(15);
    // The old per-button dip is gone everywhere, the Songs tab included.
    const stragglers = sources(resolve(process.cwd(), 'src'))
      .filter((path) => !path.endsWith('.test.tsx'))
      .filter((path) => /active:scale-/.test(readFileSync(path, 'utf8')));
    expect(stragglers).toEqual([]);
  });

  it('has the game moments finish where the element is: its own style is the end state, the keyframes only the start', () => {
    // So with the animations switched off (reduced motion, an old WebView) the picks are on screen, the badge is stamped and the toast is shown.
    for (const name of ['pick-drop', 'pick-flip', 'level-draw', 'level-fade', 'level-punch', 'level-disc']) {
      const rule = css.match(new RegExp(`\\.${name}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(rule, name).toMatch(/backwards/);
      expect(rule, name).not.toMatch(/forwards|both/);
    }
    // The two that leave on their own are visible when still: a toast shown, a pill shown.
    expect(css).toMatch(/\.toast-enter\s*\{[^}]*backwards/);
  });

  it('keeps the game celebrations under the 900ms the file promises, apart from the level-up sequence and the pill', () => {
    for (const name of ['pick-drop', 'pick-flip', 'stamp-in']) {
      const rule = css.match(new RegExp(`\\.${name}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      const ms = [...rule.matchAll(/(\d+)ms/g)].map((match) => Number(match[1]));
      expect(Math.max(...ms), name).toBeLessThanOrEqual(900);
    }
  });

  it('gives a pointer a hover state on the press utility, above :active so a press still wins', () => {
    const hover = css.indexOf('.press:hover');
    expect(hover).toBeGreaterThan(-1);
    expect(css.slice(css.lastIndexOf('@media', hover), hover)).toContain('(hover: hover)');
    expect(hover).toBeLessThan(css.indexOf('.press:active'));
  });
});

describe('index.css globals', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

  it('shows a focus ring on every control for keyboards, as a default a utility can still override', () => {
    expect(css).toMatch(/@layer base\s*\{[^@]*:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-accent\)[^}]*outline-offset:\s*2px/);
  });

  it('is a dark page that does not wait for a double tap', () => {
    expect(css).toMatch(/html\s*\{[^}]*color-scheme:\s*dark/);
    expect(css).toMatch(/html\s*\{[^}]*touch-action:\s*manipulation/);
    expect(html).toContain('<meta name="theme-color" content="#0b0b0f" />');
  });

  it('sets the app in Figtree, self-hosted with its licence, swapped in and preloaded', () => {
    expect(css).toMatch(/--font-sans:\s*"Figtree"/);
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-sans\)/);
    expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*"Figtree"[^}]*font-weight:\s*300 900[^}]*font-display:\s*swap[^}]*\/fonts\/Figtree-latin\.woff2/);
    expect(existsSync(resolve(process.cwd(), 'public/fonts/Figtree-latin.woff2'))).toBe(true);
    expect(readFileSync(resolve(process.cwd(), 'public/fonts/Figtree-OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE');
    expect(html).toMatch(/<link rel="preload" href="\/fonts\/Figtree-latin\.woff2" as="font" type="font\/woff2" crossorigin \/>/);
  });

  it('keeps the old greys out of the stylesheet: text colours come from the tokens', () => {
    expect(css).toContain('--color-ink-faint: #858593');
    expect(css).not.toContain('#5f5f6b');
  });
});
