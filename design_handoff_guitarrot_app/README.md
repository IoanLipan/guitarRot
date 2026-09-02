# Handoff: guitarRot — Feed / Learn / Quiz mobile UI

## Overview
Dark, rhythm-game-styled mobile UI for guitarRot: a three-tab app (Feed, Learn, Quiz) that replaces doomscrolling with a TikTok-style vertical feed of guitar-learning content. This package documents the mockups built in this design session so they can be implemented in the real `guitarRot` codebase (`IoanLipan/guitarRot`, React + TypeScript + Vite + Tailwind v4).

## About the design files
`guitarRot.dc.html` and `Fretboard.dc.html` in this folder are **HTML design references**, not production code. They render with a small proprietary templating runtime and won't run as-is in the app. Treat them as a precise visual/interaction spec — implement the equivalent screens as React components inside the existing `guitarRot` codebase, using its existing libraries and patterns.

**Important:** the `guitarRot` repo already has a real rendering engine for the fretboard/tab/chords (see below). The HTML mockup's `<svg>` fretboard drawing is a simplified stand-in built to match the geometry math in `src/render/fretboardGeometry.ts` — it is **not** meant to replace that code. Wire the new screens to the existing `Fretboard.tsx`, `TabStaff.tsx`, `chordAdapter.ts`, and `src/audio/*` engine rather than reimplementing fretboard drawing from the mockup's SVG.

## Fidelity
**High-fidelity.** Colors, spacing, type sizes, and layout are final. The exact colors used are the repo's own tokens (pulled from `src/index.css`), so this is a direct color match, not an approximation.

## Existing code to build on (don't reinvent)
- `src/render/Fretboard.tsx` + `src/render/fretboardGeometry.ts` — real fretboard rendering/geometry (horizontal + vertical orientations, inlays, touch targets). Use this for the Learn explorer, chord diagrams, and quiz fretboard prompts instead of the mockup's SVG.
- `src/render/TabStaff.tsx` + `src/render/tabGeometry.ts` — real tab notation rendering. Use this for the Feed riff cards instead of the mockup's simplified note-badge layout.
- `src/render/chordAdapter.ts` — converts `ChordShape` → renderable geometry; use for chord cards and the chord library grid.
- `src/content/riffs.ts` — real riff data (`chromatic-warmup`, `em-pentatonic-box1`, `power-chord-drive`) used directly in the Feed mockup.
- `src/music/chords.ts`, `src/music/scales.ts`, `src/music/notes.ts` — chord/scale/note theory. The mockup's 9 chord shapes (E, Am, D, G, C, Em, A, Dm, F) are standard open/barre voicings authored to satisfy `validateChordShape` — port them into a `ChordShape[]` content module (none currently exists in `src/content/`; only test fixtures do).
- `src/audio/*` (`SynthGuitar`, `SampledGuitar`, `riffPlayer`, `strum`) — wire "tap to hear it strummed" and riff playback here.
- `src/progress/*` — wire the Quiz streak/progress indicator to the existing progress repo instead of inventing new state.

