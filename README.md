# guitarRot

Dark, rhythm-game-styled mobile web app that replaces doomscrolling with
guitar-theory learning: a vertical Feed of riff loops, chord cards, and
quizzes; a Learn tab (fretboard explorer, chord library, scale positions);
and a focused Quiz tab. React 19 + TypeScript (strict) + Vite + Tailwind v4
+ Tone.js. Runs fully offline — no account, no backend.

## Status

The music-theory core, audio engine, `Fretboard`/`TabStaff` renderers, and
progress storage (Foundation) are done. The Feed/Learn/Quiz app shell is
built and working: the feed generates endlessly with a designed content mix,
tones are switchable (clean / rock / blues / country), and the library spans
blues, country, rock, fingerstyle and lead solos. Not yet at parity with the
original design spec — no SRS scheduler, no due-weighted feed, no lessons.

**Read [`docs/FUTURE_WORK.md`](docs/FUTURE_WORK.md) before starting new
work.** It has the full done/not-done checklist, every gap against the
approved spec, and a suggested order for closing them — the point of the
file is that nothing gets rebuilt or forgotten between sessions.

- Design spec: [`docs/superpowers/specs/2026-09-02-guitar-rot-design.md`](docs/superpowers/specs/2026-09-02-guitar-rot-design.md)
- Feed/Learn/Quiz visual & interaction reference: [`design_handoff_guitarrot_app/README.md`](design_handoff_guitarrot_app/README.md)

## Content policy

Every chord, riff, and lesson is either written for this app or verifiably
public domain. No third-party or modern-song tablature, ever — see the
design spec's non-goals section.

## Development

```bash
npm install
npm run dev        # Vite dev server
npm test           # vitest
npm run typecheck  # tsc -b --noEmit
npm run build      # tsc -b && vite build
```

Audio playback requires a real tap or click — browsers suspend Web Audio
until a user gesture — so the app shows a "Tap to start" screen on first
load for exactly that reason.

Deploys to production automatically on every push to `master` (Vercel).

## Android

Wrapped with Capacitor (`android/` is a real, committed platform project).
Building it locally needs a JDK 21 on `JAVA_HOME` and the Android SDK's
`build-tools`/`platforms` (Android Studio isn't required if those are
already on disk):

```bash
npm run build && npx cap sync android
cd android && JAVA_HOME=/path/to/jdk-21 ./gradlew assembleDebug
```

Produces `android/app/build/outputs/apk/debug/app-debug.apk`, installable
by sideloading (no Play Store account needed). See
[`docs/FUTURE_WORK.md`](docs/FUTURE_WORK.md)'s Plan 3 section for what's
wired (Preferences, Haptics, StatusBar, SplashScreen) and what isn't (iOS).
