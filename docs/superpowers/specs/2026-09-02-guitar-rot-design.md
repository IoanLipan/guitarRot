# guitarRot — Design Spec

**Date:** 2026-09-02
**Status:** Approved for planning

## 1. Purpose

Replace phone doomscrolling with guitar theory learning. The user opens the app in the
same idle moments they would open TikTok or a game, and leaves knowing more about the
fretboard than when they opened it.

Theory is the target. Physical practice happens with the guitar in hand; this app teaches
the things that can be learned without one — note locations, chord shapes, intervals, ear
recognition.

### Success criteria

- Opening the app and scrolling for 3 minutes produces measurable spaced-repetition progress.
- Every note heard in the app is pitch-accurate; a quiz never teaches a wrong answer.
- The app runs fully offline with no account, no network, no backend.
- The UI is good enough that scrolling it competes with the apps it replaces.

### Non-goals (v1)

- No accounts, no sync, no social features, no sharing.
- No microphone input or play-along verification.
- No Guitar Pro / MusicXML import.
- No third-party or modern-song tablature.
- No backing tracks / multi-instrument arrangement.

## 2. Platform and stack

| Concern | Choice |
|---|---|
| Shell | Capacitor 7, iOS + Android platform folders |
| UI | React 19 + TypeScript (strict) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Motion | `motion` (framer-motion successor) |
| Audio | Tone.js |
| Routing | React Router (memory/hash router — no server) |
| Storage | `@capacitor/preferences` |
| Tests | Vitest + @testing-library/react |

Capacitor plugins: `preferences`, `haptics`, `status-bar`, `splash-screen`.

Target: sideloaded personal build. Android APK is the primary distribution; iOS via Xcode
personal signing (7-day expiry) or a paid Apple Developer account.

## 3. Architecture

```
src/
  music/        Pure theory core. ZERO runtime dependencies. Fully unit-tested.
  audio/        AudioEngine interface + SampledGuitar / SynthGuitar backends + Scheduler.
  content/      Typed static data: chords, riffs, lessons, scales.
  render/       Fretboard.tsx, TabStaff.tsx — presentation only, no domain logic.
  feed/         Feed screen, card components, feed generator.
  learn/        Fretboard explorer, chord library, lesson viewer.
  quiz/         Quiz modes + SRS scheduler.
  progress/     ProgressRepo, streaks, stats.
  ui/           Design-system primitives (Button, Card, Sheet, Chip, Meter).
  app/          Shell, routing, providers, tab bar.
```

### Dependency rules (enforced by review, not tooling)

- `music/` imports nothing from the app. It is a library.
- `content/` imports types from `music/` only.
- `render/` imports `music/` types; it never imports `audio/`, `feed/`, or `quiz/`.
- `audio/` imports `music/` only.
- Feature folders (`feed/`, `learn/`, `quiz/`) may import `music/`, `audio/`, `content/`,
  `render/`, `ui/`, `progress/` — never each other. Cross-feature sharing moves down a layer.

Rationale: every bug that matters (wrong note, wrong interval, wrong scheduling) lives in
`music/`, `quiz/srs`, or `feed/generator`. All three are pure functions and all three are
tested exhaustively. Everything above them is presentation.

## 4. Music core (`src/music/`)

Pitch is represented internally as a **MIDI note number** (integer). Names are derived, never stored.

### String indexing — explicit convention

Arrays are indexed **`0` = low E (the 6th string)** through **`5` = high E (the 1st string)**.
Guitarists count the opposite way, so all *display* uses string numbers via
`stringNumber(index) = 6 - index`. Every function signature that takes a string takes a
`stringIndex`, never a `stringNumber`. This is the single most likely source of off-by-one
bugs in the codebase and must not be left implicit.

### Types

```ts
type Midi = number;                                  // 40 = E2 = open low E
type PitchClass = 0 | 1 | ... | 11;                  // 0 = C
type Tuning = readonly [Midi, Midi, Midi, Midi, Midi, Midi];  // index 0 = low E
type FretPosition = { stringIndex: number; fret: number };
type Interval = { semitones: number; shortName: string; longName: string };
```

`STANDARD_TUNING = [40, 45, 50, 55, 59, 64]` (E2 A2 D3 G3 B3 E4).

### Functions

- `midiToPitchClass(m)`, `midiToOctave(m)`
- `noteName(m, opts?: { preferFlat?: boolean; withOctave?: boolean })`
- `parseNoteName(s): Midi`
- `fretToMidi(tuning, stringIndex, fret): Midi`
- `findPositions(tuning, midi, maxFret): FretPosition[]` — every place a pitch can be played
- `interval(a: Midi, b: Midi): Interval`
- `transpose(m, semitones)`
- `enharmonics(pitchClass): string[]`

