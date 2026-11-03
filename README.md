# guitarRot

Dark, rhythm-game-styled mobile web app that replaces doomscrolling with
guitar-theory learning: a vertical Feed of riff loops, chord cards, and
quizzes; a Songs tab (searchable catalogue with playable chord charts and
tab); a Learn tab (fretboard explorer, chord library, scale positions); and
a focused Quiz tab. React 19 + TypeScript (strict) + Vite + Tailwind v4
+ Tone.js. Runs fully offline — no account, no backend (accounts are an
optional layer that exists only in a build given a Firebase config; see
[Accounts](#accounts-optional)).

Notes are real recorded guitar, bundled with the app (`public/audio/guitar/`):
an acoustic set and a clean electric set, one sample every three semitones,
pitch-shifted by `Tone.Sampler` to fill the gaps. A Karplus-Strong synth
remains as the fallback when samples cannot be loaded, so the app is never
mute and pitch is exact either way.

## Stack

Published by **Underdog Labs S.R.L.** (contact `guitar.rot@proton.me`) on the
web, Google Play and the App Store, all from one codebase.

| Layer | What | Notes |
|---|---|---|
| UI | React 19, TypeScript 6 (strict), Tailwind CSS v4 | self-hosted fonts (Figtree, Big Shoulders Display); no UI kit |
| Build | Vite 8 | `npm run build` > `dist/` |
| Audio | Tone.js 15 | recorded guitar and ukulele samples in `public/audio/`, Karplus-Strong fallback; pitch detection on the device (tuner, lesson checks) |
| Native apps | Capacitor 8 | `android/` (Gradle, JDK 21) and `ios/` (Xcode, Swift Package Manager); one web bundle inside both |
| Accounts | Firebase Authentication | username + email + password, Google, Apple; on phones through `@capacitor-firebase/authentication` |
| Database | Cloud Firestore, `eur3` (EU) | progress sync, usernames, leaderboard; access decided by `firestore.rules` |
| Analytics | Google Analytics 4 via Firebase | opt-in only; `@capacitor-firebase/analytics` on phones |
| Hosting | Vercel | the website, from `master`; `public/privacy.html`, `public/terms.html` ship with it |
| Tests | Vitest 4 + Testing Library (jsdom); Firebase Emulator Suite | `npm test`; `npm run test:cloud` for rules and sync against the emulators |
| Releases | GitHub Releases (APK), Play Console (AAB), App Store Connect | `scripts/release-android.sh`; iOS in [`docs/IOS.md`](docs/IOS.md) |

Firebase project: `guitarrot-a27b5` (owner `guitar.rot@proton.me`). Privacy
records: [`docs/GDPR.md`](docs/GDPR.md).

## Status

The music-theory core, audio engine, `Fretboard`/`TabStaff` renderers, and
progress storage (Foundation) are done. The Feed/Learn/Quiz app shell is
built and working: the feed generates endlessly with a designed content mix,
tones are switchable (acoustic / clean / rock / blues / country), and the
library spans blues, country, rock, fingerstyle and lead solos. The Songs
tab ships 40 playable songs with search and difficulty filters, and every
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

## Accounts (optional)

Sign-in with Google, Apple (once set up, see below) or a username, email and
password (Firebase Auth) lives in `src/cloud/`. It is off unless the build has the `VITE_FIREBASE_*` variables from
[`.env.example`](.env.example); without them the app is the offline app, shows
no account UI, makes no network call and never downloads the Firebase SDK
(it is loaded with `import()`, after the first paint, only when enabled).

Develop against the local Firebase Emulator Suite, with no Firebase project and
no Google account (needs the `firebase` CLI and a JDK; `scripts/with-java.sh`
finds Homebrew's `openjdk@21`):

```bash
npm run emulators         # Auth on 9099, Firestore on 8080, project demo-guitarrot
npm run dev:emulators     # the app, pointed at them
npm run test:cloud        # starts the emulators, runs src/**/*.emu.test.ts, stops them
```

### Creating an account

One bottom sheet (`AccountSheet.tsx`) does it all: **Continue with Google**,
**Continue with Apple** (only with `VITE_AUTH_APPLE=1`), "or", then **Username,
Email, Password** and one amber **Create account**; "Already have an account?
Sign in" switches to email and password (with a password reset). It opens from
the You tab's Account card, Settings, a quiet **I already have an account** link
on the start screen (for a new phone: signing in restores the progress), and a
one-time **Save your progress** offer after the first finished lesson or first
badge (only when signed out, never during a lesson or quiz run, never again
once shown).

**Usernames** are unique and case-insensitive: 3 to 20 characters of `a-z`,
`0-9`, `_` and `.`, starting and ending with a letter or digit. They live in two
Firestore collections that only ever change together, `usernames/{handle}` =
`{ uid, createdAt }` (the handle is the document id, which is what makes it
unique) and `profiles/{uid}` = `{ username, createdAt, updatedAt }`. The rules use
`getAfter`/`existsAfter`, so a handle can be created only together with its
owner's profile, a profile can name only a handle its owner holds, and changing
the name frees the old handle in the same commit. Somebody who signs in with
Google or Apple and has no username is asked for one once (starting from their
name); until they pick it the Account card says **Pick a username**. The
leaderboard name starts as the username. Deleting the account removes both
documents.

**Apple** needs a paid Apple Developer account, so its button is hidden until
the project is set up: follow [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md#apple-sign-in-optional)
and build with `VITE_AUTH_APPLE=1`.

### Progress sync

Signed in, the progress on the phone is kept in step with the account: one
Firestore document per person, `users/{uid}` = `{ progress, schemaVersion,
updatedAt }`. Signing in on a new phone **merges** (never replaces): lessons,
songs, achievements and practice days are unions, XP, quiz bests and daily
tallies take the bigger value, the day streak is rebuilt from the merged days,
and each spaced-repetition card takes whichever phone reviewed it last
(`src/progress/mergeProgress.ts`). Settings and the feed's memory stay on the
phone, except that a phone that was never asked which instrument it plays takes
the account's. Changes are written about four seconds after the last one (and
when the app goes to the background or you sign out), only if the account does
not already have them; writes made offline wait in Firestore's cache. Signing
out leaves the progress on the phone; deleting the account deletes the document.

The security rules are in [`firestore.rules`](firestore.rules) (each person can
reach only their own `users/{uid}`, in exactly the shape the sync writes; the
leaderboard, `usernames` and `profiles` have their own blocks; the rest is
denied). In a real Firebase project, once: console > Build > Firestore Database
> Create database (pick the region closest to your players; it can't be changed
later), then `firebase deploy --only firestore:rules,firestore:indexes --project
<your-project-id>`. **Redeploy the rules whenever the file changes**: the
username sign-up fails (it says "We couldn't save your username") until the
`usernames` and `profiles` rules are live.

`npm test` never needs the emulators. Android Google sign-in needs
`android/app/google-services.json` from the Firebase console; without it the
debug build still assembles (see the note in `android/app/build.gradle`).

**Usage analytics** (opt-in, tied to a random id and never to the account: which screens and features are used and
for how long) is part of the same layer and switches on only when
`VITE_FIREBASE_MEASUREMENT_ID` is set too. Nothing is collected or loaded until
the player says yes to the one-time question (and Settings has the switch).
Everything about it, the env vars, and the owner's **manual setup checklist**
(Firebase project, Auth providers, SHA fingerprints, Firestore, Play Console
Data safety, DebugView) is in [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md).

## Running costs

Firebase prices checked on 2026-11-03 (Firestore `eur3`: $0.06 per 100k reads,
$0.18 per 100k writes, $0.18 per GiB-month; free every day: 50k reads, 20k
writes, 20k deletes, 1 GiB). The estimate assumes "users" means monthly active
users, a fifth of them on a given day, and everyone signed in (the worst case: a
player without an account costs nothing). A signed-in player's day is about 130
reads (mostly two leaderboard views of 25 rows each) and 25 writes (progress
sync and leaderboard points, both throttled).

| Monthly users | Firestore | Authentication | Analytics | Firebase total |
|---|---|---|---|---|
| 1,000 | $0 (inside the free tier) | $0 | $0 | **$0** |
| 10,000 | about $4 reads + $2 writes | $0 | $0 | **about $6 / month** |
| 100,000 | about $46 reads + $26 writes | $0 (see below) | $0 | **about $70 / month** |

- **Plan.** The free Spark plan stops serving reads for the rest of the day once 50k are used, and caps Authentication at 3,000 daily users and 150 password-reset emails a day. So move to **Blaze** (pay as you go, same free tier) before launch, with **budget alerts** (say at $10, $50 and $100).
- **Authentication.** Email, Google and Apple sign-in cost nothing up to 50k monthly users. Above that, a project upgraded to Identity Platform pays about $0.0055 per user (about $275 a month at 100k). Do not click "Upgrade to Identity Platform" unless a feature needs it.
- **Other costs:**
  - Vercel's free Hobby plan is for non-commercial use only. A company app needs **Pro, $20 a month**, or a move to Cloudflare Pages or Firebase Hosting.
  - Apple Developer Program: $99 a year (Underdog Labs already has one).
  - Google Play: $25 once (already paid).

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
by sideloading (no Play Store account needed).

**Release builds** are signed with the Play upload key, which lives outside
the repo and is referenced by the gitignored `android/keystore.properties`:

```bash
scripts/release-android.sh
```

Builds the web app, syncs it, and writes `release/guitarRot-<version>.aab`
(for Google Play) and `release/guitarRot.apk` (for sideloading — the latest
one is always at
<https://github.com/IoanLipan/guitarRot/releases/latest/download/guitarRot.apk>).
Bump `versionCode` in `android/app/build.gradle` before each Play upload.
Store listing copy, policy answers and graphics are in [`store/`](store/listing.md). See
[`docs/FUTURE_WORK.md`](docs/FUTURE_WORK.md)'s Plan 3 section for what's
wired (Preferences, Haptics, StatusBar, SplashScreen).

## iOS

Also Capacitor (`ios/` is a committed Xcode project, Swift Package Manager, no CocoaPods;
iPhone only, iOS 16.4 or newer, portrait). With Xcode 16.3 or newer:

```bash
npm run build && npx cap sync ios
open ios/App/App.xcodeproj          # or build for a simulator with xcodebuild
node scripts/ios-version.mjs        # after bumping: version from package.json, build number from versionCode
```

The Firebase file is `ios/App/App/GoogleService-Info.plist`; Google sign-in needs the plist
re-downloaded after Google is enabled in the console, then `scripts/ios-google-url-scheme.sh`.
The app shows **Continue with Apple** on iOS whatever `VITE_AUTH_APPLE` says (App Store
rule 4.8). Everything about it, the manual steps (Apple Developer team, App Store Connect,
TestFlight), the privacy labels and age rating answers, and the known review risks are in
[`docs/IOS.md`](docs/IOS.md).
