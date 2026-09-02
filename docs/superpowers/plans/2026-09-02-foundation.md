# guitarRot Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tested, dependency-free foundation layers of guitarRot — music theory core, fretboard renderer, guitar audio engine, tab renderer with synced playhead, and progress storage — ending in a dev harness that renders a playable looping riff.

**Architecture:** Strict downward layering. `music/` is a zero-dependency pure library that everything sits on. `render/` draws SVG from `music/` types and knows nothing about audio. `audio/` wraps Tone.js behind an interface with two interchangeable backends. Geometry and time-conversion maths live in pure modules beside their components so they can be tested without a DOM or an AudioContext.

**Tech Stack:** React 19, TypeScript (strict), Vite 7, Tailwind CSS v4, Tone.js, Vitest, @testing-library/react, jsdom.

**Spec:** `docs/superpowers/specs/2026-09-02-guitar-rot-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **TypeScript strict mode is on.** `any` is not permitted anywhere. `unknown` plus narrowing is the escape hatch.
- **String index convention:** arrays are indexed `0` = low E (6th string) through `5` = high E (1st string). Every function parameter is named `stringIndex`. Display-facing string numbers are produced only by `stringNumber()`. Never accept a "string number" as a function parameter.
- **Pitch is a MIDI integer.** `STANDARD_TUNING = [40, 45, 50, 55, 59, 64]` (E2 A2 D3 G3 B3 E4). MIDI 60 is C4. Note *names* are always derived, never stored.
- **Layering:** `music/` imports nothing from the app. `render/` may import `music/` but never `audio/`. `audio/` may import `music/` and `content/` types only. Violating this is grounds for rejecting a task.
- **Beats are quarter-note units** measured from the start of a riff. Never milliseconds, never sixteenths.
- **Test command:** `npm test -- --run` for a single pass, `npm test` for watch. All tests must pass before any commit.
- **Every task ends with a commit.** Commit messages use Conventional Commits and end with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Node 22, npm 11.** Lockfile is committed.
- **No content in this plan may be copyrighted.** Riffs are original exercises written for this app. Every riff carries `source: 'original'`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/music/notes.ts` | MIDI ↔ pitch class ↔ octave ↔ name conversion, transposition |
| `src/music/tuning.ts` | `Tuning` type, `STANDARD_TUNING`, string index/number conversion |
| `src/music/fretboard.ts` | fret ↔ pitch maths, position finding |
| `src/music/intervals.ts` | semitone distance → interval naming |
| `src/music/chords.ts` | `ChordShape` type, voicing, shape validation |
| `src/music/scales.ts` | `ScalePattern` type, scale pitch classes and positions |
| `src/music/index.ts` | Public barrel export for the whole music core |
| `src/render/fretboardGeometry.ts` | Pure SVG coordinate maths for the fretboard |
| `src/render/Fretboard.tsx` | The one SVG fretboard component, both orientations |
| `src/render/tabGeometry.ts` | Pure SVG coordinate maths for the tab staff |
| `src/render/TabStaff.tsx` | Tab notation SVG + playhead element |
| `src/audio/types.ts` | `AudioEngine` interface, backend types, manifest types |
| `src/audio/strum.ts` | Pure strum-offset maths |
| `src/audio/SynthGuitar.ts` | Karplus–Strong backend (6 `Tone.PluckSynth` voices) |
| `src/audio/SampledGuitar.ts` | `Tone.Sampler` backend fed from a manifest |
| `src/audio/engine.ts` | Backend probing/selection, fx chain, audio unlock |
| `src/audio/timing.ts` | Pure beat → Transport-time conversion |
| `src/audio/riffPlayer.ts` | Riff → `Tone.Part`, loop control, speed, progress |
| `src/content/types.ts` | `TabEvent`, `Riff` types and `validateRiff` |
| `src/content/riffs.ts` | Seed riff data |
| `src/progress/types.ts` | `ProgressState`, `SrsItem`, `Settings`, `migrate` |
| `src/progress/repo.ts` | `ProgressRepo` interface + `WebProgressRepo` + debounce |
| `src/dev/DevHarness.tsx` | Manual verification page wiring the layers together |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `vitest.setup.ts`
- Test: `src/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a working `npm test -- --run`, `npm run dev`, `npm run build`; Tailwind v4 available via `@import "tailwindcss"`; path alias `@/` → `src/`

- [ ] **Step 1: Create the Vite React-TS project in place**

The directory already contains `.git`, `docs/`, and `.gitignore`. Scaffold into it without clobbering them:

```bash
npm create vite@latest . -- --template react-ts
```

Answer "Ignore files and continue" if prompted about the non-empty directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install tone
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

- [ ] **Step 3: Configure Vite for Tailwind v4, the `@/` alias, and Vitest**

Replace `vite.config.ts` entirely:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

Vitest config lives inside `vite.config.ts` on purpose — one config file, no duplication of the alias.

- [ ] **Step 4: Create the Vitest setup file**

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Enable strict TypeScript and the path alias**

In `tsconfig.app.json` (Vite 7 splits tsconfig; if the project has a single `tsconfig.json` instead, apply these to it), ensure `compilerOptions` contains:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "baseUrl": ".",
  "paths": { "@/*": ["./src/*"] },
  "types": ["vitest/globals", "@testing-library/jest-dom"]
}
```

`noUncheckedIndexedAccess` matters here: it forces explicit handling of `tuning[stringIndex]` possibly being undefined, which is exactly the class of bug this codebase must not have.

- [ ] **Step 6: Replace `src/index.css` with the Tailwind v4 entry and base tokens**

```css
@import "tailwindcss";

@theme {
  --color-ground: #0b0b0f;
  --color-surface: #15151c;
  --color-surface-2: #1e1e28;
  --color-ink: #f4f4f6;
  --color-ink-dim: #9a9aa8;
  --color-accent: #ffb020;
  --color-accent-deep: #c9781a;
  --color-good: #35d07f;
  --color-bad: #ff5a5f;
  --color-wood: #2a1d14;
  --color-wood-light: #3b2a1d;
  --color-fret: #8f8f9c;
}

html, body, #root {
  height: 100%;
}

body {
  margin: 0;
  background: var(--color-ground);
  color: var(--color-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
```

- [ ] **Step 7: Replace `src/App.tsx` with a placeholder**

```tsx
export default function App() {
  return (
    <main className="flex h-full items-center justify-center">
      <h1 className="text-2xl font-bold tracking-tight">guitarRot</h1>
    </main>
  );
}
```

Delete `src/App.css` and any unused starter assets it references.

- [ ] **Step 8: Write the smoke test**

Create `src/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs typescript through vitest', () => {
    const doubled: number[] = [1, 2, 3].map((n) => n * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});
```

- [ ] **Step 9: Add the test scripts**

In `package.json`, set `scripts` to include:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "typecheck": "tsc -b --noEmit"
}
```

- [ ] **Step 10: Verify everything runs**

Run: `npm test -- --run`
Expected: 1 test passes.

Run: `npm run build`
Expected: exit 0, `dist/` produced.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "$(cat <<'MSG'
chore: scaffold vite + react 19 + tailwind v4 + vitest

Strict TS with noUncheckedIndexedAccess. Vitest config lives in
vite.config.ts so the @/ alias is defined once.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Note representation (`src/music/notes.ts`)

**Files:**
- Create: `src/music/notes.ts`
- Test: `src/music/notes.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Midi = number`
  - `type PitchClass = number` (0–11, 0 = C)
  - `const SHARP_NAMES: readonly string[]`, `const FLAT_NAMES: readonly string[]`
  - `midiToPitchClass(m: Midi): PitchClass`
  - `midiToOctave(m: Midi): number`
  - `noteName(m: Midi, opts?: { preferFlat?: boolean; withOctave?: boolean }): string`
  - `pitchClassName(pc: PitchClass, opts?: { preferFlat?: boolean }): string`
  - `parseNoteName(s: string): Midi`
  - `transpose(m: Midi, semitones: number): Midi`
  - `enharmonics(pc: PitchClass): string[]`

- [ ] **Step 1: Write the failing tests**

Create `src/music/notes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  enharmonics,
  midiToOctave,
  midiToPitchClass,
  noteName,
  parseNoteName,
  pitchClassName,
  transpose,
} from './notes';