## Design tokens
From `src/index.css` (already in the codebase — reuse directly, don't recreate):
- `--color-ground: #0b0b0f` — app background
- `--color-surface: #15151c` — cards, tab bar
- `--color-surface-2: #1e1e28` — chips, chord grid tiles, quiz option buttons
- `--color-ink: #f4f4f6` — primary text
- `--color-ink-dim: #9a9aa8` — secondary text, chips
- `--color-accent: #ffb020` — the one hot accent (active tab, play button, glowing dots, playhead)
- `--color-accent-deep: #c9781a`
- `--color-good: #35d07f` — correct feedback
- `--color-bad: #ff5a5f` — incorrect feedback (not yet shown in mockup; use for a wrong-answer state)
- `--color-wood` / `--color-wood-light` (`#2a1d14` / `#3b2a1d`) — fretboard body gradient
- `--color-fret: #8f8f9c` — fret wire base color

Typography: system font stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`), matching `src/index.css`. Titles/numbers use weight 800–900; chips/labels use weight 700 with `text-transform: uppercase` and `letter-spacing: 0.08–0.12em`.

Radii: phone bezel 54px, screen 44px, cards 14–18px, pill chips 100px (full).

## Screens

### Feed (`guitarRot.dc.html`, "FEED" section)
Full-screen vertical scroll-snap (`scroll-snap-type: y mandatory`, each card `scroll-snap-align: start`), one card fills the viewport. 9 cards cycle: riff → chord → quiz → chord → riff → quiz → riff → chord → quiz.

**Riff card**: style/level/bpm chip row → title (30px/900) → tab box (6 horizontal string lines evenly spaced, amber 26×26 rounded badges showing fret numbers positioned by `beat/totalBeats`, a glowing 3px amber playhead line animating left→right on a loop, looped duration = `totalBeats * 60 / bpm` seconds) → transport row (52px circular amber play button, speed range slider 0.5×–1.5×, loop toggle chip).

**Chord card**: centered layout — chord name (54px/900) + quality label → vertical chord diagram (see Fretboard component below) → "tap to hear it strummed" row with a note-glyph icon chip.

**Quiz card**: radial amber-tinted vignette background, "QUICK QUIZ" pill at top, either a horizontal fretboard segment with one glowing dot (note-ID questions) or a small vertical chord diagram (chord-ID questions), a large centered prompt, and a 2×2 grid of large answer buttons.

### Learn (`guitarRot.dc.html`, "LEARN" section)
Single scrollable screen: "Fretboard explorer" (wide horizontal fretboard, frets 0–12, one glowing tapped dot + a "You tapped fret 5, string 6 → A" caption below) → "Chord library" (3×3 grid of small chord tiles, each a mini vertical fretboard + chord name) → "Scale positions" (horizontal fretboard, frets 0–3, showing E minor pentatonic box 1 with all matching dots glowing).

### Quiz (`guitarRot.dc.html`, "QUIZ" section)
Two states of the same screen:
1. **Question**: streak indicator (dot + "Streak 6"), thin progress bar, horizontal fretboard with one glowing dot, big prompt ("Name this note"), 2×2 answer grid.
2. **Correct feedback**: full-screen soft green radial flash (looping pulse), streak bumped ("Streak 7"), progress bar advanced and recolored green, large "PERFECT" text with a green text-glow, the correct answer button filled green with a pulsing ring animation, other buttons dimmed to ~40% opacity. Use this as the template for an incorrect state too (swap green → `--color-bad`, "PERFECT" → something like "MISS", ring pulse on the button the user tapped instead).

### Fretboard component (`Fretboard.dc.html`)
Reusable across all three screens; documented fully as its own file since the repo already has this exact component (`Fretboard.tsx`) — use the mockup only as the *visual* spec (wood-grain body, tapered string gauge thick→thin, metal fret wires with a brighter nut, single inlay dots at frets 3/5/7/9/(15/17/19/21), double inlay at 12/24, amber glowing finger dots with a pulse animation on "active" notes, O/× marks for open/muted strings above the nut in the vertical/chord orientation).

## Interactions & behavior (to implement — the mockup is static)
- Feed: native vertical scroll-snap; tapping a chord/riff card plays audio via the existing audio engine; quiz cards need real answer handling with the same immediate visual feedback as the Quiz screen's "correct" state.
- Learn: tapping any fret on the explorer plays that note (via `SynthGuitar`/`SampledGuitar`) and updates the "you tapped" caption; tapping a chord tile plays a strum.
- Quiz: answer tap → immediate correct/incorrect flash (reuse the "correct" visual language from the Quiz screen for right answers; build a mirrored red/`--color-bad` version for wrong answers) → advance streak/progress via `src/progress/repo.ts` → next question.
- Riff card playhead and playback speed slider should drive the real `riffPlayer`, not just a CSS animation.

## Assets
No image assets — everything is drawn (SVG lines/circles/gradients + CSS). No icons library used; play/loop/note glyphs are hand-drawn shapes for now — swap for the app's existing icon set if it has one.

## Files
- `guitarRot.dc.html` — full mockup: Feed, Learn, Quiz screens + a side-by-side study of the Fretboard component in both orientations.
- `Fretboard.dc.html` — the standalone reusable fretboard component mockup (props: `orientation`, `lowFret`, `highFret`, `dots`, `openMute`, `barre`, `rootLabel`).
