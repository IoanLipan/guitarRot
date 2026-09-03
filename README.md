# guitarRot

Dark, rhythm-game-styled mobile web app that replaces doomscrolling with
guitar-theory learning: a vertical Feed of riff loops, chord cards, and
quizzes; a Songs tab (searchable catalogue with playable chord charts and
tab); a Learn tab (fretboard explorer, chord library, scale positions); and
a focused Quiz tab. React 19 + TypeScript (strict) + Vite + Tailwind v4
+ Tone.js. Runs fully offline — no account, no backend.

Notes are real recorded guitar, bundled with the app (`public/audio/guitar/`):
an acoustic set and a clean electric set, one sample every three semitones,
pitch-shifted by `Tone.Sampler` to fill the gaps. A Karplus-Strong synth
remains as the fallback when samples cannot be loaded, so the app is never
mute and pitch is exact either way.

## Status

The music-theory core, audio engine, `Fretboard`/`TabStaff` renderers, and
progress storage (Foundation) are done. The Feed/Learn/Quiz app shell is
built and working: the feed generates endlessly with a designed content mix,
tones are switchable (acoustic / clean / rock / blues / country), and the
library spans blues, country, rock, fingerstyle and lead solos. The Songs
tab ships 26 playable songs with search and difficulty filters, and every
feed card and song has a shareable link. Not yet at parity with the original
design spec — no SRS scheduler, no due-weighted feed, no lessons.

**Read [`docs/FUTURE_WORK.md`](docs/FUTURE_WORK.md) before starting new
work.** It has the full done/not-done checklist, every gap against the
approved spec, and a suggested order for closing them — the point of the
file is that nothing gets rebuilt or forgotten between sessions.

- Design spec: [`docs/superpowers/specs/2026-09-02-guitar-rot-design.md`](docs/superpowers/specs/2026-09-02-guitar-rot-design.md)
- Feed/Learn/Quiz visual & interaction reference: [`design_handoff_guitarrot_app/README.md`](design_handoff_guitarrot_app/README.md)

## Content policy

Every chord, riff, song, and lesson is either written for this app or
verifiably public domain. No third-party or modern-song tablature, ever —
see the design spec's non-goals section.

This is enforced, not just documented: `validateSong` rejects any
`public-domain` entry without an attribution, and `songs.test.ts` asserts
that every catalogue entry is either attributed or credited to `guitarRot`.
The app deploys to a public URL from a public repository, so third-party
copyright is not the maintainer's to waive.

Where a modern style is worth learning, the catalogue teaches the
*technique* under an original name — `Gallop in E` for downpicked thrash,
`Slow Burn` for the post-grunge clean arpeggio — rather than transcribing
someone's song.

## Sharing

Every feed card and song has a stable, content-addressed link:

```
https://guitar-rot.vercel.app/?p=riff:blues-shuffle-e
https://guitar-rot.vercel.app/?p=song:house-of-the-rising-sun
https://guitar-rot.vercel.app/?p=chord:Am-open
https://guitar-rot.vercel.app/?p=quiz:note-s0f3
```

The id addresses *content*, never a position in the feed, so a link keeps
working as the feed regenerates. Opening one lands on that card and then
carries on into the endless feed; the query parameter is stripped once read,
and an unresolvable id falls back to an ordinary launch rather than an error.
Quiz cards are rebuilt from the fret or chord their id names (the answers
reshuffle, which is fine — the question is what was shared).

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
