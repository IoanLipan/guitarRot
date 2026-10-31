import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { glueSolfege, StepCaption, StepKicker } from './StepHeading';

describe('glueSolfege', () => {
  it('keeps a note and its solfège on one line', () => {
    expect(glueSolfege('E (Mi), F# (Fa#) and Am (La minor)')).toBe(
      'E (Mi), F# (Fa#) and Am (La minor)',
    );
  });

  it('leaves ordinary brackets alone', () => {
    expect(glueSolfege('Strum it (gently) and Sol (Sol)')).toBe('Strum it (gently) and Sol (Sol)');
  });
});

describe('a step has no eyebrow label', () => {
  it('draws nothing for the old kicker, which survives only until DrillStep drops its last use', () => {
    expect(renderToStaticMarkup(createElement(StepKicker, null, 'Quick check'))).toBe('');
  });

  it('draws a caption as the step\'s own heading line: body type, a size down under tight:', () => {
    const html = renderToStaticMarkup(createElement(StepCaption, null, 'Strum all six strings.'));
    expect(html).toContain('Strum all six strings.');
    expect(html).toContain('text-lesson');
    expect(html).toContain('tight:text-body');
    expect(html).not.toMatch(/uppercase|tracking-/);
  });
});

/**
 * The lesson screens speak in sentence case with no emoji and no eyebrows.
 * Not scanned: DrillStep and PlayerPanel, which belong to the players, and
 * the learn tab's own screens (Course, Explore, Tuner), which are not lessons.
 */
describe('the lesson screens, as written', () => {
  const ROOT = join(__dirname, '..', '..');
  const OTHERS = ['DrillStep.tsx', 'PlayerPanel.tsx'];

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
    });
  }

  const files = [
    join(ROOT, 'learn', 'LessonView.tsx'),
    join(ROOT, 'app', 'AppShell.tsx'),
    ...sources(join(ROOT, 'learn', 'steps')).filter((file) => !OTHERS.some((other) => file.endsWith(sep + other))),
    ...sources(join(ROOT, 'learn', 'illustrations')),
  ];

  const lines = files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((text, index) => ({ at: `${relative(ROOT, file)}:${index + 1}`, text }))
      // Comments may talk about all of it; only code draws it.
      .filter(({ text }) => !/^\s*(\/\/|\/?\*)/.test(text)),
  );

  it('covers every lesson file it should', () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((file) => file.endsWith('CheckStep.tsx'))).toBe(true);
    expect(files.some((file) => file.endsWith('kit.tsx'))).toBe(true);
  });

  it('has no emoji anywhere', () => {
    const found = lines.filter(({ text }) => /\p{Extended_Pictographic}/u.test(text)).map(({ at }) => at);
    expect(found).toEqual([]);
  });

  it('has no tracked capitals and no monospace', () => {
    const found = lines
      .filter(({ text }) => /\buppercase\b|\btracking-(wide|wider|widest)\b|\bfont-mono\b/.test(text))
      .map(({ at }) => at);
    expect(found).toEqual([]);
  });

  it('draws nothing with a resting glow or a gradient behind it', () => {
    const found = lines
      .filter(({ text }) => /gradient\(|bg-linear-|bg-gradient-|shadow-\[|backdrop-blur/.test(text))
      // The one fade that lets a scrolling step slide under the footer, and the end-screen badge's celebration.
      .filter(({ at, text }) => !(at.includes('LessonView.tsx') && /bg-linear-to-t from-ground to-transparent|rgba\(53,208,127/.test(text)))
      .map(({ at }) => at);
    expect(found).toEqual([]);
  });
});
