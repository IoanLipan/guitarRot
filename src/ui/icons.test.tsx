import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as icons from './icons';

const ICONS = Object.entries(icons).filter(([name]) => name.endsWith('Icon')) as [
  string,
  (props: icons.IconProps) => React.JSX.Element,
][];

describe('icon set', () => {
  it('has the icons the app draws its buttons with', () => {
    const names = ICONS.map(([name]) => name);
    for (const expected of [
      'ArrowLeftIcon',
      'ArrowRightIcon',
      'ChevronRightIcon',
      'CloseIcon',
      'CheckIcon',
      'PlayIcon',
      'PauseIcon',
      'StopIcon',
      'NoteIcon',
      'MetronomeIcon',
      'RepeatIcon',
      'ShareIcon',
      'GearIcon',
      'MicIcon',
      'SpeakerIcon',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it.each(ICONS)('%s is a decorative 24px currentColor round-stroke drawing', (_name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    // The button carries the name; the picture must not be read out as well.
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    // Nothing hard-coded: the button's text colour is the icon's colour.
    for (const element of svg!.querySelectorAll('[stroke], [fill]')) {
      for (const attribute of ['stroke', 'fill']) {
        const value = element.getAttribute(attribute);
        if (value !== null) expect(['currentColor', 'none']).toContain(value);
      }
    }
  });

  it('draws at the size it is asked for, and passes other props through', () => {
    const { container } = render(<icons.CloseIcon size={20} className="text-ink-dim" data-testid="x" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
    expect(svg).toHaveClass('text-ink-dim');
    expect(svg).toHaveAttribute('data-testid', 'x');
  });
});

/**
 * Text glyphs used as icons (← × ▶ ♪ ✓) are drawn by whatever font the phone
 * falls back to, which is how they came out too small or weird on Android.
 * This keeps them from creeping back into the app's buttons.
 *
 * Not scanned: `songs/` (its own screens, moving over to the icon set),
 * `dev/`, and the lesson illustrations and chord diagrams, where an arrow or a
 * cross is notation inside a drawing rather than a button's icon.
 */
describe('no text glyphs as icons', () => {
  const GLYPHS = /[←→↑↓×▶▸▾▴♪♩♫↻↺✓✔✕✗✖⏸⏹↗⚙]/;
  const SKIPPED = ['songs', 'dev', 'content', 'music', 'ui', join('learn', 'illustrations'), join('render', 'Fretboard.tsx')];

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
    });
  }

  it('finds none in the app screens', () => {
    const root = join(__dirname, '..');
    const offenders: string[] = [];
    for (const file of sources(root)) {
      const local = relative(root, file);
      if (SKIPPED.some((skip) => local === skip || local.startsWith(skip + sep))) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          const code = line.trim();
          // Comments may talk about glyphs; only code draws them.
          if (/^(\/\/|\/?\*)/.test(code)) return;
          if (GLYPHS.test(code)) offenders.push(`${local}:${index + 1}: ${code}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