describe('midiToPitchClass', () => {
  it('maps C4 to pitch class 0', () => {
    expect(midiToPitchClass(60)).toBe(0);
  });

  it('maps every open standard-tuning string', () => {
    expect([40, 45, 50, 55, 59, 64].map(midiToPitchClass)).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it('stays in range for negative input', () => {
    expect(midiToPitchClass(-1)).toBe(11);
  });
});

describe('midiToOctave', () => {
  it('places C4 in octave 4', () => {
    expect(midiToOctave(60)).toBe(4);
  });

  it('places the low E string in octave 2', () => {
    expect(midiToOctave(40)).toBe(2);
  });

  it('places the high E string in octave 4', () => {
    expect(midiToOctave(64)).toBe(4);
  });
});

describe('noteName', () => {
  it('uses sharps by default', () => {
    expect(noteName(61)).toBe('C#');
  });

  it('uses flats on request', () => {
    expect(noteName(61, { preferFlat: true })).toBe('Db');
  });

  it('appends the octave on request', () => {
    expect(noteName(40, { withOctave: true })).toBe('E2');
  });

  it('names all six open strings', () => {
    const names = [40, 45, 50, 55, 59, 64].map((m) => noteName(m, { withOctave: true }));
    expect(names).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });
});

describe('pitchClassName', () => {
  it('names a pitch class without an octave', () => {
    expect(pitchClassName(9)).toBe('A');
  });
});

describe('parseNoteName', () => {
  it('round-trips every open string', () => {
    for (const m of [40, 45, 50, 55, 59, 64]) {
      expect(parseNoteName(noteName(m, { withOctave: true }))).toBe(m);
    }
  });

  it('accepts flats', () => {
    expect(parseNoteName('Bb3')).toBe(58);
  });

  it('accepts unicode accidentals', () => {
    expect(parseNoteName('C♯4')).toBe(61);
  });

  it('defaults to octave 4 when none is given', () => {
    expect(parseNoteName('C')).toBe(60);
  });

  it('throws on nonsense', () => {
    expect(() => parseNoteName('H4')).toThrow();
  });
});

describe('transpose', () => {
  it('moves up an octave', () => {
    expect(transpose(40, 12)).toBe(52);
  });

  it('moves down a fifth', () => {
    expect(transpose(64, -7)).toBe(57);
  });
});

describe('enharmonics', () => {
  it('gives both spellings for a black key', () => {
    expect(enharmonics(1)).toEqual(['C#', 'Db']);
  });

  it('gives one spelling for a white key', () => {
    expect(enharmonics(0)).toEqual(['C']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/music/notes.test.ts`
Expected: FAIL — cannot resolve `./notes`.

- [ ] **Step 3: Write the implementation**

Create `src/music/notes.ts`:

```ts
/** A MIDI note number. 60 is C4; 40 is the open low E string (E2). */
export type Midi = number;

/** 0-11, where 0 is C. */
export type PitchClass = number;

export const SHARP_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export const FLAT_NAMES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

/** Semitone offset of each natural letter above C. */
const LETTER_OFFSET: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

export function midiToPitchClass(m: Midi): PitchClass {
  return ((m % 12) + 12) % 12;
}

export function midiToOctave(m: Midi): number {
  return Math.floor(m / 12) - 1;
}

export function pitchClassName(
  pc: PitchClass,
  opts: { preferFlat?: boolean } = {},
): string {
  const table = opts.preferFlat ? FLAT_NAMES : SHARP_NAMES;
  const name = table[midiToPitchClass(pc)];
  if (name === undefined) throw new Error(`Unnameable pitch class: ${pc}`);
  return name;
}

export function noteName(
  m: Midi,
  opts: { preferFlat?: boolean; withOctave?: boolean } = {},
): string {
  const base = pitchClassName(midiToPitchClass(m), opts);
  return opts.withOctave ? `${base}${midiToOctave(m)}` : base;
}

const NOTE_PATTERN = /^([A-Ga-g])([#b♯♭x]*)(-?\d+)?$/;

/** Parses "C", "C#4", "Bb3", "C♯4". Octave defaults to 4 when omitted. */
export function parseNoteName(s: string): Midi {
  const match = NOTE_PATTERN.exec(s.trim());
  if (match === null) throw new Error(`Unparseable note name: ${s}`);

  const [, letter = '', accidentals = '', octaveText] = match;

  const base = LETTER_OFFSET[letter.toUpperCase()];
  if (base === undefined) throw new Error(`Unparseable note letter: ${s}`);

  let offset = 0;
  for (const ch of accidentals) {
    if (ch === '#' || ch === '♯') offset += 1;
    else if (ch === 'b' || ch === '♭') offset -= 1;
    else if (ch === 'x') offset += 2;
  }

  const octave = octaveText === undefined ? 4 : Number.parseInt(octaveText, 10);
  return (octave + 1) * 12 + base + offset;
}

export function transpose(m: Midi, semitones: number): Midi {
  return m + semitones;
}

/** Common spellings of a pitch class: one entry for naturals, two for accidentals. */
export function enharmonics(pc: PitchClass): string[] {
  const sharp = pitchClassName(pc);
  const flat = pitchClassName(pc, { preferFlat: true });
  return sharp === flat ? [sharp] : [sharp, flat];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/music/notes.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/music/notes.ts src/music/notes.test.ts
git commit -m "$(cat <<'MSG'
feat(music): add MIDI note representation and naming

Pitch is a MIDI integer everywhere; names are derived, never stored.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Tuning and fretboard maths (`src/music/tuning.ts`, `src/music/fretboard.ts`)

**Files:**
- Create: `src/music/tuning.ts`, `src/music/fretboard.ts`
- Test: `src/music/fretboard.test.ts`

**Interfaces:**
- Consumes: `Midi`, `PitchClass`, `midiToPitchClass` from `./notes`
- Produces:
  - `type Tuning = readonly [Midi, Midi, Midi, Midi, Midi, Midi]`
  - `const STANDARD_TUNING: Tuning`, `const STRING_COUNT = 6`, `const MAX_FRET = 24`
  - `stringNumber(stringIndex: number): number`, `stringIndexFromNumber(n: number): number`
  - `type FretPosition = { stringIndex: number; fret: number }`
  - `openStringMidi(tuning: Tuning, stringIndex: number): Midi`
  - `fretToMidi(tuning: Tuning, stringIndex: number, fret: number): Midi`
  - `findPositions(tuning: Tuning, midi: Midi, fretRange?: [number, number]): FretPosition[]`
  - `findPitchClassPositions(tuning: Tuning, pc: PitchClass, fretRange?: [number, number]): FretPosition[]`
  - `positionKey(p: FretPosition): string`

- [ ] **Step 1: Write the failing tests**

Create `src/music/fretboard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  findPitchClassPositions,
  findPositions,
  fretToMidi,
  openStringMidi,
  positionKey,
} from './fretboard';
import {
  STANDARD_TUNING,
  STRING_COUNT,
  stringIndexFromNumber,
  stringNumber,
} from './tuning';
import { noteName } from './notes';

describe('string index convention', () => {
  it('treats index 0 as the low E, which guitarists call string 6', () => {
    expect(stringNumber(0)).toBe(6);
    expect(stringNumber(5)).toBe(1);
  });

  it('round-trips index and number', () => {
    for (let i = 0; i < STRING_COUNT; i += 1) {
      expect(stringIndexFromNumber(stringNumber(i))).toBe(i);
    }
  });

  it('puts the lowest pitch at index 0', () => {
    expect(STANDARD_TUNING[0]).toBeLessThan(STANDARD_TUNING[5]);
  });
});

describe('openStringMidi', () => {
  it('returns the tuning entry', () => {
    expect(openStringMidi(STANDARD_TUNING, 2)).toBe(50);
  });

  it('throws on an out-of-range string index', () => {
    expect(() => openStringMidi(STANDARD_TUNING, 6)).toThrow();
  });
});

describe('fretToMidi', () => {
  it('returns the open string at fret 0', () => {
    expect(fretToMidi(STANDARD_TUNING, 0, 0)).toBe(40);
  });

  it('raises pitch one semitone per fret', () => {
    expect(fretToMidi(STANDARD_TUNING, 0, 5)).toBe(45);
  });

  it('makes the fifth fret of a string match the next open string, except G to B', () => {
    // The B string is tuned a major third above G, so the trick uses fret 4 there.
    for (const stringIndex of [0, 1, 2]) {
      expect(fretToMidi(STANDARD_TUNING, stringIndex, 5)).toBe(
        openStringMidi(STANDARD_TUNING, stringIndex + 1),
      );
    }
    expect(fretToMidi(STANDARD_TUNING, 3, 4)).toBe(openStringMidi(STANDARD_TUNING, 4));
    expect(fretToMidi(STANDARD_TUNING, 4, 5)).toBe(openStringMidi(STANDARD_TUNING, 5));
  });

  it('puts the twelfth fret an octave above the open string', () => {
    for (let i = 0; i < STRING_COUNT; i += 1) {
      expect(fretToMidi(STANDARD_TUNING, i, 12)).toBe(openStringMidi(STANDARD_TUNING, i) + 12);
    }
  });

  it('names the third fret of the low E as G2', () => {
    expect(noteName(fretToMidi(STANDARD_TUNING, 0, 3), { withOctave: true })).toBe('G2');
  });

  it('rejects a negative fret', () => {
    expect(() => fretToMidi(STANDARD_TUNING, 0, -1)).toThrow();
  });
});

describe('findPositions', () => {
  it('finds every place middle C can be played in the first twelve frets', () => {
    // D string fret 10, G string fret 5, B string fret 1. The E and A
    // strings only reach C above fret 12, and the high E is already past it.
    expect(findPositions(STANDARD_TUNING, 60, [0, 12])).toEqual([
      { stringIndex: 2, fret: 10 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 4, fret: 1 },
    ]);
  });

  it('returns positions ordered by string index', () => {
    const found = findPositions(STANDARD_TUNING, 55, [0, 12]);
    const indices = found.map((p) => p.stringIndex);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('agrees with fretToMidi for everything it returns', () => {
    for (let midi = 40; midi <= 76; midi += 1) {
      for (const p of findPositions(STANDARD_TUNING, midi, [0, 12])) {
        expect(fretToMidi(STANDARD_TUNING, p.stringIndex, p.fret)).toBe(midi);
      }
    }
  });

  it('returns nothing for a pitch below the instrument', () => {
    expect(findPositions(STANDARD_TUNING, 30, [0, 12])).toEqual([]);
  });
});

describe('findPitchClassPositions', () => {
  it('finds E everywhere it occurs in the first five frets', () => {
    // Verified by hand against fretToMidi:
    //   low E  (40) fret 0  -> 40 = E2
    //   A      (45)          -> E only at fret 7, outside the range
    //   D      (50) fret 2  -> 52 = E3
    //   G      (55)          -> E only at fret 9, outside the range
    //   B      (59) fret 5  -> 64 = E4
    //   high E (64) fret 0  -> 64 = E4
    expect(findPitchClassPositions(STANDARD_TUNING, 4, [0, 5])).toEqual([
      { stringIndex: 0, fret: 0 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 5, fret: 0 },
    ]);
  });
});

describe('positionKey', () => {
  it('produces a stable unique key', () => {
    expect(positionKey({ stringIndex: 0, fret: 3 })).toBe('s0f3');
  });
});
```


- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/music/fretboard.test.ts`
Expected: FAIL — cannot resolve `./fretboard`.

- [ ] **Step 3: Write `src/music/tuning.ts`**

```ts
import type { Midi } from './notes';

export const STRING_COUNT = 6;
export const MAX_FRET = 24;

/** Six open-string pitches, low to high. Index 0 is the low E (string 6). */
export type Tuning = readonly [Midi, Midi, Midi, Midi, Midi, Midi];

/** E2 A2 D3 G3 B3 E4 */
export const STANDARD_TUNING: Tuning = [40, 45, 50, 55, 59, 64];

/** Array index 0 is the low E, which guitarists call string 6. Display only. */
export function stringNumber(stringIndex: number): number {
  return STRING_COUNT - stringIndex;
}

export function stringIndexFromNumber(n: number): number {
  return STRING_COUNT - n;
}
```

- [ ] **Step 4: Write `src/music/fretboard.ts`**

```ts
import { midiToPitchClass, type Midi, type PitchClass } from './notes';
import { MAX_FRET, STRING_COUNT, type Tuning } from './tuning';

export type FretPosition = { stringIndex: number; fret: number };

export const DEFAULT_FRET_RANGE: [number, number] = [0, 12];

function assertStringIndex(stringIndex: number): void {
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex >= STRING_COUNT) {
    throw new Error(`String index out of range: ${stringIndex}`);
  }
}

export function openStringMidi(tuning: Tuning, stringIndex: number): Midi {
  assertStringIndex(stringIndex);
  const open = tuning[stringIndex];
  if (open === undefined) throw new Error(`Tuning has no string ${stringIndex}`);
  return open;
}

export function fretToMidi(tuning: Tuning, stringIndex: number, fret: number): Midi {
  if (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET) {
    throw new Error(`Fret out of range: ${fret}`);
  }
  return openStringMidi(tuning, stringIndex) + fret;
}

/** Every position producing exactly this pitch, ordered low string to high. */
export function findPositions(
  tuning: Tuning,
  midi: Midi,
  fretRange: [number, number] = DEFAULT_FRET_RANGE,
): FretPosition[] {
  const [lowFret, highFret] = fretRange;
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = midi - openStringMidi(tuning, stringIndex);
    if (fret >= lowFret && fret <= highFret && fret <= MAX_FRET) {
      found.push({ stringIndex, fret });
    }
  }
  return found;
}

/** Every position producing this pitch class in any octave, ordered low string to high. */
export function findPitchClassPositions(
  tuning: Tuning,
  pc: PitchClass,
  fretRange: [number, number] = DEFAULT_FRET_RANGE,
): FretPosition[] {
  const [lowFret, highFret] = fretRange;
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    for (let fret = lowFret; fret <= Math.min(highFret, MAX_FRET); fret += 1) {
      if (midiToPitchClass(fretToMidi(tuning, stringIndex, fret)) === midiToPitchClass(pc)) {
        found.push({ stringIndex, fret });
      }
    }
  }
  return found;
}

export function positionKey(p: FretPosition): string {
  return `s${p.stringIndex}f${p.fret}`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --run src/music/fretboard.test.ts`
Expected: all pass. If the middle-C test fails, recheck the expected array by hand against `fretToMidi` rather than loosening the assertion — a wrong expectation here would teach the user wrong notes.

- [ ] **Step 6: Commit**

```bash
git add src/music/tuning.ts src/music/fretboard.ts src/music/fretboard.test.ts
git commit -m "$(cat <<'MSG'
feat(music): add tuning and fretboard position maths

String index 0 is the low E throughout; stringNumber() is display-only.
Tests assert the fifth-fret trick and its G-to-B exception.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: Intervals (`src/music/intervals.ts`)

**Files:**
- Create: `src/music/intervals.ts`
- Test: `src/music/intervals.test.ts`

**Interfaces:**
- Consumes: `Midi` from `./notes`
- Produces:
  - `type Interval = { semitones: number; shortName: string; longName: string }`
  - `intervalBetween(a: Midi, b: Midi): Interval`
  - `intervalFromSemitones(semitones: number): Interval`
  - `const SIMPLE_INTERVALS: readonly { shortName: string; longName: string }[]` (12 entries, index = semitones)

- [ ] **Step 1: Write the failing tests**

Create `src/music/intervals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { intervalBetween, intervalFromSemitones } from './intervals';

describe('intervalFromSemitones', () => {
  it('names a unison', () => {
    expect(intervalFromSemitones(0)).toMatchObject({ shortName: 'P1', longName: 'unison' });
  });

  it('names a perfect fifth', () => {
    expect(intervalFromSemitones(7)).toMatchObject({ shortName: 'P5', longName: 'perfect fifth' });
  });

  it('names a minor third', () => {
    expect(intervalFromSemitones(3)).toMatchObject({ shortName: 'm3', longName: 'minor third' });
  });

  it('names an octave rather than a unison', () => {
    expect(intervalFromSemitones(12)).toMatchObject({ shortName: 'P8', longName: 'octave' });
  });

  it('names a compound interval by its simple form', () => {
    expect(intervalFromSemitones(19)).toMatchObject({ shortName: 'P5', longName: 'perfect fifth' });
  });

  it('preserves the true distance', () => {
    expect(intervalFromSemitones(19).semitones).toBe(19);
  });

  it('rejects a negative distance', () => {
    expect(() => intervalFromSemitones(-1)).toThrow();
  });
});

describe('intervalBetween', () => {
  it('is direction-independent', () => {
    expect(intervalBetween(60, 67)).toEqual(intervalBetween(67, 60));
  });

  it('measures the low E to A string gap as a perfect fourth', () => {
    expect(intervalBetween(40, 45).shortName).toBe('P4');
  });

  it('measures the G to B string gap as a major third', () => {
    expect(intervalBetween(55, 59).shortName).toBe('M3');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/music/intervals.test.ts`
Expected: FAIL — cannot resolve `./intervals`.

- [ ] **Step 3: Write the implementation**

Create `src/music/intervals.ts`:

```ts
import type { Midi } from './notes';

export type Interval = {
  /** True distance in semitones, which may exceed 12. */
  semitones: number;
  shortName: string;
  longName: string;
};

/** Indexed by semitones within one octave. */
export const SIMPLE_INTERVALS = [
  { shortName: 'P1', longName: 'unison' },
  { shortName: 'm2', longName: 'minor second' },
  { shortName: 'M2', longName: 'major second' },
  { shortName: 'm3', longName: 'minor third' },
  { shortName: 'M3', longName: 'major third' },
  { shortName: 'P4', longName: 'perfect fourth' },
  { shortName: 'TT', longName: 'tritone' },
  { shortName: 'P5', longName: 'perfect fifth' },
  { shortName: 'm6', longName: 'minor sixth' },
  { shortName: 'M6', longName: 'major sixth' },
  { shortName: 'm7', longName: 'minor seventh' },
  { shortName: 'M7', longName: 'major seventh' },
] as const;

const OCTAVE = { shortName: 'P8', longName: 'octave' } as const;

/**
 * Names a distance by its simple (within-octave) form, keeping the true
 * distance in `semitones`. A whole number of octaves is named "octave"
 * rather than "unison".
 */
export function intervalFromSemitones(semitones: number): Interval {
  if (!Number.isInteger(semitones) || semitones < 0) {
    throw new Error(`Interval distance must be a non-negative integer: ${semitones}`);
  }
  const remainder = semitones % 12;
  const named = remainder === 0 && semitones > 0 ? OCTAVE : SIMPLE_INTERVALS[remainder];
  if (named === undefined) throw new Error(`Unnameable interval: ${semitones}`);
  return { semitones, shortName: named.shortName, longName: named.longName };
}

export function intervalBetween(a: Midi, b: Midi): Interval {
  return intervalFromSemitones(Math.abs(b - a));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/music/intervals.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/music/intervals.ts src/music/intervals.test.ts
git commit -m "$(cat <<'MSG'
feat(music): add interval naming

Compound intervals are named by their simple form while keeping the
true semitone distance.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: Chord shapes (`src/music/chords.ts`)

**Files:**
- Create: `src/music/chords.ts`
- Test: `src/music/chords.test.ts`

**Interfaces:**
- Consumes: `Midi`, `PitchClass`, `midiToPitchClass` from `./notes`; `Tuning`, `STRING_COUNT` from `./tuning`; `fretToMidi` from `./fretboard`
- Produces:
  - `type ChordQuality = 'maj' | 'min' | 'dom7' | 'maj7' | 'min7' | 'sus2' | 'sus4' | 'dim' | 'aug' | 'power'`
  - `const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]>`
  - `const QUALITY_LABELS: Record<ChordQuality, string>`
  - `type ChordShape` (fields exactly as written below)
  - `chordVoicing(shape: ChordShape, tuning: Tuning): Midi[]`
  - `chordPitchClasses(shape: ChordShape, tuning: Tuning): PitchClass[]`
  - `expectedPitchClasses(root: PitchClass, quality: ChordQuality): PitchClass[]`
  - `validateChordShape(shape: ChordShape, tuning: Tuning): string[]`

- [ ] **Step 1: Write the failing tests**

Create `src/music/chords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  chordPitchClasses,
  chordVoicing,
  expectedPitchClasses,
  validateChordShape,
  type ChordShape,
} from './chords';
import { STANDARD_TUNING } from './tuning';

const eMajorOpen: ChordShape = {
  id: 'E-open',
  name: 'E',
  root: 4,
  quality: 'maj',
  baseFret: 1,
  frets: [0, 2, 2, 1, 0, 0],
  fingers: [null, 2, 3, 1, null, null],
  difficulty: 1,
};

const aMinorOpen: ChordShape = {
  id: 'Am-open',
  name: 'Am',
  root: 9,
  quality: 'min',
  baseFret: 1,
  frets: [null, 0, 2, 2, 1, 0],
  fingers: [null, null, 2, 3, 1, null],
  difficulty: 1,
};

const brokenChord: ChordShape = {
  id: 'broken',
  name: 'C',
  root: 0,
  quality: 'maj',
  baseFret: 1,
  frets: [null, 3, 2, 0, 1, 1],
  fingers: [null, 3, 2, null, 1, 1],
  difficulty: 1,
};

describe('expectedPitchClasses', () => {
  it('spells E major', () => {
    expect(expectedPitchClasses(4, 'maj')).toEqual([4, 8, 11]);
  });

  it('spells A minor', () => {
    expect(expectedPitchClasses(9, 'min')).toEqual([0, 4, 9]);
  });

  it('spells a power chord with only root and fifth', () => {
    expect(expectedPitchClasses(4, 'power')).toEqual([4, 11]);
  });
});

describe('chordVoicing', () => {
  it('skips muted strings and returns pitches low to high', () => {
    const voicing = chordVoicing(aMinorOpen, STANDARD_TUNING);
    expect(voicing).toEqual([45, 52, 57, 60, 64]);
  });

  it('returns all six strings for a shape with none muted', () => {
    expect(chordVoicing(eMajorOpen, STANDARD_TUNING)).toHaveLength(6);
  });
});

describe('chordPitchClasses', () => {
  it('returns each pitch class once, sorted', () => {
    expect(chordPitchClasses(eMajorOpen, STANDARD_TUNING)).toEqual([4, 8, 11]);
  });
});

describe('validateChordShape', () => {
  it('accepts a correct open E', () => {
    expect(validateChordShape(eMajorOpen, STANDARD_TUNING)).toEqual([]);
  });

  it('accepts a correct open Am', () => {
    expect(validateChordShape(aMinorOpen, STANDARD_TUNING)).toEqual([]);
  });

  it('rejects a shape whose notes do not match its declared name', () => {
    const errors = validateChordShape(brokenChord, STANDARD_TUNING);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('pitch classes');
  });

  it('rejects a fret array of the wrong length', () => {
    const short = { ...eMajorOpen, frets: [0, 2, 2] } as unknown as ChordShape;
    expect(validateChordShape(short, STANDARD_TUNING).join(' ')).toContain('6 entries');
  });

  it('rejects a finger number on a muted string', () => {
    const bad: ChordShape = {
      ...aMinorOpen,
      fingers: [1, null, 2, 3, 1, null],
    };
    expect(validateChordShape(bad, STANDARD_TUNING).join(' ')).toContain('muted');
  });

  it('rejects a shape with no sounding strings', () => {
    const silent: ChordShape = {
      ...eMajorOpen,
      frets: [null, null, null, null, null, null],
      fingers: [null, null, null, null, null, null],
    };
    expect(validateChordShape(silent, STANDARD_TUNING).join(' ')).toContain('no sounding');
  });
});
```

Verify the `brokenChord` fixture by hand before running: `[null, 3, 2, 0, 1, 1]` on standard tuning sounds A2+3=48 (C), D3+2=52 (E), G3+0=55 (G), B3+1=60 (C), E4+1=65 (F). Pitch classes {0, 4, 7, 5} — the F on the top string is the deliberate error, so it must not match C major's {0, 4, 7}.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/music/chords.test.ts`
Expected: FAIL — cannot resolve `./chords`.

- [ ] **Step 3: Write the implementation**

Create `src/music/chords.ts`:

```ts
import { midiToPitchClass, type Midi, type PitchClass } from './notes';
import { fretToMidi } from './fretboard';
import { STRING_COUNT, type Tuning } from './tuning';

export type ChordQuality =
  | 'maj' | 'min' | 'dom7' | 'maj7' | 'min7'
  | 'sus2' | 'sus4' | 'dim' | 'aug' | 'power';

/** Semitones above the root that each quality contains. */
export const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  power: [0, 7],
};

export const QUALITY_LABELS: Record<ChordQuality, string> = {
  maj: 'major',
  min: 'minor',
  dom7: 'dominant seventh',
  maj7: 'major seventh',
  min7: 'minor seventh',
  sus2: 'suspended second',
  sus4: 'suspended fourth',
  dim: 'diminished',
  aug: 'augmented',
  power: 'power chord',
};

export type ChordShape = {
  id: string;
  /** Display name, e.g. "Am" or "G7". */
  name: string;
  root: PitchClass;
  quality: ChordQuality;
  /** Leftmost fret of the diagram box. 1 for open shapes. */
  baseFret: number;
  /** Six entries, index 0 = low E. `null` means muted, `0` means open. */
  frets: (number | null)[];
  /** Six entries. 1-4 are fingers; `null` means open or muted. */
  fingers: (number | null)[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  difficulty: 1 | 2 | 3;
};

/** Sounding pitches, low to high, skipping muted strings. */
export function chordVoicing(shape: ChordShape, tuning: Tuning): Midi[] {
  const voicing: Midi[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = shape.frets[stringIndex];
    if (fret === null || fret === undefined) continue;
    voicing.push(fretToMidi(tuning, stringIndex, fret));
  }
  return voicing;
}

export function chordPitchClasses(shape: ChordShape, tuning: Tuning): PitchClass[] {
  const set = new Set(chordVoicing(shape, tuning).map(midiToPitchClass));
  return [...set].sort((a, b) => a - b);
}

export function expectedPitchClasses(root: PitchClass, quality: ChordQuality): PitchClass[] {
  const set = new Set(
    QUALITY_INTERVALS[quality].map((step) => midiToPitchClass(root + step)),
  );
  return [...set].sort((a, b) => a - b);
}

/**
 * Returns a list of human-readable problems with a shape. An empty array
 * means the shape is valid. Content tests assert this is empty for every
 * shipped chord, which is what stops an authoring typo teaching a wrong shape.
 */
export function validateChordShape(shape: ChordShape, tuning: Tuning): string[] {
  const errors: string[] = [];

  if (shape.frets.length !== STRING_COUNT) {
    errors.push(`${shape.id}: frets must have 6 entries, has ${shape.frets.length}`);
  }
  if (shape.fingers.length !== STRING_COUNT) {
    errors.push(`${shape.id}: fingers must have 6 entries, has ${shape.fingers.length}`);
  }
  if (errors.length > 0) return errors;

  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    const fret = shape.frets[stringIndex];
    const finger = shape.fingers[stringIndex];

    if (fret !== null && fret !== undefined && (fret < 0 || fret > 24)) {
      errors.push(`${shape.id}: fret ${fret} on string ${stringIndex} is out of range`);
    }
    if ((fret === null || fret === undefined) && finger !== null && finger !== undefined) {
      errors.push(`${shape.id}: string ${stringIndex} is muted but has a finger assigned`);
    }
    if (fret === 0 && finger !== null && finger !== undefined) {
      errors.push(`${shape.id}: string ${stringIndex} is open but has a finger assigned`);
    }
    if (finger !== null && finger !== undefined && (finger < 1 || finger > 4)) {
      errors.push(`${shape.id}: finger ${finger} on string ${stringIndex} is not 1-4`);
    }
  }

  const voicing = chordVoicing(shape, tuning);
  if (voicing.length === 0) {
    errors.push(`${shape.id}: has no sounding strings`);
    return errors;
  }

  const actual = chordPitchClasses(shape, tuning).join(',');
  const expected = expectedPitchClasses(shape.root, shape.quality).join(',');
  if (actual !== expected) {
    errors.push(
      `${shape.id}: sounds pitch classes [${actual}] but ${shape.name} requires [${expected}]`,
    );
  }

  if (shape.barre !== undefined) {
    const { fret, fromStringIndex, toStringIndex } = shape.barre;
    if (fromStringIndex >= toStringIndex) {
      errors.push(`${shape.id}: barre must span from a lower to a higher string index`);
    }
    for (let i = fromStringIndex; i <= toStringIndex; i += 1) {
      const fretAt = shape.frets[i];
      if (fretAt !== null && fretAt !== undefined && fretAt < fret) {
        errors.push(`${shape.id}: string ${i} is fretted below its barre at fret ${fret}`);
      }
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/music/chords.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/music/chords.ts src/music/chords.test.ts
git commit -m "$(cat <<'MSG'
feat(music): add chord shapes, voicing and shape validation

validateChordShape compares a shape's sounding pitch classes against
what its declared name requires, so an authoring typo fails a test
instead of teaching a wrong shape.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: Scales and the music barrel (`src/music/scales.ts`, `src/music/index.ts`)

**Files:**
- Create: `src/music/scales.ts`, `src/music/index.ts`
- Test: `src/music/scales.test.ts`

**Interfaces:**
- Consumes: `PitchClass`, `midiToPitchClass` from `./notes`; `Tuning` from `./tuning`; `FretPosition`, `fretToMidi` from `./fretboard`
- Produces:
  - `type ScalePattern = { id: string; name: string; intervals: readonly number[] }`
  - `const SCALES: Record<ScaleId, ScalePattern>` with `ScaleId = 'major' | 'naturalMinor' | 'minorPentatonic' | 'majorPentatonic' | 'blues'`
  - `scalePitchClasses(root: PitchClass, pattern: ScalePattern): PitchClass[]`
  - `scalePositions(tuning, root, pattern, fretRange): FretPosition[]`
  - `degreeOf(root: PitchClass, pattern: ScalePattern, pc: PitchClass): number | null`
  - `src/music/index.ts` re-exporting every public symbol from all six music modules

- [ ] **Step 1: Write the failing tests**

Create `src/music/scales.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SCALES, degreeOf, scalePitchClasses, scalePositions } from './scales';
import { STANDARD_TUNING } from './tuning';
import { fretToMidi } from './fretboard';
import { midiToPitchClass } from './notes';

describe('scalePitchClasses', () => {
  it('spells C major with no accidentals', () => {
    expect(scalePitchClasses(0, SCALES.major)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('spells E minor pentatonic', () => {
    expect(scalePitchClasses(4, SCALES.minorPentatonic)).toEqual([2, 4, 7, 9, 11]);
  });

  it('gives A natural minor the same notes as C major', () => {
    expect(scalePitchClasses(9, SCALES.naturalMinor)).toEqual(
      scalePitchClasses(0, SCALES.major),
    );
  });

  it('adds one note to the pentatonic for the blues scale', () => {
    expect(scalePitchClasses(4, SCALES.blues)).toHaveLength(6);
  });
});

describe('scalePositions', () => {
  it('returns only positions whose pitch is in the scale', () => {
    const inScale = new Set(scalePitchClasses(4, SCALES.minorPentatonic));
    for (const p of scalePositions(STANDARD_TUNING, 4, SCALES.minorPentatonic, [0, 5])) {
      expect(inScale.has(midiToPitchClass(fretToMidi(STANDARD_TUNING, p.stringIndex, p.fret)))).toBe(true);
    }
  });

  it('includes the open low E for E minor pentatonic', () => {
    expect(scalePositions(STANDARD_TUNING, 4, SCALES.minorPentatonic, [0, 5]))
      .toContainEqual({ stringIndex: 0, fret: 0 });
  });

  it('stays inside the requested fret range', () => {
    for (const p of scalePositions(STANDARD_TUNING, 0, SCALES.major, [5, 8])) {
      expect(p.fret).toBeGreaterThanOrEqual(5);
      expect(p.fret).toBeLessThanOrEqual(8);
    }
  });
});

describe('degreeOf', () => {
  it('numbers the root as 1', () => {
    expect(degreeOf(0, SCALES.major, 0)).toBe(1);
  });

  it('numbers the fifth as 5', () => {
    expect(degreeOf(0, SCALES.major, 7)).toBe(5);
  });

  it('returns null for a note outside the scale', () => {
    expect(degreeOf(0, SCALES.major, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/music/scales.test.ts`
Expected: FAIL — cannot resolve `./scales`.

- [ ] **Step 3: Write `src/music/scales.ts`**

```ts
import { midiToPitchClass, type PitchClass } from './notes';
import { fretToMidi, type FretPosition } from './fretboard';
import { MAX_FRET, STRING_COUNT, type Tuning } from './tuning';

export type ScalePattern = {
  id: string;
  name: string;
  /** Semitones above the root, ascending, starting at 0. */
  intervals: readonly number[];
};

export type ScaleId =
  | 'major' | 'naturalMinor' | 'minorPentatonic' | 'majorPentatonic' | 'blues';

export const SCALES: Record<ScaleId, ScalePattern> = {
  major: { id: 'major', name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor: { id: 'naturalMinor', name: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  minorPentatonic: { id: 'minorPentatonic', name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10] },
  majorPentatonic: { id: 'majorPentatonic', name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9] },
  blues: { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
};

export function scalePitchClasses(root: PitchClass, pattern: ScalePattern): PitchClass[] {
  const set = new Set(pattern.intervals.map((step) => midiToPitchClass(root + step)));
  return [...set].sort((a, b) => a - b);
}

export function scalePositions(
  tuning: Tuning,
  root: PitchClass,
  pattern: ScalePattern,
  fretRange: [number, number],
): FretPosition[] {
  const inScale = new Set(scalePitchClasses(root, pattern));
  const [lowFret, highFret] = fretRange;
  const found: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
    for (let fret = lowFret; fret <= Math.min(highFret, MAX_FRET); fret += 1) {
      if (inScale.has(midiToPitchClass(fretToMidi(tuning, stringIndex, fret)))) {
        found.push({ stringIndex, fret });
      }
    }
  }
  return found;
}

/** 1-based scale degree, or null when the pitch class is outside the scale. */
export function degreeOf(
  root: PitchClass,
  pattern: ScalePattern,
  pc: PitchClass,
): number | null {
  const target = midiToPitchClass(pc);
  const index = pattern.intervals.findIndex(
    (step) => midiToPitchClass(root + step) === target,
  );
  return index === -1 ? null : index + 1;
}
```

- [ ] **Step 4: Write `src/music/index.ts`**

```ts
export * from './notes';
export * from './tuning';
export * from './fretboard';
export * from './intervals';
export * from './chords';
export * from './scales';
```

Every module outside `src/music/` imports from `@/music`, never from a file inside it. This keeps the public surface of the theory core in one reviewable place.

- [ ] **Step 5: Run the whole suite**

Run: `npm test -- --run`
Expected: all tests pass across notes, fretboard, intervals, chords, scales.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/music/scales.ts src/music/scales.test.ts src/music/index.ts
git commit -m "$(cat <<'MSG'
feat(music): add scale patterns and the music core barrel

Everything outside src/music imports from @/music only.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 7: Fretboard geometry (`src/render/fretboardGeometry.ts`)

**Files:**
- Create: `src/render/fretboardGeometry.ts`
- Test: `src/render/fretboardGeometry.test.ts`

**Interfaces:**
- Consumes: `FretPosition` from `@/music`
- Produces:
  - `type Orientation = 'horizontal' | 'vertical'`
  - `type Point = { x: number; y: number }`, `type Line = { x1: number; y1: number; x2: number; y2: number }`, `type Rect = { x: number; y: number; width: number; height: number }`
  - `const TOUCH_MIN = 44`
  - `const INLAY_FRETS: readonly number[]`, `const DOUBLE_INLAY_FRETS: readonly number[]`
  - `type FretboardGeometry` with fields `orientation`, `fretRange`, `cellFrets`, `hasNut`, `width`, `height`, `stringSpacing`, `fretSpacing` and methods `markerPoint`, `fretWire`, `stringLine`, `cellRect`, `fretNumberPoint`, `inlayPoints`
  - `createFretboardGeometry(opts: { orientation: Orientation; fretRange: [number, number]; interactive?: boolean }): FretboardGeometry`

All coordinate maths lives here so it can be tested without a DOM. The component is a thin renderer over this.

- [ ] **Step 1: Write the failing tests**

Create `src/render/fretboardGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TOUCH_MIN, createFretboardGeometry } from './fretboardGeometry';

describe('cellFrets', () => {
  it('excludes fret 0, which lives in the open-string margin', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 4] });
    expect(g.cellFrets).toEqual([1, 2, 3, 4]);
    expect(g.hasNut).toBe(true);
  });

  it('starts at the requested fret when the range does not include the nut', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [5, 8] });
    expect(g.cellFrets).toEqual([5, 6, 7, 8]);
    expect(g.hasNut).toBe(false);
  });
});

describe('horizontal layout', () => {
  const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5] });

  it('puts the low E at the bottom, matching tab notation', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 1 }).y).toBeGreaterThan(
      g.markerPoint({ stringIndex: 5, fret: 1 }).y,
    );
  });

  it('places higher frets further right', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 3 }).x).toBeGreaterThan(
      g.markerPoint({ stringIndex: 0, fret: 1 }).x,
    );
  });

  it('places open-string markers left of the nut', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 0 }).x).toBeLessThan(g.fretWire(0).x1);
  });

  it('centres a marker inside its own cell', () => {
    const point = g.markerPoint({ stringIndex: 2, fret: 3 });
    const rect = g.cellRect({ stringIndex: 2, fret: 3 });
    expect(point.x).toBeGreaterThan(rect.x);
    expect(point.x).toBeLessThan(rect.x + rect.width);
    expect(point.y).toBeGreaterThan(rect.y);
    expect(point.y).toBeLessThan(rect.y + rect.height);
  });

  it('fits every marker inside the reported viewbox', () => {
    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      for (const fret of [0, ...g.cellFrets]) {
        const p = g.markerPoint({ stringIndex, fret });
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(g.width);
        expect(p.y).toBeLessThanOrEqual(g.height);
      }
    }
  });

  it('draws one more fret wire than it has cells', () => {
    expect(() => g.fretWire(g.cellFrets.length)).not.toThrow();
    expect(() => g.fretWire(g.cellFrets.length + 1)).toThrow();
  });
});

