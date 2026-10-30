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
});
