# Future work

Everything below is deliberately deferred, not forgotten. Each item was
identified during the Foundation plan (see
`docs/superpowers/plans/2026-09-02-foundation.md` and its execution ledger
at `.superpowers/sdd/2026-09-02-foundation/progress.md`) and judged safe to
carry forward rather than fix immediately.

## Plan 2 — App (feed, quizzes, Learn tab, shell)

Not started. Scope per the design spec
(`docs/superpowers/specs/2026-09-02-guitar-rot-design.md`):

- Vertical scroll-snap feed: riff-loop cards, chord cards, quiz cards, an
  "algorithm" that weights by SRS due-ness.
- SRS scheduler (`quiz/srs.ts`) over the ~200-item note/chord universe.
- Two quiz modes: hear-note-name-and-locate-it, see-fret-name-it.
- Learn tab: fretboard explorer, chord library, lesson viewer.
- Bottom tab bar shell and routing.

## Plan 3 — Content, design pass, Capacitor wrap

Not started. Scope: ~24 chords, ~40 riffs (original + public-domain),
~30 micro-lessons; the `frontend-design` visual pass; adding iOS/Android
platform folders and native plugins (Preferences, Haptics, StatusBar,
SplashScreen); installing real guitar samples.

**Known interface note for Plan 3:** `MANIFEST_URL` in `src/audio/manifest.ts`
is the root-absolute path `/audio/guitar/manifest.json`, which won't resolve
under Capacitor's `capacitor://` / `file:` origins. Make it configurable when
the native wrap lands — no change needed before then.

## Carried-forward findings from the Foundation build

None of these block anything today. Listed roughly in the order worth
picking up.

### Correctness / robustness
- **`src/progress/types.ts`** — `migrate()`'s `srs`/`daily`/accumulator
  objects are plain `{}` literals, so a stored key literally named
  `"__proto__"` (reachable via `importJson` on untrusted data) reassigns the
  object's prototype instead of being stored, and silently vanishes from
  `Object.keys`/`entries` iteration. Fix: build those accumulators with
  `Object.create(null)`, or explicitly skip `__proto__`/`constructor`/
  `prototype` keys.