describe('vertical layout', () => {
  const g = createFretboardGeometry({ orientation: 'vertical', fretRange: [0, 4] });

  it('puts the low E on the left, matching a chord diagram', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 1 }).x).toBeLessThan(
      g.markerPoint({ stringIndex: 5, fret: 1 }).x,
    );
  });

  it('places higher frets further down', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 3 }).y).toBeGreaterThan(
      g.markerPoint({ stringIndex: 0, fret: 1 }).y,
    );
  });

  it('places open-string markers above the nut', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 0 }).y).toBeLessThan(g.fretWire(0).y1);
  });
});

describe('interactive sizing', () => {
  it('meets the 44px touch minimum in both orientations', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const g = createFretboardGeometry({ orientation, fretRange: [0, 5], interactive: true });
      const rect = g.cellRect({ stringIndex: 3, fret: 2 });
      expect(rect.width).toBeGreaterThanOrEqual(TOUCH_MIN);
      expect(rect.height).toBeGreaterThanOrEqual(TOUCH_MIN);
    }
  });

  it('keeps non-interactive boards compact', () => {
    const compact = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5] });
    const roomy = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], interactive: true });
    expect(compact.height).toBeLessThan(roomy.height);
  });

  it('never overlaps neighbouring cells', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], interactive: true });
    // String 3 sits above string 2 on screen, so it is the one whose bottom
    // edge must reach no further than string 2's top edge.
    const upper = g.cellRect({ stringIndex: 3, fret: 2 });
    const lower = g.cellRect({ stringIndex: 2, fret: 2 });
    expect(upper.y + upper.height).toBeLessThanOrEqual(lower.y + 0.001);
  });

  it('keeps open-string tap targets fully on the canvas', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const g = createFretboardGeometry({ orientation, fretRange: [0, 5], interactive: true });
      const rect = g.cellRect({ stringIndex: 0, fret: 0 });
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('inlayPoints', () => {
  it('gives one dot at fret 5', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12] });
    expect(g.inlayPoints(5)).toHaveLength(1);
  });

  it('gives two dots at fret 12', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12] });
    expect(g.inlayPoints(12)).toHaveLength(2);
  });

  it('gives none at a fret with no inlay', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12] });
    expect(g.inlayPoints(4)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/render/fretboardGeometry.test.ts`
Expected: FAIL — cannot resolve `./fretboardGeometry`.

- [ ] **Step 3: Write the implementation**

Create `src/render/fretboardGeometry.ts`:

```ts
import type { FretPosition } from '@/music';

export type Orientation = 'horizontal' | 'vertical';
export type Point = { x: number; y: number };
export type Line = { x1: number; y1: number; x2: number; y2: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** Minimum comfortable thumb target, in CSS pixels. */
export const TOUCH_MIN = 44;

const STRING_COUNT = 6;

export const INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21] as const;
export const DOUBLE_INLAY_FRETS = [12, 24] as const;

type Padding = { top: number; right: number; bottom: number; left: number };

const BASE = {
  // Left/top padding must exceed openOffset + fretSpacing / 2, or the
  // open-string tap rect hangs off the edge of the canvas and is only
  // partly clickable. The interactive fret spacing is the binding case.
  horizontal: {
    stringSpacing: 30,
    fretSpacing: 56,
    padding: { top: 22, right: 16, bottom: 26, left: 58 } satisfies Padding,
    openOffset: 26,
  },
  vertical: {
    stringSpacing: 34,
    fretSpacing: 46,
    padding: { top: 46, right: 20, bottom: 24, left: 26 } satisfies Padding,
    openOffset: 20,
  },
} as const;

export type FretboardGeometry = {
  orientation: Orientation;
  fretRange: [number, number];
  /** Frets that get a drawn cell. Never contains 0; open strings sit in the margin. */
  cellFrets: number[];
  hasNut: boolean;
  width: number;
  height: number;
  stringSpacing: number;
  fretSpacing: number;
  markerPoint(p: FretPosition): Point;
  /** Wire `i` bounds cell `i`. There are cellFrets.length + 1 wires; wire 0 is the nut when hasNut. */
  fretWire(index: number): Line;
  stringLine(stringIndex: number): Line;
  cellRect(p: FretPosition): Rect;
  fretNumberPoint(fret: number): Point;
  inlayPoints(fret: number): Point[];
};

export function createFretboardGeometry(opts: {
  orientation: Orientation;
  fretRange: [number, number];
  interactive?: boolean;
}): FretboardGeometry {
  const { orientation, fretRange, interactive = false } = opts;
  const [lowFret, highFret] = fretRange;
  if (highFret < Math.max(1, lowFret)) {
    throw new Error(`Empty fret range: ${lowFret}-${highFret}`);
  }

  const base = BASE[orientation];
  const stringSpacing = interactive
    ? Math.max(base.stringSpacing, TOUCH_MIN)
    : base.stringSpacing;
  const fretSpacing = interactive ? Math.max(base.fretSpacing, TOUCH_MIN) : base.fretSpacing;
  const { padding, openOffset } = base;

  const hasNut = lowFret === 0;
  const cellFrets: number[] = [];
  for (let f = Math.max(1, lowFret); f <= highFret; f += 1) cellFrets.push(f);

  const stringSpan = (STRING_COUNT - 1) * stringSpacing;
  const fretSpan = cellFrets.length * fretSpacing;

  const width =
    orientation === 'horizontal'
      ? padding.left + fretSpan + padding.right
      : padding.left + stringSpan + padding.right;
  const height =
    orientation === 'horizontal'
      ? padding.top + stringSpan + padding.bottom
      : padding.top + fretSpan + padding.bottom;

  /** Position along the string axis. Low E is bottom (horizontal) or left (vertical). */
  function stringCoord(stringIndex: number): number {
    if (stringIndex < 0 || stringIndex >= STRING_COUNT) {
      throw new Error(`String index out of range: ${stringIndex}`);
    }
    return orientation === 'horizontal'
      ? padding.top + (STRING_COUNT - 1 - stringIndex) * stringSpacing
      : padding.left + stringIndex * stringSpacing;
  }

  /** Position along the fret axis, at the centre of the cell for `fret`. */
  function fretCoord(fret: number): number {
    const origin = orientation === 'horizontal' ? padding.left : padding.top;
    if (fret === 0) return origin - openOffset;
    const index = cellFrets.indexOf(fret);
    if (index === -1) throw new Error(`Fret ${fret} is outside the range ${lowFret}-${highFret}`);
    return origin + (index + 0.5) * fretSpacing;
  }

  function wireCoord(index: number): number {
    if (index < 0 || index > cellFrets.length) {
      throw new Error(`Fret wire ${index} is out of range`);
    }
    const origin = orientation === 'horizontal' ? padding.left : padding.top;
    return origin + index * fretSpacing;
  }

  return {
    orientation,
    fretRange,
    cellFrets,
    hasNut,
    width,
    height,
    stringSpacing,
    fretSpacing,

    markerPoint(p) {
      return orientation === 'horizontal'
        ? { x: fretCoord(p.fret), y: stringCoord(p.stringIndex) }
        : { x: stringCoord(p.stringIndex), y: fretCoord(p.fret) };
    },

    fretWire(index) {
      const at = wireCoord(index);
      return orientation === 'horizontal'
        ? { x1: at, y1: padding.top, x2: at, y2: padding.top + stringSpan }
        : { x1: padding.left, y1: at, x2: padding.left + stringSpan, y2: at };
    },

    stringLine(stringIndex) {
      const at = stringCoord(stringIndex);
      return orientation === 'horizontal'
        ? { x1: padding.left, y1: at, x2: padding.left + fretSpan, y2: at }
        : { x1: at, y1: padding.top, x2: at, y2: padding.top + fretSpan };
    },

    cellRect(p) {
      const alongString = stringCoord(p.stringIndex) - stringSpacing / 2;
      const origin = orientation === 'horizontal' ? padding.left : padding.top;
      const index = p.fret === 0 ? -1 : cellFrets.indexOf(p.fret);
      if (p.fret !== 0 && index === -1) {
        throw new Error(`Fret ${p.fret} is outside the range ${lowFret}-${highFret}`);
      }
      const alongFret =
        p.fret === 0 ? origin - openOffset - fretSpacing / 2 : origin + index * fretSpacing;

      return orientation === 'horizontal'
        ? { x: alongFret, y: alongString, width: fretSpacing, height: stringSpacing }
        : { x: alongString, y: alongFret, width: stringSpacing, height: fretSpacing };
    },

    fretNumberPoint(fret) {
      return orientation === 'horizontal'
        ? { x: fretCoord(fret), y: padding.top + stringSpan + 17 }
        : { x: padding.left - 14, y: fretCoord(fret) };
    },

    inlayPoints(fret) {
      if (!cellFrets.includes(fret)) return [];
      const centre = (stringCoord(0) + stringCoord(STRING_COUNT - 1)) / 2;
      const along = fretCoord(fret);
      const point = (across: number): Point =>
        orientation === 'horizontal' ? { x: along, y: across } : { x: across, y: along };

      if ((DOUBLE_INLAY_FRETS as readonly number[]).includes(fret)) {
        return [point(centre - stringSpacing), point(centre + stringSpacing)];
      }
      if ((INLAY_FRETS as readonly number[]).includes(fret)) return [point(centre)];
      return [];
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/render/fretboardGeometry.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/render/fretboardGeometry.ts src/render/fretboardGeometry.test.ts
git commit -m "$(cat <<'MSG'
feat(render): add pure fretboard coordinate geometry

Low E renders bottom when horizontal and left when vertical. Interactive
boards widen spacing to the 44px touch minimum.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 8: The Fretboard component (`src/render/Fretboard.tsx`)

**Files:**
- Create: `src/render/Fretboard.tsx`, `src/render/chordAdapter.ts`
- Test: `src/render/Fretboard.test.tsx`, `src/render/chordAdapter.test.ts`

**Interfaces:**
- Consumes: everything from Task 7; `Tuning`, `STANDARD_TUNING`, `fretToMidi`, `noteName`, `stringNumber`, `intervalBetween`, `type ChordShape`, `type PitchClass`, `type FretPosition` from `@/music`
- Produces:
  - `type MarkerTone = 'root' | 'accent' | 'ghost' | 'muted' | 'wrong' | 'correct'`
  - `type FretMarker = { stringIndex: number; fret: number; label?: string; tone?: MarkerTone }`
  - `type LabelMode = 'note' | 'interval' | 'custom' | 'none'`
  - `type FretboardProps` (exactly as written below)
  - `Fretboard: React.FC<FretboardProps>` (default export and named)
  - `chordShapeToFretboard(shape: ChordShape): { markers: FretMarker[]; mutedStrings: number[]; openStrings: number[]; barre?: FretboardProps['barre']; fretRange: [number, number] }`

The spec lists a `'finger'` label mode. It is subsumed by `'custom'`: chord diagrams pass finger numbers as `marker.label`, which keeps the component from needing to know what a finger is.

- [ ] **Step 1: Write the failing tests for the chord adapter**

Create `src/render/chordAdapter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { chordShapeToFretboard } from './chordAdapter';
import type { ChordShape } from '@/music';

const aMinorOpen: ChordShape = {
  id: 'Am-open',
  name: 'Am',
  root: 9,
  quality: 'min',
  baseFret: 1,
  frets: [null, 0, 2, 2, 1, 0],
  fingers: [null, null, 2, 3, 1, null],
  difficulty: 1,
};

const fMajorBarre: ChordShape = {
  id: 'F-barre',
  name: 'F',
  root: 5,
  quality: 'maj',
  baseFret: 1,
  frets: [1, 3, 3, 2, 1, 1],
  fingers: [1, 3, 4, 2, 1, 1],
  barre: { fret: 1, fromStringIndex: 0, toStringIndex: 5 },
  difficulty: 3,
};

describe('chordShapeToFretboard', () => {
  it('emits a marker only for fretted strings', () => {
    const { markers } = chordShapeToFretboard(aMinorOpen);
    expect(markers.map((m) => m.stringIndex)).toEqual([2, 3, 4]);
  });

  it('labels markers with finger numbers', () => {
    const { markers } = chordShapeToFretboard(aMinorOpen);
    expect(markers.map((m) => m.label)).toEqual(['2', '3', '1']);
  });

  it('separates muted from open strings', () => {
    const { mutedStrings, openStrings } = chordShapeToFretboard(aMinorOpen);
    expect(mutedStrings).toEqual([0]);
    expect(openStrings).toEqual([1, 5]);
  });

  it('shows five frets from the first fretted note', () => {
    expect(chordShapeToFretboard(aMinorOpen).fretRange).toEqual([0, 4]);
  });

  it('passes the barre through', () => {
    expect(chordShapeToFretboard(fMajorBarre).barre).toEqual({
      fret: 1,
      fromStringIndex: 0,
      toStringIndex: 5,
    });
  });

  it('reports no open or muted strings for a full barre shape', () => {
    const { mutedStrings, openStrings } = chordShapeToFretboard(fMajorBarre);
    expect(mutedStrings).toEqual([]);
    expect(openStrings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/render/chordAdapter.test.ts`
Expected: FAIL — cannot resolve `./chordAdapter`.

- [ ] **Step 3: Write `src/render/chordAdapter.ts`**

```ts
import type { ChordShape } from '@/music';
import type { FretMarker } from './Fretboard';

export type ChordFretboardProps = {
  markers: FretMarker[];
  mutedStrings: number[];
  openStrings: number[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  fretRange: [number, number];
};

const DIAGRAM_FRETS = 4;

/** Splits a ChordShape into the props the Fretboard component understands. */
export function chordShapeToFretboard(shape: ChordShape): ChordFretboardProps {
  const markers: FretMarker[] = [];
  const mutedStrings: number[] = [];
  const openStrings: number[] = [];

  shape.frets.forEach((fret, stringIndex) => {
    if (fret === null || fret === undefined) {
      mutedStrings.push(stringIndex);
      return;
    }
    if (fret === 0) {
      openStrings.push(stringIndex);
      return;
    }
    const finger = shape.fingers[stringIndex];
    markers.push({
      stringIndex,
      fret,
      label: finger === null || finger === undefined ? undefined : String(finger),
      tone: 'accent',
    });
  });

  const frettedFrets = markers.map((m) => m.fret);
  const lowest = frettedFrets.length === 0 ? 1 : Math.min(...frettedFrets);
  const start = lowest <= 1 ? 0 : lowest;
  const end = (start === 0 ? 1 : start) + DIAGRAM_FRETS - 1;

  return {
    markers,
    mutedStrings,
    openStrings,
    barre: shape.barre,
    fretRange: [start, end],
  };
}
```

For an open shape the lowest fretted note is 1 or 2, so `start` is 0 and `fretRange` is `[0, 4]` — the nut plus four cells, which is the conventional chord box.

- [ ] **Step 4: Run to verify the adapter passes**

Run: `npm test -- --run src/render/chordAdapter.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the failing component tests**

Create `src/render/Fretboard.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Fretboard } from './Fretboard';

describe('Fretboard', () => {
  it('renders one marker per position', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[
          { stringIndex: 0, fret: 3 },
          { stringIndex: 2, fret: 2 },
        ]}
      />,
    );
    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(2);
  });

  it('labels markers with note names in note mode', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        labelMode="note"
        markers={[{ stringIndex: 0, fret: 3 }]}
      />,
    );
    expect(screen.getByTestId('marker-s0f3')).toHaveTextContent('G');
  });

  it('labels markers with intervals when given a root', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        labelMode="interval"
        intervalRootMidi={40}
        markers={[{ stringIndex: 0, fret: 5 }]}
      />,
    );
    // The open low E is MIDI 40; fret 5 is 45, a perfect fourth above it.
    expect(screen.getByTestId('marker-s0f5')).toHaveTextContent('P4');
  });

  it('uses the marker label in custom mode', () => {
    render(
      <Fretboard
        orientation="vertical"
        fretRange={[0, 4]}
        labelMode="custom"
        markers={[{ stringIndex: 3, fret: 2, label: '3' }]}
      />,
    );
    expect(screen.getByTestId('marker-s3f2')).toHaveTextContent('3');
  });

  it('marks muted and open strings', () => {
    render(
      <Fretboard
        orientation="vertical"
        fretRange={[0, 4]}
        markers={[]}
        mutedStrings={[0]}
        openStrings={[1, 5]}
      />,
    );
    expect(screen.getByTestId('muted-s0')).toBeInTheDocument();
    expect(screen.getByTestId('open-s1')).toBeInTheDocument();
    expect(screen.getByTestId('open-s5')).toBeInTheDocument();
  });

  it('draws a barre when given one', () => {
    render(
      <Fretboard
        orientation="vertical"
        fretRange={[0, 4]}
        markers={[]}
        barre={{ fret: 1, fromStringIndex: 0, toStringIndex: 5 }}
      />,
    );
    expect(screen.getByTestId('barre')).toBeInTheDocument();
  });

  it('reports the tapped position', () => {
    const onFretTap = vi.fn();
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[]}
        onFretTap={onFretTap}
      />,
    );
    fireEvent.click(screen.getByTestId('cell-s2f3'));
    expect(onFretTap).toHaveBeenCalledWith({ stringIndex: 2, fret: 3 });
  });

  it('offers an open-string tap target when the nut is shown', () => {
    const onFretTap = vi.fn();
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[]}
        onFretTap={onFretTap}
      />,
    );
    fireEvent.click(screen.getByTestId('cell-s0f0'));
    expect(onFretTap).toHaveBeenCalledWith({ stringIndex: 0, fret: 0 });
  });

  it('renders no tap targets when it is not interactive', () => {
    render(<Fretboard orientation="horizontal" fretRange={[0, 5]} markers={[]} />);
    expect(screen.queryByTestId('cell-s2f3')).toBeNull();
  });

  it('gives each tap target an accessible label naming the note', () => {
    render(
      <Fretboard
        orientation="horizontal"
        fretRange={[0, 5]}
        markers={[]}
        onFretTap={() => {}}
      />,
    );
    expect(screen.getByTestId('cell-s0f3')).toHaveAttribute(
      'aria-label',
      'G2, string 6, fret 3',
    );
  });
});
```

- [ ] **Step 6: Run to verify the component tests fail**

Run: `npm test -- --run src/render/Fretboard.test.tsx`
Expected: FAIL — cannot resolve `./Fretboard`.

- [ ] **Step 7: Write `src/render/Fretboard.tsx`**

```tsx
import { useMemo } from 'react';
import {
  STANDARD_TUNING,
  fretToMidi,
  intervalBetween,
  noteName,
  stringNumber,
  type FretPosition,
  type Midi,
  type Tuning,
} from '@/music';
import {
  createFretboardGeometry,
  type Orientation,
  type FretboardGeometry,
} from './fretboardGeometry';