### Chords

```ts
type ChordShape = {
  id: string;
  name: string;              // "Am", "C", "G7"
  root: PitchClass;
  quality: 'maj' | 'min' | 'dom7' | 'maj7' | 'min7' | 'sus2' | 'sus4' | 'dim' | 'aug' | 'power';
  baseFret: number;          // 1 for open shapes; the diagram's leftmost fret
  frets: (number | null)[];  // 6 entries, index 0 = low E. null = muted, 0 = open
  fingers: (number | null)[];// 6 entries, 1-4 = fingers, null = open/muted
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  difficulty: 1 | 2 | 3;
};
```

`chordVoicing(shape, tuning): Midi[]` returns the sounding notes low-to-high, skipping muted
strings. Used for both audio and quiz answer checking.

### Scales

```ts
type ScalePattern = { id: string; name: string; intervals: number[] }; // semitones from root
```
`scaleNotes(root, pattern): PitchClass[]`, `scalePositions(tuning, root, pattern, fretRange)`.

## 5. Audio engine (`src/audio/`)

### Interface

```ts
interface AudioEngine {
  readonly backend: 'sampled' | 'synth' | 'uninitialized';
  init(): Promise<void>;
  playNote(midi: Midi, opts?: { duration?: number; velocity?: number; time?: number }): void;
  strum(midis: Midi[], opts?: { direction?: 'down' | 'up'; spreadMs?: number; velocity?: number }): void;
  stopAll(): void;
  dispose(): void;
}
```

### Backends

**`SampledGuitar`** — `Tone.Sampler` fed from `public/audio/guitar/`. A `manifest.json`
enumerates available sample files keyed by note name (`E2.mp3`, `A2.mp3`, ...). Samples are
placed roughly every 3–4 semitones across E2–E5; the Sampler pitch-shifts to fill the gaps.
Signal chain: Sampler → gentle lowpass → small room reverb (wet ~0.12) → destination.

**`SynthGuitar`** — six `Tone.PluckSynth` voices (Karplus–Strong), one per guitar string,
allocated by `stringIndex` when known and round-robin otherwise. Same reverb tail. Zero assets.

### Backend selection

`init()` fetches `manifest.json`. Present and non-empty → `SampledGuitar`. Absent, empty, or
failing to load → `SynthGuitar`, logged once, no user-facing error. **Both backends produce
exact pitches**, so the app is fully correct with no samples installed. Adding samples is a
pure quality upgrade requiring no code change.

### Mobile audio unlock

Web audio is suspended until a user gesture in both iOS WKWebView and Android WebView.
`Tone.start()` must be called from inside a real touch handler. The app therefore shows a
single tap-to-start affordance on first launch and marks the context unlocked in memory
thereafter. Any code path that plays audio before unlock is a bug.

### Scheduler (`audio/scheduler.ts`)

Riff playback uses `Tone.Transport`. Riff events (in quarter-note beats) are converted to
Transport time and scheduled as a `Tone.Part` with `loop = true` and
`loopEnd = bars * beatsPerBar`.

Playhead position is read from `Tone.Transport.progress` inside a `requestAnimationFrame`
loop and written directly to a DOM element's CSS transform via a ref. **It never goes through
React state** — a 60fps setState would re-render the card every frame.

Tempo: `Tone.Transport.bpm` scaled by the card's speed slider (50%–100% of the riff's notated BPM).

## 6. Fretboard renderer (`src/render/Fretboard.tsx`)

One SVG component serves the chord cards, the quizzes, and the explorer.

```ts
type FretMarker = {
  stringIndex: number;
  fret: number;
  label?: string;
  tone?: 'root' | 'accent' | 'ghost' | 'muted' | 'wrong' | 'correct';
};

type FretboardProps = {
  tuning?: Tuning;
  orientation: 'horizontal' | 'vertical';
  fretRange: [number, number];
  markers: FretMarker[];
  labelMode?: 'note' | 'interval' | 'finger' | 'custom' | 'none';
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  showOpenStrings?: boolean;
  showInlays?: boolean;
  onFretTap?: (pos: FretPosition) => void;
};
```

- **Horizontal** — wide, many frets. Explorer and note-location quizzes.
- **Vertical** — 5-fret chord-diagram box, strings running top-to-bottom. Chord cards.
- Inlay dots at frets 3, 5, 7, 9, 15, 17, 19, 21; doubles at 12 and 24.
- Nut drawn thick when `fretRange[0] === 0`.
- Tap targets are invisible rects covering each string×fret cell, sized for thumbs
  (minimum 44×44 CSS px), independent of the visual dot size.
