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
- [x] Learn tab: lesson viewer — **built 2026-10-18** (see "The course UI"
      below). The design handoff never covered lessons, so the screens were
      designed from the plan, not from a mockup.
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
4. ~~Content authoring pass~~ — **done 2026-10-18**: 29 chords, 21 feed
   riffs + 15 lesson drills, 32 songs (6 public-domain melodies added), and
   a 28-lesson course with its `Lesson` type and lesson player. See
   `docs/superpowers/plans/2026-10-18-real-guitar-and-course.md`. The SRS
   item universe in #2 can now be built over the full chord library.
5. **`frontend-design` visual/motion pass** (Plan 3): spring animations,
   haptics, the `ui/` primitives the original spec names.
6. ~~Capacitor wrap~~ — **done for Android** (see the Plan 3 section below).
   iOS still needs `npx cap add ios` and an Xcode signing pass.
7. ~~Real guitar samples~~ — **done**: recorded acoustic, nylon and electric
   sets ship and the engine runs `sampled` (checked in the browser).

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

**Play Store pass (2026-10-18).** A read-only audit before the first release
turned up platform problems; each claim was checked against the Capacitor 8 and
core-splashscreen sources before changing anything. None of it has been run on a
device or emulator (see the validation trick at the end).

- **System bars (edge-to-edge).** targetSdk 36 forces edge-to-edge on Android 15+,
  so `StatusBar.setBackgroundColor` (called in `AppShell`) is a no-op there and
  the bar strips show whatever the window background is. `index.html` now has
  `viewport-fit=cover`, the app themes set `android:windowBackground` to the new
  `@color/ground` (`res/values/colors.xml`, `#0B0B0F`), and
  `plugins.SystemBars.style` is `'DARK'` in `capacitor.config.ts` (DARK = light
  icons for a dark background; the default follows the phone's light/dark mode
  and would paint dark icons on our dark strip). Two things to know before
  touching this: Capacitor's SystemBars plugin copies `windowBackground` onto the
  decor view *as a colour int*, so it must stay a plain `@color`, never a
  drawable; and `env(safe-area-inset-*)` is only non-zero when the plugin is
  passing insets through (WebView 140+ with `viewport-fit=cover`), while on older
  WebViews it pads the parent view instead and `env()` reads 0, so the existing
  `env()` padding in `AppShell`, `TabBar`, `SettingsSheet` and `Feed` never
  doubles up. `AppShell` still calls `StatusBar.setStyle(Dark)`/
  `setBackgroundColor`, which only matter on Android 14 and older.
- **Portrait only** (`android:screenOrientation="portrait"`): landscape left
  lesson content ~144px tall and put the quiz grid under the tab bar. **Open
  (P2):** Android 16 ignores orientation locks on screens of 600dp or more, so
  tablets and unfolded foldables can still rotate and will show the phone layout
  stretched; fixing that means a real wide layout, not a manifest flag.
- **Microphone is optional** (`<uses-feature android.hardware.microphone
  required="false">`): `RECORD_AUDIO` otherwise implies a required feature and
  Play hides the app from mic-less devices.
- **Android 12+ splash.** `AppTheme.NoActionBarLaunch` now sets
  `windowSplashScreenBackground` (`@color/ground`), `windowSplashScreenAnimatedIcon`
  (`@drawable/splash_icon`) and `postSplashScreenTheme`
  (`@style/AppTheme.NoActionBar`); without them the system drew its own
  background colour and the default Android robot. The icon is a vector of the
  pick (`res/drawable/splash_icon.xml`, same geometry as
  `assets/brand/icon-foreground.svg`) rather than `@mipmap/ic_launcher_foreground`,
  because the system draws it at 288dp and that PNG is 192px at best. It does not
  fight the Capacitor plugin: the plugin's `showOnLaunch` calls core-splashscreen's
  `installSplashScreen` itself and holds the splash with a keep-on-screen
  condition until `SplashScreen.hide()`, which `AppShell` calls once. Note that
  `plugins.SplashScreen.backgroundColor` in `capacitor.config.ts` only reaches
  the plugin's pre-Android-12 fallback path; the theme items above are what the
  real splash uses. The old
  green-robot `drawable/ic_launcher_background.xml` and
  `drawable-v24/ic_launcher_foreground.xml` from the Capacitor template are
  unreferenced leftovers.
