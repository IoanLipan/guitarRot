import { readdirSync, readFileSync, statSync } from 'node:fs';
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
  'logo-glow',
  'shimmer',
  'answer-pop',
  'answer-shake',
  'answer-ring',
  'draw-check',
  'flash-wash',
  'bump',
  'advance-sweep',
  'halo',
  'glow-breathe',
  'morph-icon',
  'fb-dot-pop',
  'playhead-glow',
  'tuner-needle',
  'tuner-zone',
  'sheet-panel',
  'sheet-backdrop',
  'tab-indicator',
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
    const used = sources(resolve(process.cwd(), 'src'))
      .filter((path) => !path.includes(`${join('src', 'songs')}`))
      .map((path) => readFileSync(path, 'utf8'));
    expect(used.filter((text) => /\bpress\b/.test(text)).length).toBeGreaterThan(15);
    // The old per-button dip is gone from everything but the Songs tab.
    const stragglers = sources(resolve(process.cwd(), 'src'))
      .filter((path) => !path.includes(join('src', 'songs')) && !path.endsWith('.test.tsx'))
      .filter((path) => /active:scale-/.test(readFileSync(path, 'utf8')));
    expect(stragglers).toEqual([]);
  });
});