export type MarkerTone = 'root' | 'accent' | 'ghost' | 'muted' | 'wrong' | 'correct';

export type FretMarker = {
  stringIndex: number;
  fret: number;
  label?: string;
  tone?: MarkerTone;
};

export type LabelMode = 'note' | 'interval' | 'custom' | 'none';

export type FretboardProps = {
  orientation: Orientation;
  fretRange: [number, number];
  markers: FretMarker[];
  tuning?: Tuning;
  labelMode?: LabelMode;
  /** Required by labelMode "interval"; ignored otherwise. */
  intervalRootMidi?: Midi;
  mutedStrings?: number[];
  openStrings?: number[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  showInlays?: boolean;
  showFretNumbers?: boolean;
  /** Passing this makes the board interactive: bigger cells and tap targets. */
  onFretTap?: (position: FretPosition) => void;
  className?: string;
  ariaLabel?: string;
};

/** Low E is thickest. Index matches stringIndex. */
const STRING_WIDTHS = [3.2, 2.8, 2.4, 1.9, 1.5, 1.2];

const TONE_FILL: Record<MarkerTone, string> = {
  root: 'var(--color-accent)',
  accent: 'var(--color-ink)',
  ghost: 'var(--color-surface-2)',
  muted: 'var(--color-ink-dim)',
  wrong: 'var(--color-bad)',
  correct: 'var(--color-good)',
};

const TONE_TEXT: Record<MarkerTone, string> = {
  root: 'var(--color-ground)',
  accent: 'var(--color-ground)',
  ghost: 'var(--color-ink-dim)',
  muted: 'var(--color-ground)',
  wrong: 'var(--color-ground)',
  correct: 'var(--color-ground)',
};

function markerText(
  marker: FretMarker,
  labelMode: LabelMode,
  tuning: Tuning,
  intervalRootMidi: Midi | undefined,
): string {
  if (labelMode === 'none') return '';
  if (labelMode === 'custom') return marker.label ?? '';
  const midi = fretToMidi(tuning, marker.stringIndex, marker.fret);
  if (labelMode === 'note') return noteName(midi);
  if (intervalRootMidi === undefined) return '';
  return intervalBetween(intervalRootMidi, midi).shortName;
}

export function Fretboard({
  orientation,
  fretRange,
  markers,
  tuning = STANDARD_TUNING,
  labelMode = 'none',
  intervalRootMidi,
  mutedStrings = [],
  openStrings = [],
  barre,
  showInlays = true,
  showFretNumbers = true,
  onFretTap,
  className,
  ariaLabel,
}: FretboardProps) {
  const interactive = onFretTap !== undefined;

  const geometry: FretboardGeometry = useMemo(
    () => createFretboardGeometry({ orientation, fretRange, interactive }),
    [orientation, fretRange, interactive],
  );

  const markerRadius = Math.min(geometry.stringSpacing, geometry.fretSpacing) * 0.34;
  const tappableFrets = geometry.hasNut ? [0, ...geometry.cellFrets] : geometry.cellFrets;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={geometry.width}
      height={geometry.height}
      role="img"
      aria-label={ariaLabel ?? 'Guitar fretboard'}
      data-testid="fretboard"
    >
      <rect
        x={geometry.fretWire(0).x1}
        y={geometry.fretWire(0).y1}
        width={
          orientation === 'horizontal'
            ? geometry.cellFrets.length * geometry.fretSpacing
            : 5 * geometry.stringSpacing
        }
        height={
          orientation === 'horizontal'
            ? 5 * geometry.stringSpacing
            : geometry.cellFrets.length * geometry.fretSpacing
        }
        fill="var(--color-wood)"
        rx={4}
      />

      {showInlays &&
        geometry.cellFrets.flatMap((fret) =>
          geometry.inlayPoints(fret).map((point, i) => (
            <circle
              key={`inlay-${fret}-${i}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="var(--color-wood-light)"
            />
          )),
        )}

      {Array.from({ length: geometry.cellFrets.length + 1 }, (_, i) => {
        const line = geometry.fretWire(i);
        const isNut = i === 0 && geometry.hasNut;
        return (
          <line
            key={`wire-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={isNut ? 'var(--color-ink)' : 'var(--color-fret)'}
            strokeWidth={isNut ? 5 : 1.6}
            strokeLinecap="round"
            data-testid={isNut ? 'nut' : `wire-${i}`}
          />
        );
      })}

      {STRING_WIDTHS.map((strokeWidth, stringIndex) => {
        const line = geometry.stringLine(stringIndex);
        return (
          <line
            key={`string-${stringIndex}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--color-ink-dim)"
            strokeWidth={strokeWidth}
            data-testid={`string-${stringIndex}`}
          />
        );
      })}

      {barre !== undefined && geometry.cellFrets.includes(barre.fret) && (
        <BarreShape geometry={geometry} barre={barre} radius={markerRadius} />
      )}

      {showFretNumbers &&
        geometry.cellFrets.map((fret) => {
          const point = geometry.fretNumberPoint(fret);
          return (
            <text
              key={`fretnum-${fret}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--color-ink-dim)"
            >
              {fret}
            </text>
          );
        })}

      {mutedStrings.map((stringIndex) => {
        const point = geometry.markerPoint({ stringIndex, fret: 0 });
        return (
          <text
            key={`muted-${stringIndex}`}
            data-testid={`muted-s${stringIndex}`}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fill="var(--color-ink-dim)"
          >
            ×
          </text>
        );
      })}

      {openStrings.map((stringIndex) => {
        const point = geometry.markerPoint({ stringIndex, fret: 0 });
        return (
          <circle
            key={`open-${stringIndex}`}
            data-testid={`open-s${stringIndex}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill="none"
            stroke="var(--color-ink-dim)"
            strokeWidth={1.6}
          />
        );
      })}

      {markers.map((marker) => {
        const point = geometry.markerPoint(marker);
        const tone = marker.tone ?? 'accent';
        const text = markerText(marker, labelMode, tuning, intervalRootMidi);
        return (
          <g key={`marker-s${marker.stringIndex}f${marker.fret}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={markerRadius}
              fill={TONE_FILL[tone]}
              stroke={tone === 'ghost' ? 'var(--color-ink-dim)' : 'none'}
              strokeWidth={1.2}
            />
            <text
              data-testid={`marker-s${marker.stringIndex}f${marker.fret}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={markerRadius * 0.95}
              fontWeight={700}
              fill={TONE_TEXT[tone]}
            >
              {text}
            </text>
          </g>
        );
      })}

      {interactive &&
        tappableFrets.flatMap((fret) =>
          STRING_WIDTHS.map((_, stringIndex) => {
            const rect = geometry.cellRect({ stringIndex, fret });
            const midi = fretToMidi(tuning, stringIndex, fret);
            return (
              <rect
                key={`cell-s${stringIndex}f${fret}`}
                data-testid={`cell-s${stringIndex}f${fret}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`${noteName(midi, { withOctave: true })}, string ${stringNumber(stringIndex)}, fret ${fret}`}
                onClick={() => onFretTap?.({ stringIndex, fret })}
              />
            );
          }),
        )}
    </svg>
  );
}

function BarreShape({
  geometry,
  barre,
  radius,
}: {
  geometry: FretboardGeometry;
  barre: { fret: number; fromStringIndex: number; toStringIndex: number };
  radius: number;
}) {
  const from = geometry.markerPoint({ stringIndex: barre.fromStringIndex, fret: barre.fret });
  const to = geometry.markerPoint({ stringIndex: barre.toStringIndex, fret: barre.fret });
  const x = Math.min(from.x, to.x) - radius;
  const y = Math.min(from.y, to.y) - radius;
  const width = Math.abs(to.x - from.x) + radius * 2;
  const height = Math.abs(to.y - from.y) + radius * 2;

  return (
    <rect
      data-testid="barre"
      x={x}
      y={y}
      width={width}
      height={height}
      rx={radius}
      fill="var(--color-ink)"
      opacity={0.92}
    />
  );
}

export default Fretboard;
```

- [ ] **Step 8: Run the component tests**

Run: `npm test -- --run src/render/`
Expected: all pass. If `marker-s0f5` has no text content, check that `labelMode` reaches `markerText` and that `intervalRootMidi` is passed through.

- [ ] **Step 9: Commit**

```bash
git add src/render/Fretboard.tsx src/render/Fretboard.test.tsx src/render/chordAdapter.ts src/render/chordAdapter.test.ts
git commit -m "$(cat <<'MSG'
feat(render): add the shared SVG Fretboard component

One component serves chord diagrams, quizzes and the explorer. Tap
targets are separate invisible rects sized for thumbs, independent of
the visual dot size.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 9: Riff content model and seed riffs (`src/content/`)

**Files:**
- Create: `src/content/types.ts`, `src/content/riffs.ts`, `src/content/index.ts`
- Test: `src/content/types.test.ts`, `src/content/riffs.test.ts`

**Interfaces:**
- Consumes: `type Tuning`, `STANDARD_TUNING`, `fretToMidi`, `MAX_FRET`, `STRING_COUNT` from `@/music`
- Produces:
  - `type Technique = 'hammer' | 'pull' | 'slide' | 'bend' | 'palmMute'`
  - `type TabEvent = { stringIndex: number; fret: number; beat: number; duration: number; technique?: Technique }`
  - `type TimeSignature = readonly [number, number]`
  - `type Riff` (fields exactly as written below)
  - `beatsPerBar(timeSignature: TimeSignature): number`
  - `riffTotalBeats(riff: Riff): number`
  - `validateRiff(riff: Riff): string[]`
  - `const RIFFS: readonly Riff[]`, `getRiff(id: string): Riff | undefined`

Every riff in this plan is an exercise written for this app. `source` is `'original'` throughout; no third-party tablature enters the repository.

- [ ] **Step 1: Write the failing tests for the model**

Create `src/content/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { beatsPerBar, riffTotalBeats, validateRiff, type Riff } from './types';

const valid: Riff = {
  id: 'test-riff',
  title: 'Test',
  style: 'exercise',
  level: 1,
  bpm: 90,
  timeSignature: [4, 4],
  bars: 1,
  source: 'original',
  tags: [],
  events: [
    { stringIndex: 0, fret: 0, beat: 0, duration: 1 },
    { stringIndex: 0, fret: 2, beat: 1, duration: 1 },
    { stringIndex: 0, fret: 3, beat: 2, duration: 2 },
  ],
};

describe('beatsPerBar', () => {
  it('counts four quarter notes in 4/4', () => {
    expect(beatsPerBar([4, 4])).toBe(4);
  });

  it('counts three quarter notes in 3/4', () => {
    expect(beatsPerBar([3, 4])).toBe(3);
  });

  it('counts six eighth notes as three quarter notes in 6/8', () => {
    expect(beatsPerBar([6, 8])).toBe(3);
  });
});

describe('riffTotalBeats', () => {
  it('multiplies bars by beats per bar', () => {
    expect(riffTotalBeats({ ...valid, bars: 4 })).toBe(16);
  });
});

describe('validateRiff', () => {
  it('accepts a well-formed riff', () => {
    expect(validateRiff(valid)).toEqual([]);
  });

  it('rejects an empty riff', () => {
    expect(validateRiff({ ...valid, events: [] }).join(' ')).toContain('no events');
  });

  it('rejects a string index outside the instrument', () => {
    const bad = { ...valid, events: [{ stringIndex: 6, fret: 0, beat: 0, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('string index');
  });

  it('rejects a fret above the neck', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 30, beat: 0, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('fret');
  });

  it('rejects a note starting before the riff', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: -1, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('starts at');
  });

  it('rejects a note starting after the last bar ends', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: 4, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('starts at');
  });

  it('rejects a note that rings past the last bar', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: 3, duration: 2 }] };
    expect(validateRiff(bad).join(' ')).toContain('past the end');
  });

  it('rejects a zero-length note', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: 0, duration: 0 }] };
    expect(validateRiff(bad).join(' ')).toContain('duration');
  });

  it('rejects an implausible tempo', () => {
    expect(validateRiff({ ...valid, bpm: 5 }).join(' ')).toContain('bpm');
  });

  it('requires attribution on public-domain material', () => {
    const bad: Riff = { ...valid, source: 'public-domain' };
    expect(validateRiff(bad).join(' ')).toContain('attribution');
  });

  it('accepts public-domain material that carries attribution', () => {
    const ok: Riff = { ...valid, source: 'public-domain', attribution: 'Traditional' };
    expect(validateRiff(ok)).toEqual([]);
  });

  it('rejects two notes on the same string at the same moment', () => {
    const bad = {
      ...valid,
      events: [
        { stringIndex: 0, fret: 0, beat: 0, duration: 1 },
        { stringIndex: 0, fret: 3, beat: 0, duration: 1 },
      ],
    };
    expect(validateRiff(bad).join(' ')).toContain('same string');
  });
});
```

The last case matters: a guitar string can sound only one pitch at a time, so two events sharing a string and a beat are always an authoring mistake.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/content/types.test.ts`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 3: Write `src/content/types.ts`**

```ts
import { MAX_FRET, STRING_COUNT } from '@/music';

export type Technique = 'hammer' | 'pull' | 'slide' | 'bend' | 'palmMute';

export type TimeSignature = readonly [number, number];

export type TabEvent = {
  stringIndex: number;
  fret: number;
  /** Quarter-note units from the start of the riff. */
  beat: number;
  /** Length in quarter-note units. */
  duration: number;
  technique?: Technique;
};

export type Riff = {
  id: string;
  title: string;
  style: string;
  level: 1 | 2 | 3 | 4 | 5;
  bpm: number;
  timeSignature: TimeSignature;
  bars: number;
  events: TabEvent[];
  tags: string[];
  source: 'original' | 'public-domain';
  attribution?: string;
};

const EPSILON = 1e-6;

/** Length of one bar in quarter-note units. 6/8 is three quarter notes. */
export function beatsPerBar(timeSignature: TimeSignature): number {
  const [numerator, denominator] = timeSignature;
  return (numerator * 4) / denominator;
}

export function riffTotalBeats(riff: Riff): number {
  return riff.bars * beatsPerBar(riff.timeSignature);
}

/**
 * Returns human-readable problems with a riff; an empty array means it is
 * sound. Riff data is hand-authored, so this is the net that stops a typo
 * producing a note that plays outside its own loop.
 */
export function validateRiff(riff: Riff): string[] {
  const errors: string[] = [];

  if (riff.id.trim() === '') errors.push('riff has an empty id');
  if (riff.bars < 1) errors.push(`${riff.id}: bars must be at least 1`);
  if (riff.bpm < 30 || riff.bpm > 300) errors.push(`${riff.id}: bpm ${riff.bpm} is implausible`);
  if (riff.source === 'public-domain' && (riff.attribution ?? '').trim() === '') {
    errors.push(`${riff.id}: public-domain material needs an attribution`);
  }
  if (riff.events.length === 0) {
    errors.push(`${riff.id}: has no events`);
    return errors;
  }

  const total = riffTotalBeats(riff);
  const seen = new Set<string>();

  for (const event of riff.events) {
    const where = `${riff.id}: note on string ${event.stringIndex} at beat ${event.beat}`;

    if (!Number.isInteger(event.stringIndex) || event.stringIndex < 0 || event.stringIndex >= STRING_COUNT) {
      errors.push(`${where} has an out-of-range string index`);
      continue;
    }
    if (!Number.isInteger(event.fret) || event.fret < 0 || event.fret > MAX_FRET) {
      errors.push(`${where} has an out-of-range fret (${event.fret})`);
    }
    if (event.beat < 0 || event.beat >= total) {
      errors.push(`${where} starts at ${event.beat}, outside the riff's ${total} beats`);
    }
    if (event.duration <= 0) {
      errors.push(`${where} has a non-positive duration`);
    } else if (event.beat + event.duration > total + EPSILON) {
      errors.push(`${where} rings past the end of the riff`);
    }

    const key = `${event.stringIndex}@${event.beat}`;
    if (seen.has(key)) {
      errors.push(`${where} collides with another note on the same string at the same beat`);
    }
    seen.add(key);
  }

  return errors;
}
```

- [ ] **Step 4: Run to verify the model passes**

Run: `npm test -- --run src/content/types.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the failing riff-library test**

Create `src/content/riffs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { RIFFS, getRiff } from './riffs';
import { riffTotalBeats, validateRiff } from './types';
import { STANDARD_TUNING, fretToMidi, midiToPitchClass } from '@/music';

describe('the riff library', () => {
  it('ships at least three riffs', () => {
    expect(RIFFS.length).toBeGreaterThanOrEqual(3);
  });

  it('has a unique id for every riff', () => {
    expect(new Set(RIFFS.map((r) => r.id)).size).toBe(RIFFS.length);
  });

  it('contains only material written for this app', () => {
    for (const riff of RIFFS) {
      expect(riff.source).toBe('original');
    }
  });

  it('passes validation for every riff', () => {
    const problems = RIFFS.flatMap((riff) => validateRiff(riff));
    expect(problems).toEqual([]);
  });

  it('starts every riff on beat 0 so a loop has no dead air at the front', () => {
    for (const riff of RIFFS) {
      expect(Math.min(...riff.events.map((e) => e.beat))).toBe(0);
    }
  });

  it('finds a riff by id', () => {
    expect(getRiff('chromatic-warmup')?.title).toBe('Chromatic warm-up');
  });

  it('returns undefined for an unknown id', () => {
    expect(getRiff('does-not-exist')).toBeUndefined();
  });
});

describe('em-pentatonic-box1', () => {
  it('uses only notes from the E minor pentatonic scale', () => {
    const riff = getRiff('em-pentatonic-box1');
    expect(riff).toBeDefined();
    if (riff === undefined) return;

    // E minor pentatonic: E G A B D -> pitch classes 4, 7, 9, 11, 2
    const allowed = new Set([4, 7, 9, 11, 2]);
    for (const event of riff.events) {
      const pc = midiToPitchClass(fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret));
      expect(allowed.has(pc)).toBe(true);
    }
  });

  it('rings to the end of its final bar', () => {
    const riff = getRiff('em-pentatonic-box1');
    expect(riff).toBeDefined();
    if (riff === undefined) return;
    const last = riff.events.reduce((a, b) => (b.beat > a.beat ? b : a));
    expect(last.beat + last.duration).toBe(riffTotalBeats(riff));
  });
});

describe('power-chord-drive', () => {
  it('sounds only roots and fifths', () => {
    const riff = getRiff('power-chord-drive');
    expect(riff).toBeDefined();
    if (riff === undefined) return;

    const byBeat = new Map<number, number[]>();
    for (const event of riff.events) {
      const midi = fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret);
      byBeat.set(event.beat, [...(byBeat.get(event.beat) ?? []), midi]);
    }
    for (const [, midis] of byBeat) {
      expect(midis).toHaveLength(2);
      const sorted = [...midis].sort((a, b) => a - b);
      const low = sorted[0];
      const high = sorted[1];
      expect(low).toBeDefined();
      expect(high).toBeDefined();
      if (low === undefined || high === undefined) return;
      expect(high - low).toBe(7);
    }
  });
});
```

- [ ] **Step 6: Run to verify the library test fails**

Run: `npm test -- --run src/content/riffs.test.ts`
Expected: FAIL — cannot resolve `./riffs`.

- [ ] **Step 7: Write `src/content/riffs.ts`**

```ts
import type { Riff, TabEvent } from './types';

/** Ascending run of four consecutive frets on one string, in eighth notes. */
function chromaticRun(stringIndex: number, startBeat: number): TabEvent[] {
  return [1, 2, 3, 4].map((fret, i) => ({
    stringIndex,
    fret,
    beat: startBeat + i * 0.5,
    duration: 0.5,
  }));
}

/** Two notes a fifth apart, struck together as a power chord. */
function powerChord(
  stringIndex: number,
  rootFret: number,
  beat: number,
  duration: number,
): TabEvent[] {
  return [
    { stringIndex, fret: rootFret, beat, duration, technique: 'palmMute' },
    { stringIndex: stringIndex + 1, fret: rootFret + 2, beat, duration, technique: 'palmMute' },
  ];
}

const chromaticWarmup: Riff = {
  id: 'chromatic-warmup',
  title: 'Chromatic warm-up',
  style: 'Warm-up',
  level: 1,
  bpm: 80,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['warm-up', 'first-position', 'one-finger-per-fret'],
  events: [
    ...chromaticRun(0, 0),
    ...chromaticRun(1, 2),
    ...chromaticRun(2, 4),
    ...chromaticRun(3, 6),
  ],
};

const emPentatonicBox1: Riff = {
  id: 'em-pentatonic-box1',
  title: 'E minor pentatonic, box one',
  style: 'Scale',
  level: 2,
  bpm: 90,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['pentatonic', 'E minor', 'open-position'],
  events: [
    { stringIndex: 0, fret: 0, beat: 0, duration: 0.5 },
    { stringIndex: 0, fret: 3, beat: 0.5, duration: 0.5 },
    { stringIndex: 1, fret: 0, beat: 1, duration: 0.5 },
    { stringIndex: 1, fret: 2, beat: 1.5, duration: 0.5 },
    { stringIndex: 2, fret: 0, beat: 2, duration: 0.5 },
    { stringIndex: 2, fret: 2, beat: 2.5, duration: 0.5 },
    { stringIndex: 3, fret: 0, beat: 3, duration: 0.5 },
    { stringIndex: 3, fret: 2, beat: 3.5, duration: 0.5 },
    { stringIndex: 4, fret: 0, beat: 4, duration: 0.5 },
    { stringIndex: 4, fret: 3, beat: 4.5, duration: 0.5 },
    { stringIndex: 5, fret: 0, beat: 5, duration: 0.5 },
    // The final note is held for the rest of the bar so the loop breathes.
    { stringIndex: 5, fret: 3, beat: 5.5, duration: 2.5 },
  ],
};

const powerChordDrive: Riff = {
  id: 'power-chord-drive',
  title: 'Power chord drive',
  style: 'Rock',
  level: 2,
  bpm: 120,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['power-chords', 'palm-muting', 'downstrokes'],
  events: [
    // Bar 1: E5 on the low E and A strings.
    ...[0, 1, 2, 3].flatMap((beat) => powerChord(0, 0, beat, 1)),
    // Bar 2: G5.
    ...[4, 5, 6, 7].flatMap((beat) => powerChord(0, 3, beat, 1)),
    // Bar 3: A5.
    ...[8, 9, 10, 11].flatMap((beat) => powerChord(0, 5, beat, 1)),
    // Bar 4: back to E5.
    ...[12, 13, 14, 15].flatMap((beat) => powerChord(0, 0, beat, 1)),
  ],
};

export const RIFFS: readonly Riff[] = [chromaticWarmup, emPentatonicBox1, powerChordDrive];

export function getRiff(id: string): Riff | undefined {
  return RIFFS.find((riff) => riff.id === id);
}
```

- [ ] **Step 8: Write `src/content/index.ts`**

```ts
export * from './types';
export * from './riffs';
```

- [ ] **Step 9: Run the content suite**

Run: `npm test -- --run src/content/`
Expected: all pass. A failure in `passes validation for every riff` prints the exact offending note — fix the riff data, never the validator.

- [ ] **Step 10: Commit**

```bash
git add src/content/
git commit -m "$(cat <<'MSG'
feat(content): add the riff model and three seed exercises

validateRiff catches notes that fall outside their own loop and two
notes fighting for one string. All seed material is written for this app.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 10: Tab staff (`src/render/tabGeometry.ts`, `src/render/TabStaff.tsx`)

**Files:**
- Create: `src/render/tabGeometry.ts`, `src/render/TabStaff.tsx`
- Test: `src/render/tabGeometry.test.ts`, `src/render/TabStaff.test.tsx`

**Interfaces:**
- Consumes: `Line` from `./fretboardGeometry`; `type Riff`, `type TabEvent`, `type Technique`, `type TimeSignature`, `beatsPerBar` from `@/content`

Tab notation shows fret numbers, not pitches, so `TabStaff` needs no tuning and imports nothing from `@/music`.
- Produces:
  - `type TabGeometry` with `width`, `height`, `beatWidth`, `stringSpacing`, `totalBeats`, `xForBeat`, `yForString`, `barLineXs`, `staffLine`, `staffTop`, `staffBottom`
  - `createTabGeometry(opts: { bars: number; timeSignature: TimeSignature; beatWidth?: number; stringSpacing?: number }): TabGeometry`
  - `type TabStaffProps`, `TabStaff: React.FC<TabStaffProps>`

The parent owns the geometry object and passes it in, so the parent can also map playback progress to a playhead x-coordinate without the component re-rendering.

- [ ] **Step 1: Write the failing geometry tests**

Create `src/render/tabGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTabGeometry } from './tabGeometry';