- **Old WebView.** Tailwind v4 needs Chrome 111, so `android.minWebViewVersion`
  is 111 and `server.errorPath` points at `public/webview-update.html`: plain
  CSS, no JS, the dark palette and the pick logo, with a link to the WebView
  page on Google Play. Capacitor loads it from the app's own assets, and it also
  replaces the page on *any* main-frame load error, so don't add a navigation
  that can 404. (The Splash plugin already skips the launch splash when the
  WebView is too old and an error page is configured, since nothing would ever
  call `hide()`.)
- **Native share.** `ShareButton` uses `@capacitor/share` on native (the WebView
  has no `navigator.share`, so it only ever copied before); the web path is
  unchanged. A dismissed sheet is silent; any other failure copies the link.
  Capacitor hands native rejections to JS as a plain `{ message }` object, not an
  `Error`, so test the message, never `instanceof`.
- **About in Settings.** Version (from `package.json`, via `__APP_VERSION__`
  defined in `vite.config.ts`, typed in `src/app-version.d.ts`), a Privacy
  policy link (Play requires it inside the app), the sample credit, and on the
  web build only a "Get the Android app" link. Links are plain
  `target="_blank"` anchors: Capacitor's `BridgeWebViewClient` routes every
  navigation through `Bridge.launchIntent`, which hands any host other than the
  app's own to `ACTION_VIEW` and blocks the load, so the app's WebView is never
  navigated away. Bump `package.json` `version` *and* `android/app/build.gradle`
  `versionName`/`versionCode` together for a release; nothing keeps them in sync.
- **Privacy policy wording.** `allowBackup` stays on (restoring progress on a new
  phone is a feature), so the page no longer says uninstalling deletes
  everything; it describes Android's encrypted Google backup instead, and the
  share sentence now describes the native share sheet.
- **Songs open easiest-first** (`searchSongs`: title-match rank, then difficulty,
  then catalogue order).

**Checking Android XML without a Gradle build** (the disk is tight): compile
every resource directory with the SDK's `aapt2 compile --dir`, then `aapt2 link`
the app plus the AppCompat / core-splashscreen / Capacitor `res` directories
from the Gradle cache against `android.jar` with a `package=` attribute added to
a copy of the manifest, and read the result with `aapt2 dump xmltree` and
`aapt2 dump resources`. It catches malformed XML (a `--` inside a comment broke
`colors.xml` once), unresolved `@style`/`@drawable` references and bad theme
attributes. It does not prove how anything looks.

Still open for Plan 3:
- ~~Content~~ — done 2026-10-18 (29 chords, 21 riffs, 15 drills, 28
  lessons). The ~40-riff target is still short by ~19 if the Feed starts
  feeling repetitive.
- The `frontend-design` visual/motion pass (spring animations, `ui/`
  primitives) — haptics landed already, ahead of this item, since they were
  cheap once the Capacitor wrap existed.
- iOS platform folder — not attempted. `npx cap add ios` plus an Xcode
  signing pass; no reason it wouldn't work, just not exercised this session.

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

`audio/tones.ts` holds six voicings (acoustic, classical, clean, rock, blues,
country). Each shapes the Karplus-Strong string model *and* the chain after it
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
amp half, so tones remain audible once real samples land. The one exception
inside the amp half is the body EQ: it was tuned to give the *synth* a box, so
`engine.ts` applies `bodyGainDb` only while the live voice is `SynthGuitar`
(`liveBodyGainDb`) and keeps it flat on recordings, which already carry the
resonance of the guitar they were made on. The boost used to put a ~110Hz
boom on every acoustic note. **Classical** (nylon recordings, no drive,
`filterHz` 5000) is the sixth voicing; its string/body numbers only matter on
the synth fallback and are "acoustic, but darker and softer".

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