- **`src/render/fretboardGeometry.ts`** — no upper bound on `fretRange`
  (`MAX_FRET` isn't enforced). A range like `[22, 25]` builds a valid
  geometry object, then throws downstream in `Fretboard`'s interactive path
  when `fretToMidi` rejects fret 25.
- **`src/music/chords.ts`** — `finger`, `baseFret`, and `barre.fret` accept
  non-integers (e.g. `finger: 2.5` validates clean). Low impact since these
  are display-only fields; add `Number.isInteger` guards for consistency
  with the rest of the module.
- **`src/content/riffs.ts`** — the internal `powerChord()` helper computes a
  fifth correctly only on strings 0/1/2/4; called on the G string
  (`stringIndex: 3`) it would produce a tritone instead. Only ever called
  with `0` today, and `riffs.test.ts` would catch a future misuse via pitch
  validation — but worth a rename or an inline assertion before it's reused.
- **`src/audio/SynthGuitar.ts`** — `volume.volume.value` is set at call time
  rather than scheduled at `opts.time`; a future-scheduled note picks up
  whatever velocity the *last* call set, not its own. Invisible today (riff
  playback uses a constant velocity). Use `setValueAtTime(value, opts.time)`
  if per-note velocity scheduling is ever needed.

### Test coverage gaps
- `src/music/notes.test.ts` — no boundary test for `midiToOctave(0)`
  (MIDI 0 = C-1); the double-sharp/stacked-accidental parse path (`Cx4`,
  `C##4`) is implemented but untested.
- `src/music/fretboard.test.ts` — no property-sweep test for
  `findPitchClassPositions` mirroring the `findPositions` "agrees with
  fretToMidi" sweep.
- `src/render/tabGeometry.test.ts` — only one on-canvas point is asserted
  (unlike `fretboardGeometry`'s full sweep after its fix round). No live bug
  found by hand-sweeping the three seed riffs, but the invariant isn't
  structurally guaranteed the way the fretboard's is.
- `src/render/Fretboard.test.tsx` — no test asserts a technique-less tab
  note renders zero `technique-*` elements (only the positive case is
  covered).

### Design decisions to revisit deliberately (not bugs)
- **Collision detection in `validateRiff`** stays keyed on `stringIndex` +
  exact `beat` only. It does not catch two notes on one string that overlap
  without sharing a start beat (`beat: 0, duration: 2` vs. `beat: 1,
  duration: 1`) — a real guitar cannot sound both. Catching that needs a
  technique-aware model, since legato phrasing legitimately overlaps.
  Belongs to Plan 2/3 content tooling, not the foundation.
- **The dedup key in the same function** is a string
  (`` `${stringIndex}@${beat}` ``), which could in principle mis-handle
  triplets where mathematically equal beats differ in floating-point
  representation. Not reachable with today's halves-only seed data.
- **Exact set equality in `validateChordShape`** intentionally rejects
  fifth-omitted seventh-chord "shell" voicings (e.g. a Cmaj7 played as
  `[null,3,null,4,5,null]`). This fails safe for a beginner shape library —
  it refuses to certify rather than wrongly certifying. If jazz/shell
  voicings are ever wanted, add an explicit `omits` field to `ChordShape`
  rather than loosening the comparison; loosening it would remove the
  validator's whole safety property.

### Structural / hygiene
- **"Six strings" is encoded independently in at least six places**:
  `STRING_COUNT` constants in both `music/tuning.ts` and (locally
  redeclared, per the plan) `render/fretboardGeometry.ts` and
  `render/tabGeometry.ts`; `SynthGuitar.VOICE_COUNT`; `Fretboard.tsx`'s
  `STRING_WIDTHS` array; `TabStaff.tsx`'s `STRING_LABELS` array; two literal
  `5 * stringSpacing` expressions in `Fretboard.tsx`. Harmless today; would
  need a coordinated sweep if a non-6-string tuning is ever supported.
- **Immutability** — `ChordShape.frets`/`fingers`
  (`(number | null)[]`), `Riff.events` (`TabEvent[]`), and `RIFFS`
  (`readonly Riff[]`, shallow) are all consumed by reference across module
  boundaries (`chordAdapter`, `TabStaff`, `timing`, `riffPlayer`). No bug
  today; worth tightening to `readonly` once more consumers exist and the
  cost of getting it wrong goes up.
- **`src/main.tsx`** — one leftover Vite-scaffold non-null assertion
  (`document.getElementById('root')!`). Swap for an explicit throw.
- **`public/favicon.svg`** — still Vite's own brand mark. Replace before any
  Capacitor store submission, given the project's no-third-party-material
  rule.
- **`src/dev/DevHarness.tsx`** — its `requestAnimationFrame` loop runs
  unconditionally even while stopped, which pins the tab-staff scroll
  position to zero and blocks manual scrolling when nothing is playing.
  This file is explicitly throwaway (replaced by the real app shell in
  Plan 2), so likely not worth fixing in place — noting in case the harness
  outlives its intended lifespan.

### Documented, intentional deviations from the design spec (not drift)
These were deliberate implementation choices, not oversights — recorded
here only so nobody "fixes" them later without checking this list first.
- Tab notation renders technique markers (hammer-on, slide, etc.) as a
  small glyph above the note rather than as a connector drawn between two
  paired events. True slur/slide connectors are a visual refinement
  reserved for the Plan 3 design pass.
- `Fretboard`'s `labelMode` has four values, not five: the spec's
  `'finger'` mode is deliberately subsumed by `'custom'`, so chord diagrams
  pass finger numbers through `marker.label` instead.
- The spec's `showOpenStrings?: boolean` became two explicit arrays,
  `openStrings`/`mutedStrings`, on `FretboardProps`.

## Process note

Two implementer subagents were interrupted mid-task by session rate limits
during this build (Task 9, Task 15). Both recovered cleanly — Task 9 left
no partial files and was fully re-dispatched; Task 15's work was complete
and independently re-verified (tests, typecheck, build, and several of its
own numeric claims) before the controller performed its one missing
`git commit` directly. Nothing was lost either time; the SDD ledger at
`.superpowers/sdd/2026-09-02-foundation/progress.md` is the full record if
it's ever useful to reconstruct exactly what happened and when.
