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
      'SearchIcon',
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
 * Not scanned: `dev/`, and the lesson illustrations and chord diagrams, where an arrow or a
 * cross is notation inside a drawing rather than a button's icon.
 */
describe('no text glyphs as icons', () => {
  const GLYPHS = /[←→↑↓×▶▸▾▴♪♩♫↻↺✓✔✕✗✖⏸⏹↗⚙]/;
  const SKIPPED = ['dev', 'content', 'music', 'ui', join('learn', 'illustrations'), join('render', 'Fretboard.tsx')];

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

/**
 * The game surfaces (src/game, and the run screens in src/quiz) have no icon
 * font and no emoji: every mark in them is an SVG drawn in the app's own style.
 * The scan above already walks them (`game` is not on its skip list); this is
 * the stricter one for new directories. It also rejects the things the design
 * plan rules out there: pictographs and dingbats (stars, ticks, flames),
 * arrows typed as characters, middle-dot "A · B · C" strings, and tracked
 * all-caps labels.
 */
describe('the game surfaces', () => {
  const ROOT = join(__dirname, '..');
  /** Every directory that holds only game surfaces. */
  const GAME_DIRS = ['game'];
  /** Files of other directories that are game surfaces too (the rest of those directories is older code). */
  const GAME_FILES = [
    join('quiz', 'ModeSelect.tsx'),
    join('quiz', 'QuizRun.tsx'),
    join('quiz', 'RunHeader.tsx'),
    join('quiz', 'RunResults.tsx'),
    join('quiz', 'difficultyCopy.ts'),
  ];
  const PICTOGRAPHS = /[\p{Extended_Pictographic}←-⇿⌀-⏿■-➿⬀-⯿·•★☆]/u;
  const TRACKED_CAPS = /\buppercase\b|\btracking-(wide|wider|widest)\b/;

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
    });
  }

  const files = [...GAME_DIRS.flatMap((dir) => sources(join(ROOT, dir))), ...GAME_FILES.map((file) => join(ROOT, file))];

  /** The code of a file, without the lines that only talk. */
  function codeLines(file: string): { line: number; code: string }[] {
    return readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((text, index) => {
        const code = text.trim();
        return /^(\/\/|\/?\*|\{\/\*)/.test(code) ? [] : [{ line: index + 1, code }];
      });
  }

  it('actually reaches the files it is about', () => {
    expect(files.length).toBeGreaterThan(15);
    for (const name of ['Pick.tsx', 'glyphs.ts', 'YouTab.tsx', 'AwardLayer.tsx']) {
      expect(files.some((file) => file.endsWith(name)), name).toBe(true);
    }
    expect(GAME_DIRS.every((dir) => readdirSync(join(ROOT, dir)).length > 0)).toBe(true);
  });

  it('draws no emoji, dingbat, typed arrow, middle dot or bullet in any of them', () => {
    const offenders = files.flatMap((file) =>
      codeLines(file)
        .filter(({ code }) => PICTOGRAPHS.test(code) || /[←→↑↓×▶▸▾▴♪♩♫↻↺✓✔✕✗✖⏸⏹↗⚙]/.test(code))
        .map(({ line, code }) => `${relative(ROOT, file)}:${line}: ${code}`),
    );
    expect(offenders).toEqual([]);
  });

  it('sets no label in tracked all-caps: sentence case everywhere', () => {
    const offenders = files.flatMap((file) =>
      codeLines(file)
        .filter(({ code }) => TRACKED_CAPS.test(code))
        .map(({ line, code }) => `${relative(ROOT, file)}:${line}: ${code}`),
    );
    expect(offenders).toEqual([]);
  });

  it('is a scan that would catch one, if there were one', () => {
    for (const bad of ['Flawless ★', 'Streak \u{1F525}', 'A · B', 'Go →', 'tick ✓']) {
      expect(PICTOGRAPHS.test(bad) || /[←→↑↓×▶▸▾▴♪♩♫↻↺✓✔✕✗✖⏸⏹↗⚙]/.test(bad), bad).toBe(true);
    }
    expect(TRACKED_CAPS.test('text-xs font-bold tracking-wider uppercase')).toBe(true);
    expect(PICTOGRAPHS.test('Natural notes on the first 3 frets, open chords')).toBe(false);
  });
});