## Songs tab and sharing (built 2026-09-03)

**Songs** (`src/songs/`, `src/content/songs.ts`, `src/content/songCatalog.ts`)
— 26 songs: 4 original technique studies plus 22 public-domain traditionals,
each with a difficulty, a style, a key and a one-line reason to play it.
Search (`searchSongs`) is a pure AND-match over title/artist/style/key/tags
with title matches ranked first; ties keep catalogue order so results never
reshuffle between keystrokes.

Songs come in two shapes and the model enforces exactly one of them:

- **Chord-chart songs** carry `chart` (sections of bar-by-bar chord names,
  `-` meaning hold). `songToRiff` converts a chart into a `Riff` — strums
  become one note per sounding string with a 0.02-beat spread, arpeggios
  pluck a single string per eighth — so playback reuses `createRiffPlayer`
  whole rather than growing a second, untested audio path. The test that
  matters is `validateRiff(songToRiff(song))` over the entire catalogue: it
  is what catches a note that would ring past the end of a song.
- **Riff songs** carry a `Riff` directly and render on `TabStaff`.

Charts are deliberately limited to the nine chords in `CHORDS`. That keeps
every song learnable from the Learn tab, and adding a chord to the library
widens the quiz pool at the same time — a deliberate coupling, not an
oversight.

**Sharing** (`src/share/`) — `shareId.ts` is pure string work with no
content imports, so the URL format is testable in isolation; `resolve.ts`
maps a target onto content. Ids are restricted to `[A-Za-z0-9-]` so the
colon needs no percent-encoding and a link stays readable in a message.
`AppShell` reads the parameter once on mount, strips it with
`replaceState`, and holds the resolved content in state so it survives the
"Tap to start" gate.

Not done: no Open Graph preview image for a shared link (the site is an SPA
with no prerender, so a shared link unfurls as bare `index.html`); no
per-song progress or "learned" marking; no capo or transposition.

## Sampled audio (built 2026-09-03)

The synth was the sound for four rounds of tuning and still read as
"electric piano". Karplus-Strong was the wrong tool: what makes a guitar
sound like a guitar is the body, the pick, and the inharmonicity of a real
string, none of which the model produces cheaply. The fix was to stop
synthesising. `SampledGuitar`, `manifest.ts` and the backend-selection path
already existed and had never been populated — this fills them in.

