# Future work

This is the living record of what's done, what's deliberately deferred, and
what's still open against the approved spec
(`docs/superpowers/specs/2026-09-02-guitar-rot-design.md`). Read it before
starting new work — it exists specifically so nothing gets silently
rebuilt or forgotten between sessions.

## Status at a glance

- **Plan 1 — Foundation** (music theory core, audio engine, `Fretboard`/
  `TabStaff` renderers, progress storage): **done**. See
  `docs/superpowers/plans/2026-09-02-foundation.md` and its ledger at
  `.superpowers/sdd/2026-09-02-foundation/progress.md`.
- **Plan 2 — App shell** (Feed / Learn / Quiz screens): **UI built and
  working, not at spec parity.** It was built directly from
  `design_handoff_guitarrot_app/` — a simplified visual mockup, not the full
  spec — so real distance remains from what spec §8/§9 describe. Gaps below.
- **Plan 3 — Content, design pass, Capacitor wrap**: content and the
  design/motion pass not started; the **Capacitor wrap itself is now done**
  — see below.

## Plan 2 — App (feed, quizzes, Learn tab, shell)

Built reusing Foundation's `Fretboard`, `TabStaff`, `chordAdapter`,
`content/riffs`, `src/audio/*`, and `src/progress/*` rather than
reimplementing any of them. 303 tests pass, typecheck is clean, `vite
build` succeeds.

**Built:**
- `src/content/chords.ts` — 9-shape beginner chord library (E, Am, D, G, C,
  Em, A, Dm, F), each validated against `validateChordShape`.
- `src/quiz/generateQuiz.ts` — note-ID and chord-ID question generation with
  chromatic-neighbor / other-library-chord distractors.
- `src/feed/feedItems.ts` — the Feed's card list.
- `src/progress/applyAnswer.ts` — pure streak/daily-stats fold for one quiz
  answer.
- `src/app/{useAudioEngine,useProgress,AppShell,TabBar}.tsx` — the shared
  audio-engine/progress hooks, the gesture-unlock gate, and the bottom tab
  bar shell.
- `src/feed/{Feed,RiffCard,ChordCard,QuizCard}.tsx` — the scroll-snap feed
  and its three card types.
- `src/learn/Learn.tsx` — fretboard explorer (tap → hear + caption), 9-tile
  chord library grid (tap → strum), E minor pentatonic box-1 display.
- `src/quiz/{Quiz,AnswerGrid,QuizVisual}.tsx` — the standalone Quiz tab
  (streak, progress bar, question/feedback states) and the answer-grid /
  fretboard-or-chord-diagram pieces it shares with the Feed's `QuizCard`.
- `src/App.tsx` now renders `AppShell`. `src/dev/DevHarness.tsx` (Foundation's
  throwaway manual-test harness) has been deleted now that the real shell
  supersedes it.

**Checklist against the original spec's Plan 2 scope** (spec §8/§9):

- [x] Vertical scroll-snap feed: riff-loop, chord, and quiz cards.
- [~] Feed generator (`feed/generator.ts`) — **built**, endless and
      seeded-reproducible, hitting the spec's 55/30/15 mix, a quiz every
      3-5 cards, no more than two cards of a kind in a row, and a per-pool
      no-repeat window. **Not** yet weighted by SRS due-ness (needs the
      scheduler below) and there is no level gating, since nothing tracks a
      user level yet.
- [ ] SRS scheduler (`quiz/srs.ts`) — **not built**.
- [~] Two quiz modes — **partially built**. Spec §9 defines `hear-note`
      (audio plays, no visual; user names the pitch class **and** taps its
      location on the fretboard) and `see-fret` (a marker appears; user
      names it). Only the multiple-choice half of `see-fret` exists (a dot
      shown, four name options). `hear-note` (audio-only) doesn't exist at
      all, and no quiz interaction ever asks the user to tap the fretboard
      to answer — every answer is a 2×2 button grid. A chord-ID quiz
      (show a chord diagram, name it) also exists; it isn't in the original
      spec's mode list — it came from the design handoff.