describe('createTabGeometry', () => {
  const g = createTabGeometry({ bars: 4, timeSignature: [4, 4] });

  it('counts total beats from bars and time signature', () => {
    expect(g.totalBeats).toBe(16);
  });

  it('handles three-four', () => {
    expect(createTabGeometry({ bars: 4, timeSignature: [3, 4] }).totalBeats).toBe(12);
  });

  it('advances x linearly with beat', () => {
    expect(g.xForBeat(2) - g.xForBeat(1)).toBeCloseTo(g.xForBeat(1) - g.xForBeat(0));
  });

  it('puts the low E on the bottom line, matching tab convention', () => {
    expect(g.yForString(0)).toBeGreaterThan(g.yForString(5));
  });

  it('spaces the six staff lines evenly', () => {
    expect(g.yForString(0) - g.yForString(1)).toBeCloseTo(g.yForString(4) - g.yForString(5));
  });

  it('draws one bar line per bar plus a closing line', () => {
    expect(g.barLineXs()).toHaveLength(5);
  });

  it('puts the first bar line at beat 0 and the last at the end', () => {
    const xs = g.barLineXs();
    expect(xs[0]).toBeCloseTo(g.xForBeat(0));
    expect(xs[xs.length - 1]).toBeCloseTo(g.xForBeat(16));
  });

  it('is wide enough to contain the final beat', () => {
    expect(g.xForBeat(g.totalBeats)).toBeLessThanOrEqual(g.width);
  });

  it('rejects a riff with no bars', () => {
    expect(() => createTabGeometry({ bars: 0, timeSignature: [4, 4] })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/render/tabGeometry.test.ts`
Expected: FAIL — cannot resolve `./tabGeometry`.

- [ ] **Step 3: Write `src/render/tabGeometry.ts`**

```ts
import { beatsPerBar, type TimeSignature } from '@/content';
import type { Line } from './fretboardGeometry';

const STRING_COUNT = 6;

const DEFAULTS = {
  beatWidth: 64,
  stringSpacing: 22,
  padding: { top: 26, right: 32, bottom: 26, left: 34 },
} as const;

export type TabGeometry = {
  width: number;
  height: number;
  beatWidth: number;
  stringSpacing: number;
  totalBeats: number;
  beatsPerBar: number;
  bars: number;
  staffTop: number;
  staffBottom: number;
  xForBeat(beat: number): number;
  yForString(stringIndex: number): number;
  barLineXs(): number[];
  staffLine(stringIndex: number): Line;
};

export function createTabGeometry(opts: {
  bars: number;
  timeSignature: TimeSignature;
  beatWidth?: number;
  stringSpacing?: number;
}): TabGeometry {
  const { bars, timeSignature } = opts;
  if (bars < 1) throw new Error(`A tab staff needs at least one bar, got ${bars}`);

  const beatWidth = opts.beatWidth ?? DEFAULTS.beatWidth;
  const stringSpacing = opts.stringSpacing ?? DEFAULTS.stringSpacing;
  const padding = DEFAULTS.padding;

  const perBar = beatsPerBar(timeSignature);
  const totalBeats = bars * perBar;

  const staffTop = padding.top;
  const staffBottom = padding.top + (STRING_COUNT - 1) * stringSpacing;

  const width = padding.left + totalBeats * beatWidth + padding.right;
  const height = staffBottom + padding.bottom;

  function xForBeat(beat: number): number {
    return padding.left + beat * beatWidth;
  }

  /** Low E is the bottom line, as in tab notation. */
  function yForString(stringIndex: number): number {
    if (stringIndex < 0 || stringIndex >= STRING_COUNT) {
      throw new Error(`String index out of range: ${stringIndex}`);
    }
    return padding.top + (STRING_COUNT - 1 - stringIndex) * stringSpacing;
  }

  return {
    width,
    height,
    beatWidth,
    stringSpacing,
    totalBeats,
    beatsPerBar: perBar,
    bars,
    staffTop,
    staffBottom,
    xForBeat,
    yForString,
    barLineXs() {
      return Array.from({ length: bars + 1 }, (_, i) => xForBeat(i * perBar));
    },
    staffLine(stringIndex) {
      const y = yForString(stringIndex);
      return { x1: xForBeat(0), y1: y, x2: xForBeat(totalBeats), y2: y };
    },
  };
}
```

- [ ] **Step 4: Run to verify the geometry passes**

Run: `npm test -- --run src/render/tabGeometry.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the failing component tests**

Create `src/render/TabStaff.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabStaff } from './TabStaff';
import { createTabGeometry } from './tabGeometry';
import { getRiff } from '@/content';

const riff = getRiff('em-pentatonic-box1');
if (riff === undefined) throw new Error('seed riff missing');

const geometry = createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature });

describe('TabStaff', () => {
  it('draws six staff lines', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getAllByTestId(/^staff-line-/)).toHaveLength(6);
  });

  it('draws one fret number per event', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getAllByTestId(/^tab-note-/)).toHaveLength(riff.events.length);
  });

  it('shows the fret number as the note text', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getByTestId('tab-note-0')).toHaveTextContent('0');
    expect(screen.getByTestId('tab-note-1')).toHaveTextContent('3');
  });

  it('draws one bar line per bar plus the closing line', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getAllByTestId(/^bar-line-/)).toHaveLength(riff.bars + 1);
  });

  it('labels the strings low to high', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.getByTestId('string-label-0')).toHaveTextContent('E');
    expect(screen.getByTestId('string-label-5')).toHaveTextContent('e');
  });

  it('renders a playhead when asked', () => {
    render(<TabStaff riff={riff} geometry={geometry} showPlayhead />);
    expect(screen.getByTestId('playhead')).toBeInTheDocument();
  });

  it('omits the playhead by default', () => {
    render(<TabStaff riff={riff} geometry={geometry} />);
    expect(screen.queryByTestId('playhead')).toBeNull();
  });

  it('marks palm-muted notes', () => {
    const rock = getRiff('power-chord-drive');
    expect(rock).toBeDefined();
    if (rock === undefined) return;
    const rockGeometry = createTabGeometry({ bars: rock.bars, timeSignature: rock.timeSignature });
    render(<TabStaff riff={rock} geometry={rockGeometry} />);
    expect(screen.getAllByTestId(/^technique-/).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -- --run src/render/TabStaff.test.tsx`
Expected: FAIL — cannot resolve `./TabStaff`.

- [ ] **Step 7: Write `src/render/TabStaff.tsx`**

```tsx
import { forwardRef } from 'react';
import type { Riff, TabEvent, Technique } from '@/content';
import type { TabGeometry } from './tabGeometry';

export type TabStaffProps = {
  riff: Riff;
  geometry: TabGeometry;
  showPlayhead?: boolean;
  /**
   * Attaches to the playhead group so a requestAnimationFrame loop can move
   * it with a CSS transform. Driving it through React state would re-render
   * the whole staff every frame.
   */
  playheadRef?: React.Ref<SVGGElement>;
  className?: string;
};

/** Display letters for the six strings, low to high. */
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

const TECHNIQUE_GLYPH: Record<Technique, string> = {
  hammer: 'h',
  pull: 'p',
  slide: '/',
  bend: 'b',
  palmMute: 'P.M.',
};

export const TabStaff = forwardRef<SVGSVGElement, TabStaffProps>(function TabStaff(
  { riff, geometry, showPlayhead = false, playheadRef, className },
  ref,
) {
  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={geometry.width}
      height={geometry.height}
      role="img"
      aria-label={`Tab for ${riff.title}`}
      data-testid="tab-staff"
    >
      {STRING_LABELS.map((label, stringIndex) => {
        const line = geometry.staffLine(stringIndex);
        return (
          <g key={`staff-${stringIndex}`}>
            <line
              data-testid={`staff-line-${stringIndex}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--color-surface-2)"
              strokeWidth={1.2}
            />
            <text
              data-testid={`string-label-${stringIndex}`}
              x={line.x1 - 14}
              y={line.y1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="var(--color-ink-dim)"
            >
              {label}
            </text>
          </g>
        );
      })}

      {geometry.barLineXs().map((x, i) => (
        <line
          key={`bar-${i}`}
          data-testid={`bar-line-${i}`}
          x1={x}
          y1={geometry.staffTop}
          x2={x}
          y2={geometry.staffBottom}
          stroke="var(--color-ink-dim)"
          strokeWidth={i === 0 ? 2.4 : 1.2}
          opacity={0.6}
        />
      ))}

      {riff.events.map((event, i) => (
        <TabNote key={`note-${i}`} index={i} event={event} geometry={geometry} />
      ))}

      {showPlayhead && (
        <g ref={playheadRef} data-testid="playhead" style={{ willChange: 'transform' }}>
          <line
            x1={geometry.xForBeat(0)}
            y1={geometry.staffTop - 8}
            x2={geometry.xForBeat(0)}
            y2={geometry.staffBottom + 8}
            stroke="var(--color-accent)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
});

function TabNote({
  index,
  event,
  geometry,
}: {
  index: number;
  event: TabEvent;
  geometry: TabGeometry;
}) {
  const x = geometry.xForBeat(event.beat);
  const y = geometry.yForString(event.stringIndex);
  const text = String(event.fret);
  const boxWidth = 9 + text.length * 5;

  return (
    <g>
      {/* Knock a hole in the staff line so the number stays readable. */}
      <rect
        x={x - boxWidth / 2}
        y={y - 8}
        width={boxWidth}
        height={16}
        fill="var(--color-ground)"
      />
      <text
        data-testid={`tab-note-${index}`}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        fill="var(--color-ink)"
      >
        {text}
      </text>
      {event.technique !== undefined && (
        <text
          data-testid={`technique-${index}`}
          x={x}
          y={geometry.staffTop - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill="var(--color-ink-dim)"
        >
          {TECHNIQUE_GLYPH[event.technique]}
        </text>
      )}
    </g>
  );
}

export default TabStaff;
```

Techniques render as a glyph above the note rather than as a connector drawn between two paired events. True slur and slide connectors are a visual refinement for Plan 3's design pass; the glyph carries the same information in the meantime.

- [ ] **Step 8: Run the render suite**

Run: `npm test -- --run src/render/`
Expected: all pass.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/render/tabGeometry.ts src/render/tabGeometry.test.ts src/render/TabStaff.tsx src/render/TabStaff.test.tsx
git commit -m "$(cat <<'MSG'
feat(render): add the tab staff and its geometry

The parent owns the geometry so it can move the playhead with a CSS
transform instead of re-rendering the staff each frame.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 11: Audio interfaces, strum maths, and the synth backend (`src/audio/`)

**Files:**
- Create: `src/audio/types.ts`, `src/audio/strum.ts`, `src/audio/SynthGuitar.ts`
- Test: `src/audio/strum.test.ts`

**Interfaces:**
- Consumes: `type Midi` from `@/music`
- Produces:
  - `type EngineBackend = 'sampled' | 'synth' | 'uninitialized'`
  - `type PlayNoteOptions = { duration?: number; velocity?: number; time?: number; stringIndex?: number }`
  - `type StrumOptions = { direction?: 'down' | 'up'; spreadMs?: number; velocity?: number; time?: number }`
  - `interface GuitarVoice { playNote(midi, opts?): void; stopAll(): void; dispose(): void; connect(node: Tone.InputNode): void }`
  - `interface AudioEngine { readonly backend; readonly unlocked; init(): Promise<void>; unlock(): Promise<void>; playNote(...); strum(...); stopAll(); dispose(); }`
  - `strumOffsets(count: number, spreadMs: number, direction: 'down' | 'up'): number[]` — seconds, indexed by voicing position (0 = lowest string)
  - `class SynthGuitar implements GuitarVoice`

`strum.ts` must not import Tone. jsdom has no `AudioContext`, so anything importing Tone cannot be unit tested; the pure maths is separated for exactly that reason.

- [ ] **Step 1: Write the failing strum tests**

Create `src/audio/strum.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { strumOffsets } from './strum';

describe('strumOffsets', () => {
  it('returns one offset per string in the voicing', () => {
    expect(strumOffsets(5, 40, 'down')).toHaveLength(5);
  });

  it('starts a downstroke at the lowest string', () => {
    const offsets = strumOffsets(4, 30, 'down');
    expect(offsets[0]).toBe(0);
  });

  it('starts an upstroke at the highest string', () => {
    const offsets = strumOffsets(4, 30, 'up');
    expect(offsets[offsets.length - 1]).toBe(0);
  });

  it('spreads a downstroke across the requested time, in seconds', () => {
    const offsets = strumOffsets(5, 40, 'down');
    expect(offsets[4]).toBeCloseTo(0.04);
  });

  it('increases monotonically for a downstroke', () => {
    const offsets = strumOffsets(6, 50, 'down');
    for (let i = 1; i < offsets.length; i += 1) {
      const previous = offsets[i - 1];
      const current = offsets[i];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (previous === undefined || current === undefined) return;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it('mirrors a downstroke for an upstroke', () => {
    expect(strumOffsets(4, 30, 'up')).toEqual([...strumOffsets(4, 30, 'down')].reverse());
  });

  it('plays a single note immediately', () => {
    expect(strumOffsets(1, 40, 'down')).toEqual([0]);
  });

  it('plays every string together when there is no spread', () => {
    expect(strumOffsets(6, 0, 'down')).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('returns nothing for an empty voicing', () => {
    expect(strumOffsets(0, 40, 'down')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/audio/strum.test.ts`
Expected: FAIL — cannot resolve `./strum`.

- [ ] **Step 3: Write `src/audio/strum.ts`**

```ts
/**
 * Per-string delays, in seconds, that turn simultaneous notes into a strum.
 * Index 0 is the lowest string in the voicing; a downstroke hits it first.
 */
export function strumOffsets(
  count: number,
  spreadMs: number,
  direction: 'down' | 'up',
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];

  const step = spreadMs / 1000 / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    direction === 'down' ? i * step : (count - 1 - i) * step,
  );
}
```

- [ ] **Step 4: Run to verify the strum tests pass**

Run: `npm test -- --run src/audio/strum.test.ts`
Expected: all pass.

- [ ] **Step 5: Write `src/audio/types.ts`**

```ts
import type * as Tone from 'tone';
import type { Midi } from '@/music';

export type EngineBackend = 'sampled' | 'synth' | 'uninitialized';

export type PlayNoteOptions = {
  /** Seconds the note should ring. Backends may let it decay naturally instead. */
  duration?: number;
  /** 0 to 1. */
  velocity?: number;
  /** Absolute AudioContext time. Omit to play now. */
  time?: number;
  /** Lets a backend pick the voice matching the physical string. */
  stringIndex?: number;
};

export type StrumOptions = {
  direction?: 'down' | 'up';
  spreadMs?: number;
  velocity?: number;
  time?: number;
};

/** A thing that can make guitar notes. Implemented by both backends. */
export interface GuitarVoice {
  playNote(midi: Midi, opts?: PlayNoteOptions): void;
  stopAll(): void;
  dispose(): void;
  connect(node: Tone.InputNode): void;
}

export interface AudioEngine {
  readonly backend: EngineBackend;
  readonly unlocked: boolean;
  init(): Promise<void>;
  /** Must be called from inside a real touch or click handler. */
  unlock(): Promise<void>;
  playNote(midi: Midi, opts?: PlayNoteOptions): void;
  strum(midis: Midi[], opts?: StrumOptions): void;
  stopAll(): void;
  dispose(): void;
}
```

- [ ] **Step 6: Write `src/audio/SynthGuitar.ts`**

```ts
import * as Tone from 'tone';
import type { Midi } from '@/music';
import type { GuitarVoice, PlayNoteOptions } from './types';

const VOICE_COUNT = 6;

/**
 * Karplus-Strong plucked string, one voice per guitar string. Needs no
 * audio assets, so the app is fully playable before any samples are
 * installed. Pitch is exact, which is what the quizzes depend on.
 */
export class SynthGuitar implements GuitarVoice {
  private readonly voices: Tone.PluckSynth[];
  private readonly volumes: Tone.Volume[];
  private nextVoice = 0;

  constructor() {
    this.volumes = Array.from({ length: VOICE_COUNT }, () => new Tone.Volume(0));
    this.voices = this.volumes.map((volume) =>
      new Tone.PluckSynth({
        attackNoise: 0.9,
        dampening: 3800,
        resonance: 0.96,
      }).connect(volume),
    );
  }

  connect(node: Tone.InputNode): void {
    for (const volume of this.volumes) volume.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    const index =
      opts.stringIndex !== undefined && opts.stringIndex >= 0 && opts.stringIndex < VOICE_COUNT
        ? opts.stringIndex
        : this.nextVoice++ % VOICE_COUNT;

    const voice = this.voices[index];
    const volume = this.volumes[index];
    if (voice === undefined || volume === undefined) return;

    volume.volume.value = Tone.gainToDb(opts.velocity ?? 0.8);
    voice.triggerAttack(Tone.Frequency(midi, 'midi').toFrequency(), opts.time);
  }

  stopAll(): void {
    const now = Tone.now();
    for (const voice of this.voices) voice.triggerRelease(now);
  }

  dispose(): void {
    for (const voice of this.voices) voice.dispose();
    for (const volume of this.volumes) volume.dispose();
  }
}
```

- [ ] **Step 7: Verify the whole suite still passes and types check**

Run: `npm test -- --run`
Expected: all pass. No test imports `SynthGuitar` — it touches Tone, which jsdom cannot host.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/audio/types.ts src/audio/strum.ts src/audio/strum.test.ts src/audio/SynthGuitar.ts
git commit -m "$(cat <<'MSG'
feat(audio): add engine interfaces, strum maths and the synth backend

Six PluckSynth voices, one per string. Strum timing is a pure function so
it is testable without an AudioContext.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 12: Sample manifest, sampled backend, and the engine (`src/audio/`)

**Files:**
- Create: `src/audio/manifest.ts`, `src/audio/SampledGuitar.ts`, `src/audio/engine.ts`, `public/audio/guitar/README.md`
- Test: `src/audio/manifest.test.ts`

**Interfaces:**
- Consumes: `parseNoteName` from `@/music`; `GuitarVoice`, `EngineBackend`, `AudioEngine`, `PlayNoteOptions`, `StrumOptions` from `./types`; `SynthGuitar` from `./SynthGuitar`; `strumOffsets` from `./strum`
- Produces:
  - `type SampleManifest = { baseUrl: string; samples: Record<string, string> }`
  - `const MANIFEST_URL = '/audio/guitar/manifest.json'`
  - `isSampleManifest(value: unknown): value is SampleManifest`
  - `fetchManifest(url?: string, fetchImpl?: typeof fetch): Promise<SampleManifest | null>`
  - `selectBackend(manifest: SampleManifest | null): EngineBackend`
  - `manifestToSamplerUrls(manifest: SampleManifest): Record<string, string>`
  - `class SampledGuitar implements GuitarVoice` with `static load(manifest): Promise<SampledGuitar>`
  - `class GuitarAudioEngine implements AudioEngine`

`manifest.ts` is Tone-free so it can be unit tested. `engine.ts` and `SampledGuitar.ts` import Tone and are verified by hand in the dev harness of Task 15.

- [ ] **Step 1: Write the failing manifest tests**

Create `src/audio/manifest.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  fetchManifest,
  isSampleManifest,
  manifestToSamplerUrls,
  selectBackend,
  type SampleManifest,
} from './manifest';

const good: SampleManifest = {
  baseUrl: '/audio/guitar/',
  samples: { E2: 'E2.mp3', A2: 'A2.mp3', E4: 'E4.mp3' },
};

function stubFetch(response: unknown, ok = true): typeof fetch {
  return vi.fn(async () =>
    ({ ok, json: async () => response }) as unknown as Response,
  ) as unknown as typeof fetch;
}

describe('isSampleManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(isSampleManifest(good)).toBe(true);
  });

  it('rejects null', () => {
    expect(isSampleManifest(null)).toBe(false);
  });

  it('rejects a manifest with no samples object', () => {
    expect(isSampleManifest({ baseUrl: '/x/' })).toBe(false);
  });

  it('rejects a manifest whose sample values are not strings', () => {
    expect(isSampleManifest({ baseUrl: '/x/', samples: { E2: 7 } })).toBe(false);
  });
});

describe('selectBackend', () => {
  it('falls back to the synth when there is no manifest', () => {
    expect(selectBackend(null)).toBe('synth');
  });

  it('falls back to the synth when the manifest lists no samples', () => {
    expect(selectBackend({ baseUrl: '/audio/guitar/', samples: {} })).toBe('synth');
  });

  it('uses samples when the manifest lists them', () => {
    expect(selectBackend(good)).toBe('sampled');
  });
});

describe('fetchManifest', () => {
  it('returns the manifest when the request succeeds', async () => {
    await expect(fetchManifest('/m.json', stubFetch(good))).resolves.toEqual(good);
  });

  it('returns null on a 404', async () => {
    await expect(fetchManifest('/m.json', stubFetch(good, false))).resolves.toBeNull();
  });

  it('returns null when the body is not a manifest', async () => {
    await expect(fetchManifest('/m.json', stubFetch({ nope: true }))).resolves.toBeNull();
  });

  it('returns null when the request throws', async () => {
    const throwing = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(fetchManifest('/m.json', throwing)).resolves.toBeNull();
  });
});

describe('manifestToSamplerUrls', () => {
  it('passes through every parseable note name', () => {
    expect(manifestToSamplerUrls(good)).toEqual(good.samples);
  });

  it('drops keys that are not note names, so one typo cannot break loading', () => {
    const messy: SampleManifest = {
      baseUrl: '/audio/guitar/',
      samples: { E2: 'E2.mp3', 'not-a-note': 'x.mp3' },
    };
    expect(manifestToSamplerUrls(messy)).toEqual({ E2: 'E2.mp3' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/audio/manifest.test.ts`
Expected: FAIL — cannot resolve `./manifest`.

- [ ] **Step 3: Write `src/audio/manifest.ts`**

```ts
import { parseNoteName } from '@/music';
import type { EngineBackend } from './types';

export type SampleManifest = {
  baseUrl: string;
  /** Note name to filename, e.g. { "E2": "E2.mp3" }. */
  samples: Record<string, string>;
};

export const MANIFEST_URL = '/audio/guitar/manifest.json';

export function isSampleManifest(value: unknown): value is SampleManifest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.baseUrl !== 'string') return false;
  if (typeof candidate.samples !== 'object' || candidate.samples === null) return false;
  return Object.values(candidate.samples as Record<string, unknown>).every(
    (v) => typeof v === 'string',
  );
}

/** Returns null for any failure at all: the app falls back to the synth. */
export async function fetchManifest(
  url: string = MANIFEST_URL,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<SampleManifest | null> {
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isSampleManifest(body) ? body : null;
  } catch {
    return null;
  }
}

export function selectBackend(manifest: SampleManifest | null): EngineBackend {
  if (manifest === null) return 'synth';
  return Object.keys(manifest.samples).length > 0 ? 'sampled' : 'synth';
}

/** Keeps only entries whose key is a real note name, so one typo cannot break loading. */
export function manifestToSamplerUrls(manifest: SampleManifest): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const [note, file] of Object.entries(manifest.samples)) {
    try {
      parseNoteName(note);
      urls[note] = file;
    } catch {
      continue;
    }
  }
  return urls;
}
```

- [ ] **Step 4: Run to verify the manifest tests pass**

Run: `npm test -- --run src/audio/manifest.test.ts`
Expected: all pass.

- [ ] **Step 5: Write `src/audio/SampledGuitar.ts`**

```ts
import * as Tone from 'tone';
import type { Midi } from '@/music';
import { manifestToSamplerUrls, type SampleManifest } from './manifest';
import type { GuitarVoice, PlayNoteOptions } from './types';

/** Real recorded guitar notes, pitch-shifted by Tone.Sampler to fill the gaps. */
export class SampledGuitar implements GuitarVoice {
  private constructor(private readonly sampler: Tone.Sampler) {}

  static async load(manifest: SampleManifest): Promise<SampledGuitar> {
    const sampler = new Tone.Sampler({
      urls: manifestToSamplerUrls(manifest),
      baseUrl: manifest.baseUrl,
      release: 1,
    });
    await Tone.loaded();
    return new SampledGuitar(sampler);
  }

  connect(node: Tone.InputNode): void {
    this.sampler.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    this.sampler.triggerAttackRelease(
      Tone.Frequency(midi, 'midi').toNote(),
      opts.duration ?? 1.4,
      opts.time,
      opts.velocity ?? 0.8,
    );
  }

  stopAll(): void {
    this.sampler.releaseAll(Tone.now());
  }

  dispose(): void {
    this.sampler.dispose();
  }
}
```

- [ ] **Step 6: Write `src/audio/engine.ts`**

```ts
import * as Tone from 'tone';
import type { Midi } from '@/music';
import { MANIFEST_URL, fetchManifest, selectBackend } from './manifest';
import { SampledGuitar } from './SampledGuitar';
import { SynthGuitar } from './SynthGuitar';
import { strumOffsets } from './strum';
import type {
  AudioEngine,
  EngineBackend,
  GuitarVoice,
  PlayNoteOptions,
  StrumOptions,
} from './types';

const DEFAULT_SPREAD_MS = 28;

export class GuitarAudioEngine implements AudioEngine {
  private voice: GuitarVoice | null = null;
  private chain: Tone.ToneAudioNode[] = [];
  private currentBackend: EngineBackend = 'uninitialized';
  private isUnlocked = false;

  get backend(): EngineBackend {
    return this.currentBackend;
  }

  get unlocked(): boolean {
    return this.isUnlocked;
  }

  async init(fetchImpl: typeof fetch = globalThis.fetch): Promise<void> {
    const manifest = await fetchManifest(MANIFEST_URL, fetchImpl);
    this.currentBackend = selectBackend(manifest);

    const reverb = new Tone.Reverb({ decay: 1.4, wet: 0.12 });
    await reverb.ready;
    const filter = new Tone.Filter(6500, 'lowpass');
    const gain = new Tone.Gain(0.9);
    gain.chain(filter, reverb, Tone.getDestination());

    this.chain = [gain, filter, reverb];

    this.voice =
      this.currentBackend === 'sampled' && manifest !== null
        ? await SampledGuitar.load(manifest)
        : new SynthGuitar();
    this.voice.connect(gain);
  }

  /** Web audio stays suspended until a user gesture. Call this from a tap handler. */
  async unlock(): Promise<void> {
    await Tone.start();
    this.isUnlocked = true;
  }

  playNote(midi: Midi, opts?: PlayNoteOptions): void {
    this.voice?.playNote(midi, opts);
  }

  strum(midis: Midi[], opts: StrumOptions = {}): void {
    const start = opts.time ?? Tone.now();
    const offsets = strumOffsets(
      midis.length,
      opts.spreadMs ?? DEFAULT_SPREAD_MS,
      opts.direction ?? 'down',
    );
    midis.forEach((midi, i) => {
      const offset = offsets[i] ?? 0;
      this.voice?.playNote(midi, { time: start + offset, velocity: opts.velocity });
    });
  }

  stopAll(): void {
    this.voice?.stopAll();
  }

  dispose(): void {
    this.voice?.dispose();
    for (const node of this.chain) node.dispose();
    this.voice = null;
    this.chain = [];
    this.currentBackend = 'uninitialized';
  }
}
```

- [ ] **Step 7: Document how to install samples**

Create `public/audio/guitar/README.md`:

```markdown
# Guitar samples

The app ships with no samples. `GuitarAudioEngine` probes
`/audio/guitar/manifest.json` on startup: when it is absent or lists nothing,
the engine uses `SynthGuitar`, a Karplus-Strong plucked string that needs no
assets. Pitch is exact either way, so quizzes are correct with or without
samples. Installing samples is purely a sound-quality upgrade and needs no
code change.

## Installing samples

1. Drop mono `.mp3` or `.ogg` files in this directory, one per sampled note,
   named after the note: `E2.mp3`, `G2.mp3`, `A2.mp3`, and so on.
   One sample every three or four semitones from E2 to E5 is plenty; the
   sampler pitch-shifts to fill the gaps.
2. Create `manifest.json` beside them:

   ```json
   {
     "baseUrl": "/audio/guitar/",
     "samples": {
       "E2": "E2.mp3",
       "A2": "A2.mp3",
       "D3": "D3.mp3",
       "G3": "G3.mp3",
       "B3": "B3.mp3",
       "E4": "E4.mp3"
     }
   }
   ```

3. Reload. The dev harness reports which backend is live.

Use samples you have the right to use — your own recordings, or a set
released under CC0 or a similar permissive licence. Keep the licence text
next to the files.
```

- [ ] **Step 8: Verify the suite and types**

Run: `npm test -- --run`
Expected: all pass.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/audio/manifest.ts src/audio/manifest.test.ts src/audio/SampledGuitar.ts src/audio/engine.ts public/audio/guitar/README.md
git commit -m "$(cat <<'MSG'
feat(audio): add sample manifest probing and the engine

The engine picks the sampled backend when a manifest is present and falls
back to the synth otherwise. Both produce exact pitches, so the app is
correct with no samples installed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 13: Riff timing and the riff player (`src/audio/`)

**Files:**
- Create: `src/audio/timing.ts`, `src/audio/riffPlayer.ts`, `src/audio/index.ts`
- Test: `src/audio/timing.test.ts`

**Interfaces:**
- Consumes: `type Riff`, `beatsPerBar`, `riffTotalBeats` from `@/content`; `type Tuning`, `type Midi`, `fretToMidi`, `STANDARD_TUNING` from `@/music`; `AudioEngine` from `./types`
- Produces:
  - `beatsToTransportTime(beat: number, perBar: number): string` — Tone's `bars:beats:sixteenths`
  - `speedToBpm(baseBpm: number, speed: number): number`
  - `type ScheduledNote = { time: string; midi: Midi; stringIndex: number; durationBeats: number }`
  - `riffToScheduledNotes(riff: Riff, tuning?: Tuning): ScheduledNote[]`
  - `type RiffPlayer = { start(): void; stop(): void; dispose(): void; setSpeed(speed: number): void; progress(): number; readonly totalBeats: number }`
  - `createRiffPlayer(riff: Riff, engine: AudioEngine, opts?: { tuning?: Tuning; speed?: number }): RiffPlayer`
  - `src/audio/index.ts` barrel

Transport time is used rather than seconds so the speed slider can change `Transport.bpm` without rescheduling anything.

**`Tone.Transport` is global, so exactly one riff may play at a time.** `start()` cancels whatever the Transport was doing. The feed's single-active-card audio rule in Plan 2 depends on this being true.

- [ ] **Step 1: Write the failing timing tests**

Create `src/audio/timing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { beatsToTransportTime, riffToScheduledNotes, speedToBpm } from './timing';
import { getRiff } from '@/content';
import { STANDARD_TUNING, fretToMidi } from '@/music';

describe('beatsToTransportTime', () => {
  it('puts the downbeat at the origin', () => {
    expect(beatsToTransportTime(0, 4)).toBe('0:0:0');
  });

  it('counts whole beats within the first bar', () => {
    expect(beatsToTransportTime(2, 4)).toBe('0:2:0');
  });

  it('converts a half beat to two sixteenths', () => {
    expect(beatsToTransportTime(2.5, 4)).toBe('0:2:2');
  });

  it('rolls over into the next bar', () => {
    expect(beatsToTransportTime(4, 4)).toBe('1:0:0');
  });

  it('handles a fractional beat in a later bar', () => {
    expect(beatsToTransportTime(5.5, 4)).toBe('1:1:2');
  });

  it('respects a three-four bar length', () => {
    expect(beatsToTransportTime(4, 3)).toBe('1:1:0');
  });

  it('converts a quarter beat to one sixteenth', () => {
    expect(beatsToTransportTime(0.25, 4)).toBe('0:0:1');
  });
});

describe('speedToBpm', () => {
  it('leaves the tempo alone at full speed', () => {
    expect(speedToBpm(120, 1)).toBe(120);
  });

  it('halves the tempo at half speed', () => {
    expect(speedToBpm(120, 0.5)).toBe(60);
  });

  it('clamps absurdly slow requests', () => {
    expect(speedToBpm(120, 0.01)).toBe(speedToBpm(120, 0.25));
  });

  it('clamps absurdly fast requests', () => {
    expect(speedToBpm(120, 9)).toBe(speedToBpm(120, 1.5));
  });
});

describe('riffToScheduledNotes', () => {
  const riff = getRiff('em-pentatonic-box1');
  if (riff === undefined) throw new Error('seed riff missing');

  it('schedules every event', () => {
    expect(riffToScheduledNotes(riff)).toHaveLength(riff.events.length);
  });

  it('resolves each event to the pitch that fret actually sounds', () => {
    const scheduled = riffToScheduledNotes(riff);
    riff.events.forEach((event, i) => {
      const note = scheduled[i];
      expect(note).toBeDefined();
      if (note === undefined) return;
      expect(note.midi).toBe(fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret));
      expect(note.stringIndex).toBe(event.stringIndex);
    });
  });

  it('places the first note at the origin', () => {
    expect(riffToScheduledNotes(riff)[0]?.time).toBe('0:0:0');
  });

  it('keeps durations in beats so tempo changes stay correct', () => {
    const scheduled = riffToScheduledNotes(riff);
    riff.events.forEach((event, i) => {
      expect(scheduled[i]?.durationBeats).toBe(event.duration);
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/audio/timing.test.ts`
Expected: FAIL — cannot resolve `./timing`.

- [ ] **Step 3: Write `src/audio/timing.ts`**

```ts
import { beatsPerBar, riffTotalBeats, type Riff } from '@/content';
import { STANDARD_TUNING, fretToMidi, type Midi, type Tuning } from '@/music';

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 1.5;

export type ScheduledNote = {
  /** Tone's bars:beats:sixteenths, so tempo changes need no rescheduling. */
  time: string;
  midi: Midi;
  stringIndex: number;
  durationBeats: number;
};

/** Converts quarter-note beats into Tone's bars:beats:sixteenths notation. */
export function beatsToTransportTime(beat: number, perBar: number): string {
  const bars = Math.floor(beat / perBar);
  const withinBar = beat - bars * perBar;
  const beats = Math.floor(withinBar);
  const sixteenths = Math.round((withinBar - beats) * 4 * 1000) / 1000;
  return `${bars}:${beats}:${sixteenths}`;
}

export function speedToBpm(baseBpm: number, speed: number): number {
  const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
  return baseBpm * clamped;
}

export function riffToScheduledNotes(
  riff: Riff,
  tuning: Tuning = STANDARD_TUNING,
): ScheduledNote[] {
  const perBar = beatsPerBar(riff.timeSignature);
  return riff.events.map((event) => ({
    time: beatsToTransportTime(event.beat, perBar),
    midi: fretToMidi(tuning, event.stringIndex, event.fret),
    stringIndex: event.stringIndex,
    durationBeats: event.duration,
  }));
}

export function riffLoopEnd(riff: Riff): string {
  return beatsToTransportTime(riffTotalBeats(riff), beatsPerBar(riff.timeSignature));
}
```

- [ ] **Step 4: Run to verify the timing tests pass**

Run: `npm test -- --run src/audio/timing.test.ts`
Expected: all pass.

- [ ] **Step 5: Write `src/audio/riffPlayer.ts`**

```ts
import * as Tone from 'tone';
import { riffTotalBeats, type Riff } from '@/content';
import { STANDARD_TUNING, type Tuning } from '@/music';
import {
  riffLoopEnd,
  riffToScheduledNotes,
  speedToBpm,
  type ScheduledNote,
} from './timing';
import type { AudioEngine } from './types';

export type RiffPlayer = {
  start(): void;
  stop(): void;
  dispose(): void;
  setSpeed(speed: number): void;
  /** 0 to 1 through the loop. Read this from requestAnimationFrame. */
  progress(): number;
  readonly totalBeats: number;
};

/**
 * Loops a riff on the global Tone Transport.
 *
 * The Transport is global, so only one player may run at a time: start()
 * cancels whatever was previously scheduled. Callers that show several
 * riffs at once must guarantee only the visible one is started.
 */
export function createRiffPlayer(
  riff: Riff,
  engine: AudioEngine,
  opts: { tuning?: Tuning; speed?: number } = {},
): RiffPlayer {
  const tuning = opts.tuning ?? STANDARD_TUNING;
  let speed = opts.speed ?? 1;

  const notes = riffToScheduledNotes(riff, tuning);
  const transport = Tone.getTransport();

  const part = new Tone.Part<ScheduledNote>((time, note) => {
    const secondsPerBeat = 60 / transport.bpm.value;
    engine.playNote(note.midi, {
      time,
      duration: note.durationBeats * secondsPerBeat,
      stringIndex: note.stringIndex,
      velocity: 0.85,
    });
  }, notes);

  part.loop = true;
  part.loopStart = 0;
  part.loopEnd = riffLoopEnd(riff);

  return {
    totalBeats: riffTotalBeats(riff),

    start() {
      transport.stop();
      transport.cancel();
      transport.position = 0;
      transport.bpm.value = speedToBpm(riff.bpm, speed);
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = part.loopEnd;
      part.start(0);
      transport.start();
    },

    stop() {
      part.stop();
      transport.stop();
      transport.position = 0;
      engine.stopAll();
    },

    setSpeed(next: number) {
      speed = next;
      transport.bpm.value = speedToBpm(riff.bpm, next);
    },

    progress() {
      return transport.progress;
    },

    dispose() {
      part.stop();
      part.dispose();
      transport.stop();
      transport.cancel();
    },
  };
}
```

- [ ] **Step 6: Write `src/audio/index.ts`**

```ts
export * from './types';
export * from './manifest';
export * from './strum';
export * from './timing';
export { SynthGuitar } from './SynthGuitar';
export { SampledGuitar } from './SampledGuitar';
export { GuitarAudioEngine } from './engine';
export { createRiffPlayer, type RiffPlayer } from './riffPlayer';
```

- [ ] **Step 7: Verify**

Run: `npm test -- --run`
Expected: all pass.

Run: `npm run typecheck`
Expected: exit 0.

`createRiffPlayer` has no unit test: it drives the global Tone Transport, which jsdom cannot host. It is verified by hand in Task 15's dev harness, where a wrong beat or a stuck loop is immediately audible.

- [ ] **Step 8: Commit**

```bash
git add src/audio/timing.ts src/audio/timing.test.ts src/audio/riffPlayer.ts src/audio/index.ts
git commit -m "$(cat <<'MSG'
feat(audio): schedule riffs on the Tone transport

Events are scheduled in bars:beats:sixteenths rather than seconds, so the
speed slider changes tempo without rescheduling. Only one riff may play at
a time; the transport is global.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 14: Progress storage (`src/progress/`)

**Files:**
- Create: `src/progress/types.ts`, `src/progress/repo.ts`, `src/progress/index.ts`
- Test: `src/progress/types.test.ts`, `src/progress/repo.test.ts`

**Interfaces:**
- Consumes: nothing outside itself
- Produces:
  - `const PROGRESS_VERSION = 1`, `const STORAGE_KEY = 'guitarrot.progress.v1'`
  - `type SrsItem = { id: string; dueAt: number; intervalDays: number; ease: number; reps: number; lapses: number }`
  - `type Settings = { leftHanded: boolean; preferFlats: boolean; defaultSpeed: number }`
  - `type DailyStat = { date: string; answered: number; correct: number }`
  - `type ProgressState = { version: number; srs: Record<string, SrsItem>; seenContent: string[]; streak: { current: number; longest: number; lastActiveDate: string | null }; daily: Record<string, DailyStat>; settings: Settings }`
  - `emptyProgressState(): ProgressState`, `migrate(raw: unknown): ProgressState`
  - `pushSeen(seen: string[], id: string, limit?: number): string[]`
  - `pruneDaily(daily: Record<string, DailyStat>, keepDays: number, today: string): Record<string, DailyStat>`
  - `interface ProgressRepo`, `class WebProgressRepo`, `createProgressRepo(): ProgressRepo`
  - `createDebouncedSaver(repo: ProgressRepo, ms?: number): { save(state: ProgressState): void; flush(): Promise<void> }`

Plan 3 adds a Capacitor Preferences implementation of the same interface and switches `createProgressRepo` to pick by platform. Nothing above this layer changes when that happens.

The spec lists per-string and per-fret accuracy as stored state. It is not a
field here: SRS item ids encode their own position (`fret:s0f5`), so accuracy
per string and per fret is derived from `srs` when the stats screen needs it
rather than stored twice and risking the two disagreeing.

- [ ] **Step 1: Write the failing state tests**

Create `src/progress/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PROGRESS_VERSION,
  emptyProgressState,
  migrate,
  pruneDaily,
  pushSeen,
  type ProgressState,
} from './types';

describe('emptyProgressState', () => {
  it('stamps the current version', () => {
    expect(emptyProgressState().version).toBe(PROGRESS_VERSION);
  });

  it('starts with nothing learned and no streak', () => {
    const state = emptyProgressState();
    expect(state.srs).toEqual({});
    expect(state.seenContent).toEqual([]);
    expect(state.streak).toEqual({ current: 0, longest: 0, lastActiveDate: null });
  });

  it('returns a fresh object each time', () => {
    const a = emptyProgressState();
    a.seenContent.push('x');
    expect(emptyProgressState().seenContent).toEqual([]);
  });
});

describe('migrate', () => {
  it('turns null into an empty state', () => {
    expect(migrate(null)).toEqual(emptyProgressState());
  });

  it('turns a string into an empty state', () => {
    expect(migrate('corrupted')).toEqual(emptyProgressState());
  });

  it('turns an unknown version into an empty state', () => {
    expect(migrate({ version: 999, srs: {} })).toEqual(emptyProgressState());
  });

  it('fills in fields missing from an otherwise valid state', () => {
    const partial = { version: PROGRESS_VERSION, srs: {} };
    const migrated = migrate(partial);
    expect(migrated.settings.defaultSpeed).toBe(1);
    expect(migrated.daily).toEqual({});
  });

  it('preserves scheduling data it recognises', () => {
    const state: ProgressState = {
      ...emptyProgressState(),
      srs: {
        'fret:s0f5': { id: 'fret:s0f5', dueAt: 123, intervalDays: 3, ease: 2.3, reps: 4, lapses: 1 },
      },
    };
    expect(migrate(JSON.parse(JSON.stringify(state))).srs['fret:s0f5']?.reps).toBe(4);
  });

  it('drops srs entries that are not well formed', () => {
    const broken = { version: PROGRESS_VERSION, srs: { bad: { id: 'bad' } } };
    expect(migrate(broken).srs).toEqual({});
  });
});

describe('pushSeen', () => {
  it('appends the newest id last', () => {
    expect(pushSeen(['a', 'b'], 'c', 10)).toEqual(['a', 'b', 'c']);
  });

  it('moves a repeat to the end rather than duplicating it', () => {
    expect(pushSeen(['a', 'b', 'c'], 'a', 10)).toEqual(['b', 'c', 'a']);
  });

  it('drops the oldest entry once the limit is reached', () => {
    expect(pushSeen(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });
});

describe('pruneDaily', () => {
  it('keeps days inside the window', () => {
    const daily = {
      '2026-09-01': { date: '2026-09-01', answered: 3, correct: 2 },
      '2026-09-02': { date: '2026-09-02', answered: 5, correct: 5 },
    };
    expect(Object.keys(pruneDaily(daily, 30, '2026-09-02')).sort()).toEqual([
      '2026-09-01',
      '2026-09-02',
    ]);
  });

  it('drops days older than the window', () => {
    const daily = {
      '2025-01-01': { date: '2025-01-01', answered: 3, correct: 2 },
      '2026-09-02': { date: '2026-09-02', answered: 5, correct: 5 },
    };
    expect(Object.keys(pruneDaily(daily, 30, '2026-09-02'))).toEqual(['2026-09-02']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/progress/types.test.ts`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 3: Write `src/progress/types.ts`**

```ts
export const PROGRESS_VERSION = 1;

export type SrsItem = {
  id: string;
  /** Epoch milliseconds. */
  dueAt: number;
  intervalDays: number;
  /** SM-2 ease factor. Starts at 2.5 and floors at 1.3. */
  ease: number;
  reps: number;
  lapses: number;
};

export type Settings = {
  leftHanded: boolean;
  preferFlats: boolean;
  /** Feed riff playback speed, 0.25 to 1.5. */
  defaultSpeed: number;
};

export type DailyStat = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  answered: number;
  correct: number;
};

export type ProgressState = {
  version: number;
  srs: Record<string, SrsItem>;
  /** Ring buffer of recently shown content ids; newest last. */
  seenContent: string[];
  streak: { current: number; longest: number; lastActiveDate: string | null };
  daily: Record<string, DailyStat>;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  leftHanded: false,
  preferFlats: false,
  defaultSpeed: 1,
};

export const SEEN_LIMIT = 200;
export const DAILY_KEEP_DAYS = 365;

export function emptyProgressState(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    srs: {},
    seenContent: [],
    streak: { current: 0, longest: 0, lastActiveDate: null },
    daily: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSrsItem(value: unknown): value is SrsItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.dueAt === 'number' &&
    typeof value.intervalDays === 'number' &&
    typeof value.ease === 'number' &&
    typeof value.reps === 'number' &&
    typeof value.lapses === 'number'
  );
}

function isDailyStat(value: unknown): value is DailyStat {
  if (!isRecord(value)) return false;
  return (
    typeof value.date === 'string' &&
    typeof value.answered === 'number' &&
    typeof value.correct === 'number'
  );
}

/**
 * Turns whatever came out of storage into a usable state. Anything
 * unrecognised is discarded rather than trusted: a corrupt blob must not be
 * able to crash the app on launch, and a lost streak beats a broken app.
 */
export function migrate(raw: unknown): ProgressState {
  if (!isRecord(raw) || raw.version !== PROGRESS_VERSION) return emptyProgressState();

  const base = emptyProgressState();

  const srs: Record<string, SrsItem> = {};
  if (isRecord(raw.srs)) {
    for (const [key, value] of Object.entries(raw.srs)) {
      if (isSrsItem(value)) srs[key] = value;
    }
  }

  const daily: Record<string, DailyStat> = {};
  if (isRecord(raw.daily)) {
    for (const [key, value] of Object.entries(raw.daily)) {
      if (isDailyStat(value)) daily[key] = value;
    }
  }

  const seenContent = Array.isArray(raw.seenContent)
    ? raw.seenContent.filter((id): id is string => typeof id === 'string')
    : [];

  const streak = isRecord(raw.streak)
    ? {
        current: typeof raw.streak.current === 'number' ? raw.streak.current : 0,
        longest: typeof raw.streak.longest === 'number' ? raw.streak.longest : 0,
        lastActiveDate:
          typeof raw.streak.lastActiveDate === 'string' ? raw.streak.lastActiveDate : null,
      }
    : base.streak;

  const settings = isRecord(raw.settings)
    ? {
        leftHanded:
          typeof raw.settings.leftHanded === 'boolean'
            ? raw.settings.leftHanded
            : DEFAULT_SETTINGS.leftHanded,
        preferFlats:
          typeof raw.settings.preferFlats === 'boolean'
            ? raw.settings.preferFlats
            : DEFAULT_SETTINGS.preferFlats,
        defaultSpeed:
          typeof raw.settings.defaultSpeed === 'number'
            ? raw.settings.defaultSpeed
            : DEFAULT_SETTINGS.defaultSpeed,
      }
    : { ...DEFAULT_SETTINGS };

  return { version: PROGRESS_VERSION, srs, seenContent, streak, daily, settings };
}

/** Appends an id, moving a repeat to the end and trimming to the limit. */
export function pushSeen(seen: string[], id: string, limit: number = SEEN_LIMIT): string[] {
  const without = seen.filter((existing) => existing !== id);
  without.push(id);
  return without.length > limit ? without.slice(without.length - limit) : without;
}

export function pruneDaily(
  daily: Record<string, DailyStat>,
  keepDays: number,
  today: string,
): Record<string, DailyStat> {
  const cutoff = new Date(`${today}T00:00:00Z`).getTime() - keepDays * 24 * 60 * 60 * 1000;
  const kept: Record<string, DailyStat> = {};
  for (const [date, stat] of Object.entries(daily)) {
    if (new Date(`${date}T00:00:00Z`).getTime() >= cutoff) kept[date] = stat;
  }
  return kept;
}
```

- [ ] **Step 4: Run to verify the state tests pass**

Run: `npm test -- --run src/progress/types.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the failing repo tests**

Create `src/progress/repo.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, WebProgressRepo, createDebouncedSaver } from './repo';
import { emptyProgressState } from './types';

describe('WebProgressRepo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty state when nothing is stored', async () => {
    await expect(new WebProgressRepo().load()).resolves.toEqual(emptyProgressState());
  });

  it('round-trips a saved state', async () => {
    const repo = new WebProgressRepo();
    const state = emptyProgressState();
    state.seenContent = ['chromatic-warmup'];
    await repo.save(state);
    await expect(repo.load()).resolves.toEqual(state);
  });

  it('recovers from an unparseable blob instead of throwing', async () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');
    await expect(new WebProgressRepo().load()).resolves.toEqual(emptyProgressState());
  });

  it('discards a state from an unknown version', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    await expect(new WebProgressRepo().load()).resolves.toEqual(emptyProgressState());
  });

  it('exports the current state as JSON', async () => {
    const repo = new WebProgressRepo();
    const state = emptyProgressState();
    state.seenContent = ['a'];
    await repo.save(state);
    expect(JSON.parse(await repo.exportJson()).seenContent).toEqual(['a']);
  });

  it('imports an exported state', async () => {
    const repo = new WebProgressRepo();
    const state = emptyProgressState();
    state.seenContent = ['b'];
    await repo.importJson(JSON.stringify(state));
    await expect(repo.load()).resolves.toEqual(state);
  });

  it('refuses an import that is not a progress state', async () => {
    await expect(new WebProgressRepo().importJson('[]')).rejects.toThrow();
  });
});

describe('createDebouncedSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes once for a burst of saves', async () => {
    const repo = { save: vi.fn(async () => {}) };
    const saver = createDebouncedSaver(repo as never, 500);

    saver.save(emptyProgressState());
    saver.save(emptyProgressState());
    saver.save(emptyProgressState());
    expect(repo.save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('writes the most recent state, not the first', async () => {
    const repo = { save: vi.fn(async () => {}) };
    const saver = createDebouncedSaver(repo as never, 500);

    const first = emptyProgressState();
    const second = emptyProgressState();
    second.seenContent = ['latest'];

    saver.save(first);
    saver.save(second);
    await vi.advanceTimersByTimeAsync(500);

    expect(repo.save).toHaveBeenCalledWith(second);
  });

  it('flushes immediately when asked', async () => {
    const repo = { save: vi.fn(async () => {}) };
    const saver = createDebouncedSaver(repo as never, 500);
    saver.save(emptyProgressState());
    await saver.flush();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('does nothing on flush when there is nothing pending', async () => {
    const repo = { save: vi.fn(async () => {}) };
    await createDebouncedSaver(repo as never, 500).flush();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -- --run src/progress/repo.test.ts`
Expected: FAIL — cannot resolve `./repo`.

- [ ] **Step 7: Write `src/progress/repo.ts`**

```ts
import { emptyProgressState, migrate, type ProgressState } from './types';

export const STORAGE_KEY = 'guitarrot.progress.v1';

export interface ProgressRepo {
  load(): Promise<ProgressState>;
  save(state: ProgressState): Promise<void>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<void>;
}

/** Browser implementation, used in `npm run dev` and in tests. */
export class WebProgressRepo implements ProgressRepo {
  async load(): Promise<ProgressState> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return emptyProgressState();
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return emptyProgressState();
    }
  }

  async save(state: ProgressState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(await this.load(), null, 2);
  }

  async importJson(json: string): Promise<void> {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('That file is not a guitarRot progress export.');
    }
    await this.save(migrate(parsed));
  }
}

/**
 * Plan 3 adds a Capacitor Preferences implementation and switches on
 * platform here. Nothing above this layer changes when it does.
 */
export function createProgressRepo(): ProgressRepo {
  return new WebProgressRepo();
}

/** Coalesces a burst of state changes into one write. */
export function createDebouncedSaver(
  repo: ProgressRepo,
  ms = 500,
): { save(state: ProgressState): void; flush(): Promise<void> } {
  let pending: ProgressState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function write(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const state = pending;
    pending = null;
    if (state !== null) await repo.save(state);
  }

  return {
    save(state) {
      pending = state;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        void write();
      }, ms);
    },
    flush: write,
  };
}
```

- [ ] **Step 8: Write `src/progress/index.ts`**

```ts
export * from './types';
export * from './repo';
```

- [ ] **Step 9: Verify**

Run: `npm test -- --run src/progress/`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/progress/
git commit -m "$(cat <<'MSG'
feat(progress): add progress state, migration and the web repo

migrate() discards anything it does not recognise, so a corrupt blob
costs a streak rather than breaking launch.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 15: Dev harness and foundation verification (`src/dev/DevHarness.tsx`)

**Files:**
- Create: `src/dev/DevHarness.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: everything built in Tasks 2-14
- Produces: nothing other modules depend on. This page is the manual proof that the layers fit together, and it is replaced by the real app shell in Plan 2.

This task has no automated test. Its deliverable is an audible, visible demonstration: a fretboard you can tap that sounds the right note, a chord you can strum, and a riff that loops in time with a playhead that tracks it. Those are the things a unit test cannot check.

- [ ] **Step 1: Write the harness**

Create `src/dev/DevHarness.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { GuitarAudioEngine, createRiffPlayer, type RiffPlayer } from '@/audio';
import { RIFFS } from '@/content';
import {
  STANDARD_TUNING,
  chordVoicing,
  fretToMidi,
  noteName,
  type ChordShape,
  type FretPosition,
} from '@/music';
import { Fretboard, TabStaff, chordShapeToFretboard, createTabGeometry } from '@/render';

const AM_OPEN: ChordShape = {
  id: 'Am-open',
  name: 'Am',
  root: 9,
  quality: 'min',
  baseFret: 1,
  frets: [null, 0, 2, 2, 1, 0],
  fingers: [null, null, 2, 3, 1, null],
  difficulty: 1,
};

export function DevHarness() {
  const engineRef = useRef<GuitarAudioEngine | null>(null);
  const playerRef = useRef<RiffPlayer | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState('uninitialized');
  const [lastTapped, setLastTapped] = useState('nothing yet');
  const [riffIndex, setRiffIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);

  const riff = RIFFS[riffIndex];
  const geometry = useMemo(
    () =>
      riff === undefined
        ? null
        : createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );
  const chord = useMemo(() => chordShapeToFretboard(AM_OPEN), []);

  // Audio must be unlocked from inside a real gesture, so this lives on a tap.
  async function handleStart() {
    const engine = new GuitarAudioEngine();
    await engine.unlock();
    await engine.init();
    engineRef.current = engine;
    setBackend(engine.backend);
    setReady(true);
  }

  function handleFretTap(position: FretPosition) {
    const midi = fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret);
    engineRef.current?.playNote(midi, { stringIndex: position.stringIndex });
    setLastTapped(noteName(midi, { withOctave: true }));
  }

  function handleStrum() {
    engineRef.current?.strum(chordVoicing(AM_OPEN, STANDARD_TUNING));
  }

  function handlePlay() {
    const engine = engineRef.current;
    if (engine === null || riff === undefined) return;
    playerRef.current?.dispose();
    const player = createRiffPlayer(riff, engine, { speed });
    playerRef.current = player;
    player.start();
    setPlaying(true);
  }

  function handleStop() {
    playerRef.current?.stop();
    setPlaying(false);
  }

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  // The playhead is moved by transform from rAF. Routing 60fps through React
  // state would re-render the whole staff every frame.
  useEffect(() => {
    if (geometry === null) return;
    let frame = 0;
    const tick = () => {
      const player = playerRef.current;
      const head = playheadRef.current;
      if (player !== null && head !== null) {
        const x = player.progress() * geometry.totalBeats * geometry.beatWidth;
        head.style.transform = `translateX(${x}px)`;
        const scroller = scrollRef.current;
        if (scroller !== null) {
          scroller.scrollLeft = Math.max(0, geometry.xForBeat(0) + x - scroller.clientWidth * 0.35);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry]);

  useEffect(() => () => playerRef.current?.dispose(), []);

  if (!ready) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">guitarRot</h1>
        <p className="max-w-xs text-center text-sm text-[var(--color-ink-dim)]">
          Phones keep audio suspended until you touch the screen.
        </p>
        <button
          type="button"
          onClick={() => void handleStart()}
          className="rounded-full bg-[var(--color-accent)] px-8 py-4 text-lg font-bold text-[var(--color-ground)]"
        >
          Tap to start
        </button>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col gap-8 overflow-y-auto p-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Foundation harness</h1>
        <span className="text-xs text-[var(--color-ink-dim)]">audio: {backend}</span>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-dim)]">
          Fretboard — tap to hear
        </h2>
        <div className="overflow-x-auto">
          <Fretboard
            orientation="horizontal"
            fretRange={[0, 5]}
            markers={[]}
            labelMode="note"
            onFretTap={handleFretTap}
          />
        </div>
        <p className="text-sm">Last note: <strong>{lastTapped}</strong></p>
      </section>

      <section className="flex flex-col items-start gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-dim)]">
          Chord diagram
        </h2>
        <Fretboard
          orientation="vertical"
          fretRange={chord.fretRange}
          markers={chord.markers}
          mutedStrings={chord.mutedStrings}
          openStrings={chord.openStrings}
          barre={chord.barre}
          labelMode="custom"
        />
        <button
          type="button"
          onClick={handleStrum}
          className="rounded-full bg-[var(--color-surface-2)] px-5 py-2 text-sm font-semibold"
        >
          Strum Am
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-dim)]">
          Riff loop
        </h2>

        <select
          value={riffIndex}
          onChange={(event) => {
            handleStop();
            setRiffIndex(Number(event.target.value));
          }}
          className="rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {RIFFS.map((option, i) => (
            <option key={option.id} value={i}>
              {option.title}
            </option>
          ))}
        </select>

        {riff !== undefined && geometry !== null && (
          <div ref={scrollRef} className="overflow-x-auto">
            <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playing ? handleStop : handlePlay}
            className="rounded-full bg-[var(--color-accent)] px-6 py-2 font-bold text-[var(--color-ground)]"
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          <label className="flex flex-1 items-center gap-2 text-sm">
            <span className="tabular-nums text-[var(--color-ink-dim)]">
              {Math.round(speed * 100)}%
            </span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="flex-1"
            />
          </label>
        </div>
      </section>
    </main>
  );
}

export default DevHarness;
```

- [ ] **Step 2: Add the render barrel that the harness imports**

Create `src/render/index.ts`:

```ts
export * from './fretboardGeometry';
export * from './tabGeometry';
export * from './chordAdapter';
export { Fretboard, type FretboardProps, type FretMarker, type MarkerTone, type LabelMode } from './Fretboard';
export { TabStaff, type TabStaffProps } from './TabStaff';
```

- [ ] **Step 3: Point the app at the harness**

Replace `src/App.tsx`:

```tsx
import DevHarness from '@/dev/DevHarness';

export default function App() {
  return <DevHarness />;
}
```

- [ ] **Step 4: Run the full suite and the type check**

Run: `npm test -- --run`
Expected: every test passes across `music/`, `render/`, `content/`, `audio/`, `progress/`.

Run: `npm run typecheck`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Verify by hand in the browser**

Run: `npm run dev`, open the printed URL, and confirm each of these. Anything that fails is a bug in the layer named beside it, not something to work around in the harness.

1. "Tap to start" is shown first, and audio only becomes possible after tapping it. — `audio/engine.ts` unlock
2. The header reads `audio: synth`, since no samples are installed. — `audio/manifest.ts` backend selection
3. The horizontal fretboard shows a thick nut on the left, a thick low E on the **bottom**, and inlay dots at frets 3 and 5. — `render/fretboardGeometry.ts`
4. Tapping the low E string at fret 3 sounds a note and prints `G2`. Tapping the open high E prints `E4`. — `music/fretboard.ts` plus the engine
5. The tap you get is the fret you aimed at, including near the edges of the board. — touch-target sizing
6. The Am diagram shows × over the low E, ○ over the A and high E strings, and finger numbers 2, 3, 1 on the D, G and B strings. — `render/chordAdapter.ts`
7. "Strum Am" sounds five notes spread over a few tens of milliseconds, low to high — a strum, not a block chord. — `audio/strum.ts`
8. Pressing Play loops the selected riff continuously with no gap or double-trigger at the loop point. — `audio/riffPlayer.ts`
9. The playhead moves smoothly left to right and lands on each note as it sounds. If it drifts, the bug is in the beat-to-x mapping, not the audio. — `render/tabGeometry.ts`
10. The staff scrolls to follow the playhead on a narrow window.
11. Dragging the speed slider to 50% halves the tempo immediately, without restarting the loop or losing the playhead. — `audio/timing.ts`
12. Switching riffs while one is playing stops the first cleanly. Two riffs never sound at once. — the one-riff-at-a-time transport rule
13. `power-chord-drive` sounds like fifths, not single notes, and shows `P.M.` marks above the staff.
14. Reloading the page returns to "Tap to start" with no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/dev/ src/render/index.ts src/App.tsx
git commit -m "$(cat <<'MSG'
feat(dev): add the foundation harness

Manual proof that the layers fit: tap a fret and hear the right pitch,
strum a chord, loop a riff with a playhead that tracks it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Done when

- `npm test -- --run` passes with coverage across `music/`, `render/`, `content/`, `audio/` and `progress/`.
- `npm run typecheck` and `npm run build` both exit 0.
- Every item in Task 15 Step 5 has been confirmed by hand in a browser.
- `git log` shows one commit per task.

## Explicitly not in this plan

The feed, the quiz modes and the SRS scheduler, the Learn tab, the app shell and routing, the full content library, the visual design pass, and the Capacitor native wrap. Those are Plans 2 and 3, written once this foundation is real.