- String gauge is rendered to scale — low E visibly thicker than high E.

## 7. Tab renderer (`src/render/TabStaff.tsx`)

Custom SVG. Scope is deliberately narrow: one guitar, 4/4 or 3/4, 4–16 bars, no engraving,
no rests notation, no multi-voice.

```ts
type TabEvent = {
  stringIndex: number;
  fret: number;
  beat: number;        // quarter-note units from riff start
  duration: number;    // quarter-note units
  technique?: 'hammer' | 'pull' | 'slide' | 'bend' | 'palmMute';
};
```

Renders six horizontal lines, fret numbers sitting on their string's line, bar lines at each
measure, and a beat grid. Techniques render as the conventional connectors (`h`, `p`, `/`,
`b`) between adjacent events on the same string.

Playhead is a separate absolutely-positioned element translated by the rAF loop. The staff
container scrolls horizontally to keep the playhead at roughly 35% from the left edge.

`TabRenderer` is defined as an interface so AlphaTab could be substituted later if Guitar Pro
import is ever wanted. Nothing else in the app depends on the SVG implementation.

## 8. Feed (`src/feed/`)

Vertical, one card per viewport, CSS scroll-snap (`snap-y snap-mandatory`). No virtualization
library — the generator yields a rolling window of ~20 cards and prunes behind the viewport.

### Card types

**RiffLoopCard** — `TabStaff` with live playhead, audio looping, speed slider (50–100%),
tap-anywhere to pause/resume, title + style + level chips.

**ChordCard** — large vertical `Fretboard` diagram, finger numbers, tap to hear it strummed,
the note names it contains, and two or three progressions it appears in.

**QuizCard** — a single SRS item pulled from the due queue, rendered inline. Answering feeds
the same scheduler as the Quiz tab.

Lessons are deliberately *not* a feed card type. They live in the Learn tab, where reading is
the intent. The feed stays three cards wide so its rhythm — play, play, answer — never breaks
for prose.

### Audio lifecycle — hard rule

An `IntersectionObserver` at `threshold: 0.6` designates exactly one active card. Becoming
active starts audio; leaving active calls `stopAll()` and disposes the card's Part.
**At most one card produces sound at any time.** Overlapping playback is the single most
likely defect in the feed and must be tested.

### Generator (`feed/generator.ts`)

Pure and deterministic given `(state, seed, count)`, therefore fully testable.

Composition targets: riff 55%, chord 30%, quiz 15%.

Rules:
- A quiz card appears every 4–6 cards whenever the SRS due queue is non-empty; if it is empty,
  its slot is filled by the next-highest-weighted content card.
- No content item repeats within a 15-card window.
- Content is gated to `userLevel + 1`; nothing far beyond current ability enters the feed.
- Weighting favours items whose related SRS items are due or recently lapsed, so the scroll
  drifts toward the user's weak spots without ever feeling like a test.

## 9. Quizzes and SRS (`src/quiz/`)

### Modes (v1)

**`hear-note`** — a single note sounds. Two scored halves: (a) name the pitch class from
multiple choice, (b) tap its location on the fretboard. Part (b) accepts *any* valid position
for that pitch within the shown fret range, since a note lives in several places.

**`see-fret`** — silent. A marker appears on the fretboard; the user names the note. This is
the fastest route to actually knowing the fretboard.

Both modes are available inline as feed `QuizCard`s and as focused sessions in the Quiz tab.

### Item universe

Items are **generated, not authored**:
- one `see-fret` and one `hear-note` item for every string×fret in frets 0–12 (6 × 13 × 2 = 156)
- one item per chord shape in the library (~24)

Each item has a stable deterministic id (e.g. `fret:s0:f5`, `chord:Am-open`), so the schedule
survives content additions.

### Scheduler (`quiz/srs.ts`)

SM-2 variant, pure functions.

```ts
type SrsItem = {
  id: string;
  dueAt: number;      // epoch ms
  intervalDays: number;
  ease: number;       // starts 2.5, floor 1.3
  reps: number;
  lapses: number;
};
```

Grade is derived automatically from correctness and response latency (correct+fast → 5,
correct → 4, correct+slow → 3, incorrect → 1). Correct answers multiply `intervalDays` by
`ease`; incorrect answers reset `intervalDays` to 0 (due again this session), decrement
`ease` by 0.2, and increment `lapses`. New items start due immediately.

## 10. Content (`src/content/`)