- [x] Learn tab: fretboard explorer, chord library — done.
- [ ] Learn tab: lesson viewer — **not built**. No `Lesson` content type
      exists either. The design handoff never covered lessons at all (its
      Learn section only specs explorer + chord library + scale positions),
      even though spec §3 and §8 both call for them.
- [x] Bottom tab bar shell — done, but **routing is a plain `useState<TabId>`
      in `AppShell`**, not the React Router (memory/hash) spec §2 calls for.
      No practical downside yet since nothing needs deep-linking or the
      browser back button; revisit if either comes up.
- [ ] Spring animation / haptic tap on every interaction (spec §12) — **not
      built**, deliberately: spec §11 puts the whole motion/visual pass
      under a later `frontend-design` step, and haptics needs the Capacitor
      `haptics` plugin from Plan 3 anyway.

**Single-active-audio (spec §8's hard rule) — DONE.** `feed/useActiveCard.ts`
runs an `IntersectionObserver` (threshold 0.6) over the cards and publishes
one `activeIndex`; `RiffCard` starts its player when it becomes active and
stops + disposes it on the way out, so scrolling can never leave audio
running behind you and two cards can never overlap. `Feed.test.tsx` pins
the rule: nine cards render, exactly one player is ever created and
started. The active card also autoplays, which is what makes the feed feel
like the spec's "play, play, answer" rhythm rather than a page of buttons.

**Feed answer flow (the TikTok rhythm) — DONE.** A right answer flashes and
the feed scrolls itself onward after 1s; a wrong answer stops, colours red,
and prints a real explanation built from the theory core
(`quiz/explainAnswer.ts`) — where the correct note sits relative to the one
picked, or which notes each chord actually contains — and waits for a "Got
it" tap. Advancing past a mistake you haven't read is how you repeat it.

**Smaller judgment calls made while building the mockup as literally
specified** (not spec violations, just worth knowing):
- Riff card's "Loop ↻" chip was removed rather than left as a lie: the
  card now autoplays on becoming active and the button pauses/resumes.
  `riffPlayer.ts`'s `start()` always sets `transport.loop = true`, so a
  real one-shot mode still means changing that function's contract.
- No sound plays on a quiz-answer tap; the design handoff's interaction
  list didn't call for it.
- Quiz tab's progress bar tracks a 10-question rolling round — invented;
  neither the design handoff nor the spec define what the bar's denominator
  should be. Once a real SRS due-queue exists, this should probably become
  "due items remaining today" instead.
- A correct answer holds 1s before advancing; a wrong one waits for the
  user. Neither duration was specified anywhere.

## Suggested order for closing the Plan 2 gaps

1. ~~Fix the single-active-audio bug~~ — **done**, see above.
2. **Build `quiz/srs.ts`** and wire `ProgressState.srs` (the `SrsItem` type
   has existed since Foundation; nothing writes to it yet). This unlocks
   real due-queue-driven feed generation.
3. ~~Build `feed/generator.ts`~~ — **done**, except for the due-weighting
   hook, which is a small change to `pickContent` once #2 exists, and level
   gating, which needs a tracked user level.
4. **Content authoring pass** to ~24 chords / ~40 riffs / ~30 lessons, plus
   a `Lesson` content type and Learn-tab lesson viewer (Plan 3 scope, but
   the chord count also feeds the SRS item universe in #2 — do these
   together rather than content-then-SRS-then-content-again).
5. **`frontend-design` visual/motion pass** (Plan 3): spring animations,
   haptics, the `ui/` primitives the original spec names.
6. ~~Capacitor wrap~~ — **done for Android** (see the Plan 3 section below).
   iOS still needs `npx cap add ios` and an Xcode signing pass.
7. **Optional:** install real guitar samples, verify the engine upgrades to
   `sampled`.

## Plan 3 — Content, design pass, Capacitor wrap

**Capacitor wrap — DONE (Android; iOS not attempted).** `android/` is a real
platform project, committed (its own generated `.gitignore` already excludes
`build/`, `.gradle/`, and the machine-specific `local.properties`). Building
it needs a JDK 21 on `JAVA_HOME` — Capacitor 8's Android core requires 21;
17 fails with `invalid source release: 21`, which cost a round-trip the
first time this was built. `npx cap sync android` after any `npm run build`
keeps the native project's web assets current; `cd android && ./gradlew
assembleDebug` produces `android/app/build/outputs/apk/debug/app-debug.apk`
(verify with `apksigner verify --verbose`, not `jarsigner -verify` — modern
AGP debug builds use the v2 signature scheme, which `jarsigner` doesn't
understand and will misreport as "unsigned").

All four plugins the original spec named are wired, not just installed:
- **Preferences** — `NativeProgressRepo` in `src/progress/repo.ts` mirrors
  `WebProgressRepo` exactly; `createProgressRepo()` switches on
  `Capacitor.isNativePlatform()`.
- **Haptics** — `src/app/haptics.ts` (`tapHaptic`/`successHaptic`/
  `errorHaptic`), a no-op outside a native platform, wired to tab switches,
  fret taps, chord strums, riff play/pause, and quiz answers.
- **StatusBar** / **SplashScreen** — set in `AppShell`'s mount effect;
  `launchAutoHide` is off in `capacitor.config.ts` so the splash holds until
  `AppShell` has actually painted something, then hides itself.

The app icon and splash were generated from scratch (`assets/icon*.png`,
`assets/splash.png`, plus `public/favicon.svg` for the web build) rather
than left as the placeholder — see below — using the same zero-dependency
headless-Chrome-over-CDP approach as the UI screenshot passes, run through
`@capacitor/assets`.

Still open for Plan 3:
- ~24 chords, ~40 riffs (original + public-domain), ~30 micro-lessons —
  current counts are 9 / 9 / 0. The riff library now spans blues, country,
  rock, fingerstyle and two lead solos; chords are still the nine open/barre
  shapes.
- A `Lesson` content type and the Learn-tab lesson viewer UI (see Plan 2
  gaps above — this didn't ship with the rest of Learn because the design
  handoff never specified it).
- The `frontend-design` visual/motion pass (spring animations, `ui/`
  primitives) — haptics landed already, ahead of this item, since they were
  cheap once the Capacitor wrap existed.
- iOS platform folder — not attempted. `npx cap add ios` plus an Xcode
  signing pass; no reason it wouldn't work, just not exercised this session.
- Installing real guitar samples.

**`MANIFEST_URL` is very likely already fine, but this is reasoning, not a
verified test.** The APK was built and its signature/manifest checked with
`aapt`/`apksigner`, but nothing in this session actually ran it on an
emulator or device. The old note here worried that the root-absolute path
`/audio/guitar/manifest.json` wouldn't resolve under `capacitor://`/`file:`
origins. Modern Capacitor (8.x) serves the app over a real local HTTP(S)
origin (`https://localhost` on Android) rather than a raw `file://` URL, so
a same-origin absolute-path fetch should resolve exactly like it does in a
browser — but confirm this by actually installing the APK and checking
`engine.backend` (the Settings sheet's "Engine:" line) reports `synth`
with no console error, before treating this as closed. Since no
`public/audio/guitar/manifest.json` exists yet either way, the expected
on-device result is the same 404-and-fall-back-to-synth behavior the
browser already shows.

## Guitar tones

**How to check a change to the sound.** Parameter assertions prove numbers
moved, not that anything sounds better — and two audio bugs here were only
visible by measuring rendered output. Render the engine offline in a real
Web Audio context (headless Chrome, the same zero-dependency CDP setup the
screenshots use), then measure: RMS in 250ms buckets gives the decay
envelope, a first-order difference's share of total energy is a serviceable
brightness proxy, and peak amplitude in the first 20ms shows the attack.
Two traps: the Karplus-Strong excitation is a noise burst, so single renders
vary by up to 2x — average several before trusting a level comparison — and
measure through `GuitarAudioEngine`, not `SynthGuitar` alone, or the drive,
filter, reverb and output trim are all missing from what you measured.

**Resonance is the parameter to be careful with.** It is the energy a string
keeps per round-trip of its delay line, so its effect on sustain is
exponential in pitch, not linear. 0.86 reads reasonable and dies in under
250ms. It also has to *rise* towards the thin strings — a 330Hz high e laps
~4x as often as an 82Hz low E, so flat resonance across the neck measured
0.25s of sustain up top against 1.75s at the bottom. Decay time is roughly
`ln(0.05) / (f * ln(resonance))`; `stringVoicing.ts` holds the spread.

`audio/tones.ts` holds four voicings (clean, rock, blues, country). Each
shapes the Karplus-Strong string model *and* the chain after it
(distortion, filter, reverb wet, gain); `GuitarAudioEngine.setTone` swaps
both live. Two constraints worth knowing before adding a voicing:

- **Reverb decay is fixed.** Changing `decay` makes Tone re-render its
  impulse response asynchronously, which would stall a tone switch. Vary
  `reverbWet` instead — it is instant and does the audible work.
- **`settings.toneId` is a plain string, not the `ToneId` union.** That
  keeps `progress/` free of a dependency on `audio/`, per the spec's
  layering rules. `getToneProfile` is total and falls back to the default
  for an unknown stored id, which is what makes that safe.

The sampled backend ignores the string half of a profile and still gets the
amp half, so tones remain audible once real samples land.

## Findings from the App-shell build (Plan 2)

### How to actually look at the UI (no extra dependencies)
The visual bugs in the first pass — dots rendered off the board, a quiz
fretboard bursting out of its container — all survived a green test suite
and a clean build, because none of those check layout. macOS Chrome plus
Node 22's built-in `WebSocket` is enough to drive the real thing over the
DevTools protocol with **zero new dependencies**: launch
`/Applications/Google Chrome.app/.../Google Chrome --headless=new
--remote-debugging-port=PORT`, read the page target from
`http://127.0.0.1:PORT/json/list`, then `Page.navigate`,
`Emulation.setDeviceMetricsOverride` (390×844, `deviceScaleFactor: 2`,
`mobile: true`), `Runtime.evaluate` to click through the audio gate and the
tabs, and `Page.captureScreenshot` per screen. Worth rebuilding whenever a
screen changes shape — measuring `getBoundingClientRect()` on the shell
elements catches the "everything is 0px tall" class of bug that screenshots
alone can miss.

One trap: run it against `vite preview` (or a dev server you have not
edited in the last few seconds). Vite's dep pre-bundling and HMR both do a
full page reload, and a reload landing mid-script produces a blank
screenshot that looks exactly like a crash.

### Test coverage gaps
- **No component tests for `RiffCard`, `ChordCard`, `SettingsSheet`,
  `AppShell`, `TabBar`, `useAudioEngine`, or `useProgress`.** `Feed`, `QuizCard`, `Learn` and the
  `Quiz` tab now have them, as does every pure module. The shell plumbing
  and the two remaining card components are still uncovered.
- **Layout is not asserted anywhere.** The screenshot pass above is manual.
  Nothing in CI would catch a container that clips its contents again.

### Rendering decisions worth knowing before touching `Fretboard.tsx`
- **The wood body spans the whole SVG canvas**, not just nut-to-last-fret.
  Open-string markers, fret numbers, and dots on the outer strings all sit
  in the geometry's margins; with a body drawn only around the fret grid
  they rendered *off* the instrument and read as broken layout.
- **A marker at fret 0 draws as a ring, not a filled dot** — an open string
  is played, not fretted, and a solid dot there reads as a fretted note.
  This is separate from `openStrings`/`mutedStrings`, which draw the small
  O/× marks a chord diagram needs.
- **`fit` scales a board to its container** (`width/height: 100%` plus the
  viewBox's aspect ratio) instead of its intrinsic pixel size. Any parent
  with a bounded height needs it; without it the SVG keeps its natural
  aspect height and overflows. Never pair a bounded container with
  `h-auto`.
- **Chord finger dots use the `root` tone (amber)**, not `accent` (white):
  white dots vanish against the fret wires at chord-diagram sizes.

### Design decisions to revisit deliberately (not bugs)
- Every Feed/Learn/Quiz component takes the narrow `AudioEngine` interface
  (not the concrete `GuitarAudioEngine` class) specifically so it's
  testable against a plain fake — mirrors `riffPlayer.ts`'s own
  `engine: AudioEngine` parameter. `useAudioEngine.ts` is the one place that
  still needs the concrete class, to call `new GuitarAudioEngine()`.
- `progress/applyAnswer.ts` is a pure fold (`(state, correct, today) =>
  state`) kept separate from `useProgress.ts`'s React/side-effecting glue,
  matching how `progress/types.ts`'s `pruneDaily` is already factored.
  Building the real SRS scheduler (gap above) should extend this function
  rather than duplicating the streak/daily logic elsewhere.

## Carried-forward findings from the Foundation build

None of these block anything today. Listed roughly in the order worth
picking up.

**Note on the chord diagram window:** `chordAdapter.ts`'s fret-window
calculation now special-cases `baseFret === 1` (open shapes) to start at
fret 0 so the nut and open-string circles stay visible, at the cost of the
window not reaching `baseFret + 4` (fret 5) for those shapes even though
`validateChordShape` technically permits a note that high. No open-position
shape here uses fret 5 — real open chords don't — so this is an accepted,
documented trade-off (see the comment in `chordShapeToFretboard`), not an
oversight. If an open-position shape ever legitimately needs fret 5, this
will need a real decision (e.g. widening the open-shape window to 6 frets)
rather than the current fixed 5.

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
- **`public/favicon.svg`** — still Vite's own brand mark. Replace before any
  Capacitor store submission, given the project's no-third-party-material
  rule.

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

## Deployment

The `guitar-rot` Vercel project (org `lipanovskis-projects`) auto-deploys
`master` to production on every push. It didn't always: its **Production
Branch** setting was stuck at `foundation` — a stale branch name from before
that work merged — so every push to `master` only produced a Preview,
requiring a manual "Promote to Production" click each time. Fixed via the
dashboard at Settings → Git → Production Branch (the Vercel REST API's
`PATCH /v9/projects/:id` schema rejects both a top-level `productionBranch`
field and a nested `link.productionBranch` one, so this is a dashboard-only
change, not something to script). If deploys ever start requiring manual
promotion again, check that setting first.

## Process note

Two implementer subagents were interrupted mid-task by session rate limits
during the Foundation build (Task 9, Task 15). Both recovered cleanly — Task 9
left no partial files and was fully re-dispatched; Task 15's work was
complete and independently re-verified (tests, typecheck, build, and several
of its own numeric claims) before the controller performed its one missing
`git commit` directly. Nothing was lost either time; the SDD ledger at
`.superpowers/sdd/2026-09-02-foundation/progress.md` is the full record if
it's ever useful to reconstruct exactly what happened and when.

The Plan 2 app-shell build (Feed/Learn/Quiz) was done inline in a single
conversation rather than through the `subagent-driven-development` process,
directly from `design_handoff_guitarrot_app/`'s handoff package — there is
no SDD ledger for it. This is also why its gaps against the original spec
(above) are wider than Foundation's: it targeted the simpler mockup, not
the full spec, by direct instruction.