**What ships** *(superseded 2026-10-18: the recordings below were replaced by
real instrument recordings, and the voice was rewritten — see "Playing like a
guitar" at the end of this section)* — `public/audio/guitar/{acoustic,electric}`, 17 notes each
(E2 to E6, every three semitones), rendered from FluidR3_GM (CC BY 3.0, so
the attribution is shown in Settings, not just in the repo). 696KB total.

**Manifest sets** — the manifest grew named `sets` alongside the original
unnamed `samples` block, and `ToneProfile` grew `sampleSet`. Acoustic plays
the acoustic set; Clean, Rock, Blues and Country play the electric set and
get their character from the amp chain, which is unchanged. Sets load
lazily: startup fetches only the current tone's set, and switching back is
instant from cache.

**Two bugs this surfaced**, both found in the browser rather than by tests:

- `DEFAULT_SETTINGS.toneId` was `clean` while `DEFAULT_TONE_ID` was
  `acoustic`, so a fresh install loaded the acoustic set and then
  immediately loaded the electric one to land somewhere else. Now aligned,
  with a test pinning the two together.
- Picking a tone in settings calls `setTone` twice (once directly, once via
  the stored-setting effect). Both calls started their own download of the
  same set and left a second sampler connected to the chain. Fixed with an
  in-flight promise map in `GuitarAudioEngine.loadSampleSet`.

**Verified in headless Chrome**: backend reports `sampled`; all 34 samples
fetch and decode; every sample's fundamental is within 10 cents of the pitch
its filename claims (autocorrelation with parabolic peak interpolation —
without the interpolation the top note reads 23 cents flat, which is
quantisation, not detuning); E3 carries nine harmonics above 5% of peak.
Tone switching loads exactly one set per tone, once.

**Coverage gap**: `engine.test.ts` now covers strums and the body EQ against a
mocked Tone, but the load-dedupe and set-swap logic still needs a live Tone
context, so it is only covered end-to-end by the headless-Chrome check
described above. To
reproduce: load the app, read `performance.getEntriesByType('resource')`
filtered to `.mp3`, switch tone in Settings, read it again. Each set must
appear exactly 17 times, never 34. (Sets are bigger now — acoustic 41,
nylon 28, electric 17 — but the rule is the same: once each, never twice.)

### Playing like a guitar (2026-10-18)

Real recordings alone still read as "electric piano", because the *playback*
behaved like a keyboard. `SampledGuitar` was rewritten around
`Tone.ToneAudioBuffers` plus one `Tone.ToneBufferSource` per note (no
`Tone.Sampler`), and what changed is worth knowing before touching it:

- **One note per string.** `RingingNotes` (pure, in `audio/playback.ts`)
  remembers the note each string is sounding; picking the string again stops
  it, the other five keep ringing, and a note with no `stringIndex` never
  chokes. Strums now pass real strings (`chordStrings`), so a strum silences
  the strum before it instead of stacking six more voices — that stacking was
  the sustained-pad sound.
- **Stop only what is still ringing.** `OneShotSource.stop()` cancels any stop
  already scheduled, so stopping a note that was due to end *before* the new
  one would move its end *later* and stretch it. The choke runs only when
  `prev.end > nextStart`, and `end` is deliberately an underestimate (it uses
  the fastest playback rate), because stopping a source that already ended
  hits a disposed node.
- **Natural decay.** No duration means the recording rings out; a duration cuts
  the note at that length with an 80ms fade. The old `triggerAttackRelease(…,
  1.4)` + 0.6s release gave every note the same hold-then-fade, like a key
  being let go; `Tone.Sampler` cannot be bent to avoid that (its release
  tracking drops the voice, and `triggerRelease(note)` stops every voice of
  that pitch).
- **No synthetic pick noise** on samples (the recordings start on the real
  attack; files measured in the browser begin within ~0.001 of silence, so no
  fade-in is needed either). `SynthGuitar` keeps its pick layer — it has no
  recorded attack.
- **Techniques reach the audio** via `ScheduledNote.technique` →
  `PlayNoteOptions.technique` → `noteShape`: hammer/pull x0.6 level, palmMute
  x0.8 and at most 0.12s, slide arrives from 2 semitones below over 0.07s,
  bend rises a whole step over `min(0.18s, 0.3 x duration)` starting 0.03s in
  (tab convention: a bend event's fret is where you fret). The synth ignores
  `technique`.
- **Strums are humanised**: 0–4ms jitter per string and a 1.0 → 0.85 level
  taper in hit order (`planStrum`). Chart songs use real up-strokes: a hit on a
  fractional beat is an upstroke over the top four sounding strings, high to
  low, and the folk pattern is the standard D – D U – U D U. Chart strums also
  keep each string ringing until it is picked again (or the bar ends), so an
  upstroke does not cut the bass strings it never touched.

**Checked in a real browser** (built-in browser pane against `vite preview`):
Settings reports `Engine: sampled`, the console shows only Tone's banner, the
manifest and every sample load once per set (Classical adds the 28 nylon
files once). Instrumenting `AudioBufferSourceNode` showed an E strum tapped
twice choking exactly the strings still ringing, and an Am strum on top
choking strings 1–5 while the low E rang on to its natural end; the Tom Dooley
chart played hits at beats 0, 1, 1.5, 2.5, 3, 3.5 with six strings on the
downs and four on the ups; the bend schedules a ramp to 2^(2/12) 0.21s after
its start. **Not checked by ear** — nothing here can listen, so whether it now
*sounds* like a guitar is Ioan's call.

## The course UI (built 2026-10-18)

The Learn tab is a segmented control: **Course** (default), **Tuner**, **Explore**
(the old Learn screen, moved to `learn/Explore.tsx` unchanged). Course content
is `COURSE` in `content/course.ts`; the UI takes `lessons` as a prop, so it works
with any course and the tests use their own fixtures (`learn/testkit.ts`).

- **Progress** is `ProgressState.lessonsDone` (ids, no version bump; a state
  saved before it existed just defaults to `[]`) and `useProgress().completeLesson`.
  A lesson is recorded when the learner taps through its last step, not when it
  is opened. Nothing is locked; the first undone lesson is highlighted.
- **Step kinds** live one per file in `learn/steps/`. `StepView.stepGate` is the
  single place that says what each kind asks before Next works: `check` and
  `drill` are `required`, `listen` is `skippable` (the footer button reads Skip
  until it is done), the rest are `open`.
- **Listen** checks the microphone with `useMicPitch`: same midi or +-12 held
  250ms. Two traps it handles, both easy to reintroduce: after *Hear it* the
  mic is ignored for 1.8s (the phone's speaker would tick the note off itself),
  and a repeated target (Ode to Joy opens E E) needs the string to go quiet in
  between, because a ringing string never stops matching.
- **Players** (`PlayerPanel`) are created when the step appears and stopped and
  disposed when it goes, the same rules as `SongPlayer`; they do not autoplay.
- Not wired: drill answers do not feed the streak/SRS (a drill can ask about
  frets above 5, which `questionForId` cannot rebuild). Worth doing together
  with the SRS scheduler.
- Checked in the built-in browser at 390x844. The pane blocks the microphone, so
  the listen step's mic path is covered by tests only; try it once on a device.

## Metronome, count-in, loop-a-section, more solos (built 2026-09-08)

**Metronome** (`src/audio/metronome.ts`) — its own `Tone.Synth`, connected
straight to destination, never through the guitar amp chain, so tone/drive
changes never touch the click. `SongPlayer` toggles it; turning it on
mid-playback starts on the next quarter note (`loop.start('@4n')`), turning
it on before pressing Play adds a one-bar count-in
(`metronome.playCountIn`) ahead of `player.start()`. A `startingRef` guard
stops a second tap of Play from overlapping a count-in already in flight.

**Loop-a-section** — chord-chart songs only (riff/tab songs don't have
clickable bars to anchor on). Tap a bar to loop it, tap another to stretch
the range, tap the first bar again to clear. `RiffPlayer` grew
`setLoopRange(startBeat, endBeat)` (shrinks `part`/`transport` loop bounds
and jumps there) and `currentBeat()` (absolute beats from bar 0, unlike
`progress()` which reads as a fraction of whatever range is currently
looping — `SongPlayer`'s playhead and bar-highlight now read `currentBeat()`
for this reason; `RiffCard` in the feed is untouched and still uses
`progress()`, since it never sets a loop range).

**leftHanded setting deleted.** It was stored and validated but nothing
ever read it — a real toggle that did nothing. Removed from `Settings`
rather than wired up.

**Four more riffs** (`em-pentatonic-box2`, `em-pentatonic-box3`,
`em-pentatonic-high-climb`, `g-major-scale-run`) — the feed's riff pool was
9, capped at 8 before repeats per `NO_REPEAT_WINDOW`'s `poolSize - 1` rule,
so it looped back on itself fast. Every new riff's pitches were checked
against `scalePositions()` and `fretToMidi()` in a throwaway test before
being hand-written into `TabEvent`s, rather than trusted from memory of
"standard box shapes" — box two, box three and the high-position climb are
each a strictly ascending MIDI sequence, verified, not assumed. Pool is now
13; the window opens to 12.

**Deliberately not done, per direction:** mic input (still text-and-tap
only — "let's be able to play without a guitar"), any server-side or
cross-device progress sync ("if you uninstall the app, bad luck for now" —
`Preferences`/localStorage stays the only store), and `preferFlats` was
left alone (not asked about, and unlike `leftHanded` it's at least
plausible future work rather than confirmed dead).

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