All content is either **written for this app** or **public domain**. No modern-song
tablature, no third-party transcriptions, no lyrics. Every item carries a
`source: 'original' | 'public-domain'` field, and public-domain items carry an
`attribution` string.

**Chords (~24)** — open majors and minors (E, A, D, G, C, Am, Em, Dm), open dominant and
minor sevenths, sus2/sus4, then the first movable barre shapes (E-shape and A-shape).

**Riffs (~40)** —
- Original exercises: blues shuffle patterns, minor pentatonic licks, power-chord riffs,
  travis-picking and arpeggio patterns, chromatic warm-ups, string-skipping drills.
- Public-domain melodies: traditional folk tunes and 19th-century classical guitar studies
  (Carcassi, Sor, Carulli) — out of copyright, and written as beginner teaching material.

Riffs are authored as typed TypeScript arrays of `TabEvent`. No text DSL and no parser: the
compiler catches malformed data, and the editor autocompletes it.

**Lessons (~30)** — one idea each: string names, the fifth-fret tuning trick, why the B
string breaks the pattern, octave shapes, what makes a chord minor, how a power chord has no
quality, where the root sits in each CAGED shape.

Content is level-tagged 1–5 to drive feed gating.

## 11. Storage (`src/progress/`)

```ts
interface ProgressRepo {
  load(): Promise<ProgressState>;
  save(state: ProgressState): Promise<void>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<void>;
}
```

Backed by `@capacitor/preferences` (native `UserDefaults` / `SharedPreferences`), storing a
single JSON blob. State is small — a few hundred kilobytes at most — so no native database is
warranted. Writes are debounced 500 ms. A web `localStorage` implementation of the same
interface backs `npm run dev` in the browser.

`ProgressState` holds: SRS items, session history (rolled up daily, capped at 365 days),
streak, per-string and per-fret accuracy, seen-content ring buffer, and settings
(tuning, left-handed, preferred accidentals, speed default).

Export/import as JSON so a reinstall does not destroy a streak.

## 12. Visual direction

Dark, near-black ground with a single warm accent. Full-bleed cards with no chrome but the
tab bar. Oversized display type. The fretboard is drawn as a physical object — dark wood,
metal frets, glowing finger dots — not as a wireframe. Every interaction gets a spring
animation and a haptic tap. The target feel is a rhythm game, not a textbook.

Safe areas honoured via `env(safe-area-inset-*)`. All touch targets ≥ 44 px.

Precise palette, type scale, and motion curves are an implementation-phase decision made
under the `frontend-design` skill; this spec fixes only the direction.

## 13. Testing

Vitest. Exhaustive unit coverage on the pure layers, light component coverage above them.

- `music/` — every function; `fretToMidi` and `findPositions` verified against the full
  standard-tuning fretboard; string-index convention asserted explicitly.
- `content/` — a validation test that every chord shape's voicing matches its declared root
  and quality, and every riff's events fall inside its declared bar count and fret range.
  This catches authoring typos, which are otherwise silent and teach the user wrong things.
- `quiz/srs.ts` — scheduling maths, ease floor, lapse handling.
- `feed/generator.ts` — composition ratios, no-repeat window, level gating, quiz cadence,
  determinism under a fixed seed, and that no lesson content ever enters the feed.
- `audio/` — event-to-Transport-time conversion tested pure; Tone.js itself is not mocked or
  tested.
- Components — `Fretboard` marker placement and tap mapping; feed single-active-audio rule.

No end-to-end suite in v1.

## 14. Build phases

1. Scaffold: Vite + React + TS strict + Tailwind v4 + Vitest. Capacitor not yet added.
2. `music/` core with full test suite.
3. `render/Fretboard.tsx`, both orientations, with tests.
4. `audio/` engine: `SynthGuitar` first, backend interface, mobile unlock gesture.
5. `render/TabStaff.tsx` + `audio/scheduler.ts` + a working looping riff in isolation.
6. `progress/` repo + `quiz/srs.ts` with tests.
7. Feed: card components, generator, scroll-snap shell, single-active-audio rule.
8. Quiz tab: both modes, session flow, results.
9. Learn tab: fretboard explorer, chord library, lesson viewer.
10. Content authoring pass to the target counts, plus the content validation tests.
11. `ui/` design pass across the whole app under the `frontend-design` skill.
12. Capacitor: add iOS + Android, plugins, safe areas, splash/icon, device build.
13. Optional: install real guitar samples and verify the engine upgrades to `sampled`.

## 15. Deferred

Microphone pitch detection and play-along verification. Guitar Pro / MusicXML import.
Backing tracks. Interval and chord-recognition ear quizzes. Alternate tunings beyond
standard. Cross-device sync.
