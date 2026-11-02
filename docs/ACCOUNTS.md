# Accounts, cloud features and usage analytics

guitarRot is an offline app first. Everything in this document is **optional and
off** unless the build is given a Firebase project: with no `VITE_FIREBASE_*`
variables the app has no account UI, no consent question, makes no network call
and never downloads any Firebase code, exactly as it did before.

This file is the one place that explains the cloud layer and holds the
**manual setup checklist** for the owner (the things only a person with a
Google account can do). Code lives in `src/cloud/`.

- [What the layer does](#what-the-layer-does)
- [Environment variables](#environment-variables)
- [Developing without a Firebase project (emulators)](#developing-without-a-firebase-project-emulators)
- [Usage analytics](#usage-analytics)
- [Manual setup checklist](#manual-setup-checklist)
- [Play Console: Data safety answers](#play-console-data-safety-answers)
- [Troubleshooting](#troubleshooting)

## What the layer does

| Phase | What | Where | Needs in Firebase |
|---|---|---|---|
| 1. Accounts | Sign up and sign in with email and password or Google; sign out; password reset; delete account (and, through `onBeforeAccountDelete` hooks, the cloud data). | `src/cloud/auth.ts`, `AccountProvider.tsx`, `AccountCard.tsx`, `EmailSheet.tsx` | Authentication (Email/Password, Google) |
| 2. Progress sync | Signed-in players' progress follows them to another device. | `src/progress` (sync), Firestore `users/{uid}` | Firestore + rules |
| 3. Leaderboard | Optional public name and XP; a ranking in the You tab. | `leaderboard/` collection, You tab | Firestore + rules + indexes |
| 4. Usage analytics | Opt-in, anonymous: which screens and features are used, and for how long. | `src/cloud/analytics.ts`, `analyticsBackend.ts`, `ConsentSheet.tsx`, `UsageSetting.tsx`, `src/app/useUsageTracking.ts` | Google Analytics enabled on the project |

> **For the merge:** the specifics of phases 2 and 3 (document shapes, rules,
> the indexes file, what the You tab shows, which events `onBeforeAccountDelete`
> removes) belong under their own headings here, between "What the layer does"
> and "Usage analytics". Phase 4 only touches them in two places: the
> `leaderboard_view` event (see below) and the privacy policy's wording.

Everything cloud is loaded on demand (`import()` after the first paint, or after
consent for analytics), so a build with the features off ships the same first
download as before, and a build with them on pays for the SDK only when it is used.

## Environment variables

Vite reads these at **build time** (restart `npm run dev` / rebuild after
changing them). Copy [`.env.example`](../.env.example) to `.env.local`
(git-ignored). The five required values switch the cloud features on together;
leave any out and they all stay off.

| Variable | Required | What |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | yes | Web app `apiKey`. Identifies the project; not a secret (the rules and the authorised domains protect it). |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | yes | The project id |
| `VITE_FIREBASE_APP_ID` | yes | The **web** app's id, `1:…:web:…` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | The project number |
| `VITE_FIREBASE_MEASUREMENT_ID` | for analytics | `G-XXXXXXXXXX`, shown once Google Analytics is enabled. Without it there is no analytics at all: no consent question and no Settings switch. |
| `VITE_FIREBASE_EMULATORS` | dev only | `1` points Auth and Firestore at the local emulators (project `demo-guitarrot`). Wins over any real config in the same environment. Analytics is always off on the emulators. |

The Android app is a Capacitor wrapper around the same web build, so the same
variables must be set when you run `npm run build` before `cap sync android`.
Android additionally needs `android/app/google-services.json` (below).

## Developing without a Firebase project (emulators)

```bash
npm run emulators         # Auth on 9099, Firestore on 8080, project demo-guitarrot
npm run dev:emulators     # the app, pointed at them
npm run test:cloud        # starts the emulators, runs src/**/*.emu.test.ts, stops them
```

Needs the `firebase` CLI and a JDK (`scripts/with-java.sh` finds Homebrew's
`openjdk@21`). The `demo-` project id keeps the emulators offline by design:
nothing can reach a real project. `npm test` never needs them. To try the
consent question and analytics without touching a real project, see
[Trying analytics with a fake config](#trying-analytics-with-a-fake-config).

## Usage analytics

Google Analytics 4, through Firebase. Opt-in, because many of the players are in
the EU: **nothing is collected, loaded or queued until somebody says yes.**

### The one API

`src/cloud/analytics.ts`:

```ts
track(event, params?)                  // typed: a wrong event name or parameter is a compile error
trackScreen(screenName, screenClass?, params?)
setAnalyticsUserProperties({ instrument, level_bucket })
setAnalyticsConsent(granted)           // the answer to "Share anonymous usage?"
analyticsConsent()                     // 'granted' | 'denied' | 'unset'
analyticsAvailable()                   // cloud on, a measurement id, not the emulators
```

All of them do nothing unless `analyticsAvailable()` and consent is `granted`.
The Firebase SDK and the native plugin live in `analyticsBackend.ts`, a separate
chunk fetched only after a yes. Calls go down one queue, so "switch on, log,
switch off" can never run out of order, and a failure (offline, an ad blocker)
is swallowed: analytics never breaks the app.

### Consent

- **When it is asked:** once, in a bottom sheet "Help make guitarRot better?",
  after the instrument has been chosen and the player is out of the start
  screen, never over a lesson, a quiz run or Settings, and about a second after
  the moment is right. **Share usage** (amber) and **No thanks** are the same
  size; Escape and a tap outside do nothing, because walking away is not an
  answer. It is never shown again.
- **Changing it:** Settings > Privacy > **Share anonymous usage** switches it
  on and off at any time.
- **Where it is stored:** `localStorage`, key `guitarrot.analytics-consent.v1`
  (`granted` | `denied`; absent means not asked). It is a decision about this
  device, so it is deliberately **not** in the progress state: progress sync must
  never carry it to another phone. Storage that cannot be read counts as not
  asked, so nothing is collected.
- **Turning it off** stops collection at once and clears the client id where
  the platform allows: on the web `setAnalyticsCollectionEnabled(false)`,
  consent mode `denied`, gtag's `ga-disable-<id>` flag, the `_ga*` cookies, and
  the Firebase installation record; on Android `setEnabled(false)`, consent
  `denied` and `resetAnalyticsData()`. (Events recorded a moment before you
  switch it off can still be on their way for a few seconds: gtag batches.)

### What each platform does

| | Web | Android app |
|---|---|---|
| Library | `firebase/analytics` (gtag.js), checked with `isSupported()` | `@capacitor-firebase/analytics` (native Firebase Analytics) |
| Before consent | not loaded, no request to Google | collection disabled in the manifest; plugin not called |
| On consent | consent mode set (`analytics_storage` granted, ad storage, ad user data and ad personalisation denied), `send_page_view: false`, Google signals off, ad personalisation off | the same consent calls, then `setEnabled(true)` (remembered across launches) |
| Ads | never | never: advertising ID, SSAID, ad storage and the three ad permissions are removed or off in `AndroidManifest.xml` |
| Screens | `screen_view` with `firebase_screen`, `firebase_screen_class`, `screen_name` | `screen_view` with `screen_name`, `screen_class` (automatic per-activity screen reporting is off: the app is one activity) |
| Without a config | no analytics | no `google-services.json`: the plugin call fails quietly and the app is unaffected |

### What is tracked

No personal data and no free text: only content ids, small numbers and fixed
words. **The Firebase uid is not sent as `user_id`**: analytics stays anonymous
(a random client id per browser or install, not linked to the account). The
only user properties are `instrument` and `level_bucket` (`1-2`, `3-5`, `6-9`,
`10+`).

Screens (`screen_view`; GA4 reports engagement time per screen):

| `screen_name` | When | `screen_class` | Extra |
|---|---|---|---|
| `feed`, `songs`, `learn`, `quiz`, `you` | the tab is showing | the tab | |
| `song` | a song is open | `songs` | `song_id` |
| `lesson` | a lesson is open | `learn` | `lesson_id` |
| `tuner`, `explore` | Learn's Tuner / Explore | `learn` | |
| `settings` | the Settings sheet | `settings` | |

Events:

| Event | Parameters | Fired from |
|---|---|---|
| `lesson_start` | `lesson_id`, `instrument` | a lesson opens (`useUsageTracking`) |
| `lesson_step` | `lesson_id`, `step_index`, `step_kind` | each step reached, the first included |
| `lesson_complete` | `lesson_id`, `instrument` | the award stream: the **first** finish (XP is paid once) |
| `song_play` | `song_id`, `instrument` | `onSongPlayed`, after the existing 20-second heard rule |
| `quiz_run_start` | `difficulty` | a quiz run begins (`QuizRun`) |
| `quiz_run_finish` | `difficulty`, `score`, `stars` | a run's last answer, whatever it pays |
| `achievement_unlock` | `achievement_id` | the award stream |
| `level_up` | `level` | the award stream |
| `instrument_switch` | `to` | `switchInstrument` (not the first pick) |
| `tuner_open` | | the Tuner comes up |
| `feed_card_view` | `kind` (`riff`/`chord`/`quiz`), `level` (riffs and chords) | a card stays active 1.5 s, so at most one per 1.5 s |
| `sign_up`, `login` | `method` (`google`/`password`) | `src/cloud/auth.ts` (GA4 recommended events; a first Google sign-in is `sign_up`) |
| `leaderboard_view` | | **not wired yet**: the leaderboard section has to call `track('leaderboard_view')` when it is shown |

Adding an event: add it to `AnalyticsEvents` in `analytics.ts` (the type is the
catalogue), call `track()` from the nearest existing callback, add it to the
table above and to the privacy policy if it says something new about what is
collected.

### Verifying with DebugView

- **Web:** `npm run dev` with a real `.env.local` (dev builds set
  `debug_mode: true`, so hits show in DebugView and are kept out of reports).
  Answer yes to the question, then watch Firebase console > Analytics >
  DebugView (or GA4 Admin > DebugView). In the browser's network panel the hits
  are `POST …google-analytics.com/g/collect` with `en=<event>` and `ep.<param>=`
  / `epn.<param>=` (string / number); `gcs=G101` is "analytics yes, ads no";
  there is no `uid`. With the answer "No thanks" there are no requests to
  Google at all.
- **Android:** `adb shell setprop debug.firebase.analytics.app com.guitarrot.app`,
  start the app, answer yes, watch DebugView; undo with
  `adb shell setprop debug.firebase.analytics.app .none.`.
- Standard reports lag by a day or more; Realtime and DebugView do not.

### Trying analytics with a fake config

To see the consent question and the events without a Firebase project (nothing
is sent to a real project; point the browser's requests to Google at a stub, as
the QA run for this phase did with `playwright-cli` routes):

```bash
VITE_FIREBASE_API_KEY=fake VITE_FIREBASE_AUTH_DOMAIN=fake.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=fake VITE_FIREBASE_APP_ID=1:1:web:1 \
VITE_FIREBASE_MESSAGING_SENDER_ID=1 VITE_FIREBASE_MEASUREMENT_ID=G-TEST123456 \
npx vite --port 5199
```

The SDK asks `firebase.googleapis.com/.../webConfig` and
`firebaseinstallations.googleapis.com` for the measurement id and an
installation id; answer both with canned JSON, and answer
`*.google-analytics.com/g/collect` with 204 while logging it.

## Manual setup checklist

Everything here needs your Google account and cannot be done from the repo. Do
it once, in order. Tick as you go.

### 1. Firebase project (with Google Analytics)

- [ ] <https://console.firebase.google.com> > **Add project**. Name it (say
      `guitarrot`); note the **project id**.
- [ ] On the "Google Analytics" step choose **Enable Google Analytics** and
      create or pick a GA4 account. (If you skip it now: Project settings >
      Integrations > Google Analytics > Enable. Without GA there is no
      measurement id, and the app shows no consent question.)
- [ ] **Analytics settings** (analytics.google.com > Admin, for the property
      Firebase created):
  - [ ] Data collection and modification > **Data retention**: set **Event data
        retention to 14 months** (the default is 2 months). The privacy policy
        says "up to 14 months". Leave "Reset user data on new activity" on.
  - [ ] Data collection and modification > Data collection: turn **Google
        signals data collection** off. The app never uses advertising features.
  - [ ] Data collection and modification > **Data sharing settings**: untick
        everything (Google products and services, modelling contributions,
        technical support, account specialists).
  - [ ] Data streams > the web stream > **Enhanced measurement**: turn off page
        views on history changes, scrolls, outbound clicks, site search, video
        and file downloads. The app reports its own screens; the extras would
        only add noise.
  - [ ] Reporting identity: **Device-based** (the app sets no user id).
  - [ ] Product links: do not link Google Ads.
- [ ] Stay on the free **Spark** plan unless you need more: Authentication,
      Firestore at this size and Analytics are free there. If you ever move to
      Blaze, set a budget alert first.

### 2. Web app config > `.env.local` and Vercel

- [ ] Project settings > General > **Your apps** > add a **Web** app (name
      `guitarRot web`). Do not tick Firebase Hosting (the site is on Vercel).
- [ ] Copy the config into `.env.local` (see [Environment variables](#environment-variables)),
      including `VITE_FIREBASE_MEASUREMENT_ID`. Restart `npm run dev`.
- [ ] Vercel > the project > Settings > **Environment Variables**: add the same
      six variables for **Production** (and **Preview** if you want accounts
      on preview deployments). **Redeploy**: Vite inlines them at build time,
      so a variable added after a build changes nothing until the next one.

### 3. Authentication providers and domains

- [ ] Build > Authentication > **Get started**.
- [ ] Sign-in method > enable **Email/Password** (leave "Email link" off).
- [ ] Sign-in method > enable **Google**; set the **public-facing name**
      (`guitarRot`) and a **support email**.
- [ ] Settings > **Authorized domains**: `localhost` is there by default; add
      `guitar-rot.vercel.app` and any custom domain. Preview deployments
      (`*.vercel.app` hashes) are not wildcard-matched: add the ones you want
      to sign in from, or test sign-in on production only.
- [ ] Templates: set the sender name and the "Reset password" and "Verify
      email" texts and language, if you want them in your voice.
- [ ] Optional hardening later: enable **Email enumeration protection**
      (Settings > User actions); the app's reset flow already answers the same
      way whether or not an address has an account.

### 4. Android app, fingerprints and `google-services.json`

- [ ] Project settings > Your apps > **Add app > Android**: package name
      **`com.guitarrot.app`** (must match exactly), nickname `guitarRot`.
- [ ] Add **SHA-1 and SHA-256** fingerprints for every key an APK or bundle is
      signed with (Project settings > your Android app > Add fingerprint).
      Google sign-in fails with "developer error" for a key that is missing:
  - [ ] **Debug key** (local builds):
        `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
  - [ ] **Upload key** (what `scripts/release-android.sh` signs with):
        `keytool -list -v -keystore ~/.guitarrot/guitarrot-upload.jks -alias <alias>`
        (alias and passwords are in `android/keystore.properties`).
  - [ ] **Play App Signing key**, the one users' phones actually see:
        Play Console > your app > Test and release > **App signing** > "App
        signing key certificate": copy its SHA-1 and SHA-256. Without this,
        Google sign-in works in sideloaded builds and breaks in the Play
        build, which is the commonest launch-day surprise.
- [ ] **Download `google-services.json`** (Project settings > Your apps >
      Android > `google-services.json`) **after** adding the fingerprints, and
      put it at `android/app/google-services.json`. It identifies the project
      and is not a secret (like the web config); it is not git-ignored, so
      commit it if you want every checkout to be able to sign in, or keep it
      local. Without it the debug build still assembles (see the note in
      `android/app/build.gradle`) and only Google sign-in and analytics on
      Android are unavailable.
- [ ] Build the web with the env vars set, then
      `npm run build && npx cap sync android`, then
      `cd android && ./gradlew assembleDebug` (or `scripts/release-android.sh`).
- [ ] If you add a fingerprint later, download `google-services.json` again.

### 5. Firestore (progress sync and the leaderboard)

- [ ] Build > Firestore Database > **Create database**, **Production mode**.
- [ ] **Location: a European one, `eur3` (Europe multi-region) or a single
      `europe-west*` region.** It cannot be changed afterwards. The privacy
      policy says the cloud database is hosted in Europe.
- [ ] From the repo, once: `npm i -g firebase-tools` (or use `npx firebase`),
      `firebase login`, then deploy the rules and indexes to the **real**
      project (the repo's `.firebaserc` default is the emulator-only
      `demo-guitarrot`, so name the project):

      ```bash
      firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>
      ```

- [ ] Check Firestore > Rules shows the deployed rules and Firestore > Indexes
      shows the leaderboard indexes as **Enabled** (a new index can take minutes).
      A query that needs an index fails with a console link to create it.
- [ ] Re-run the deploy whenever `firestore.rules` or `firestore.indexes.json`
      change.

### 6. Play Console

- [ ] Fill the **Data safety** form from the section below.
- [ ] **Account deletion**: Play requires apps with accounts to offer in-app
      deletion (Settings > Account > Delete account) **and** a web link where
      someone can learn how to request deletion without the app. Enter
      `https://guitar-rot.vercel.app/privacy.html#delete-your-data` in
      Policy > App content > Data safety > **Account deletion URL**.
- [ ] Policy > App content > **Privacy policy**: unchanged URL, now describes
      accounts and analytics (`public/privacy.html`; it ships with the site).
- [ ] **Advertising ID**: answer **No** (the SDK's permission is removed in the
      manifest, so there is nothing to declare).
- [ ] Update the store description: drop "No account. No ads. No tracking."
      (`store/listing.md`); "No ads" is still true.
- [ ] Target audience stays 13 and over (the policy asks under-16s to ask a
      parent before creating an account or sharing usage).

### 7. Verify, in this order

- [ ] Web, no consent: open the production site with the network panel open;
      pick an instrument and start. The consent sheet appears about a second
      later. **No** request to `google-analytics.com`, `googletagmanager.com` or
      `firebaseinstallations.googleapis.com` until you press **Share usage**.
- [ ] Press **Share usage**; hits `…/g/collect?…&en=screen_view…` appear (in a
      dev build they are in DebugView, see above); switch it off in Settings and
      the requests stop and the `_ga` cookies are gone.
- [ ] Create an account with email, sign out, sign in with Google; Firebase
      console > Authentication > Users shows both.
- [ ] On a phone: install the build, sign in with Google, finish a lesson, check
      the progress and leaderboard documents in Firestore.
- [ ] Register the custom definitions below, then check in DebugView that the
      events carry their parameters.

### 8. GA4 custom definitions (so parameters show in reports)

GA4 shows a custom parameter in standard reports only once it is registered.
Admin > Data display > **Custom definitions** > Create custom dimension (scope
**Event** unless noted):

| Dimension name | Event parameter |
|---|---|
| Lesson id | `lesson_id` |
| Song id | `song_id` |
| Step kind | `step_kind` |
| Difficulty | `difficulty` |
| Instrument (event) | `instrument` |
| Achievement id | `achievement_id` |
| Card kind | `kind` |
| Switched to | `to` |
| Instrument (user) | `instrument`, scope **User** |
| Level band (user) | `level_bucket`, scope **User** |

and custom **metrics** (Event scope, standard unit): `score` (Quiz score),
`stars`, `step_index`, `level` (Level reached). The engagement-time-per-screen
report needs none of this: it is Reports > Engagement > **Pages and screens**,
with "Page title and screen name" or "Screen name" as the dimension.

## Play Console: Data safety answers

Policy > App content > **Data safety**. These are the answers for a build with
accounts, progress sync, the leaderboard and (optional) analytics. If you ship
without some of them, leave those rows out.

**Overview**

| Question | Answer |
|---|---|
| Does the app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS; Firebase) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: in-app (Settings > Account > Delete account) and the web URL above |

**Data types: collected** (none is "shared" with third parties: Google acts as
our *service provider*, which Play does not count as sharing; the leaderboard
name and XP are shown to other players inside the app, which is not sharing
either. Say so if the form asks.)

| Category > type | Collected | Optional? | Purpose | Notes |
|---|---|---|---|---|
| Personal info > **Name** | yes | yes (needs an account) | App functionality, Account management | display name; Google profile name |
| Personal info > **Email address** | yes | yes (needs an account) | App functionality, Account management | |
| Personal info > **User IDs** | yes | yes (needs an account) | App functionality, Account management | the Firebase uid; the leaderboard entry |
| App activity > **App interactions** | yes | yes, **users can choose** (the consent question) | Analytics | screens, features, durations; progress (lessons, points) is account data, same category |
| Device or other IDs | yes | yes, users can choose | Analytics | the Firebase app-instance id (random, not the account) |
| Location > **Approximate location** | yes | yes, users can choose | Analytics | Google Analytics works out country and city from the connection; declare it to be safe |
| App info and performance | **no** | | | no crash logs or diagnostics are collected |
| Photos and videos, Audio, Files, Contacts, Messages, Financial, Health | **no** | | | the microphone is analysed on the device and never recorded or sent; a Google profile picture is only a link shown in the app |

For every collected type: **Data is not shared**; **Data is collected, not
processed ephemerally** (kept until deleted or, for analytics, expiry);
**Users can request deletion**: yes (progress and account on request in-app;
analytics expires after at most 14 months and is not linked to the account).

**Security practices:** encrypted in transit: yes; deletion request mechanism:
yes; independent security review: no; "Committed to follow the Play Families
Policy": no (target audience 13+).

## Troubleshooting

- **Nothing happens when I turn the env vars on.** They are read at build time:
  restart `npm run dev`, or rebuild and redeploy (Vercel) and re-run
  `cap sync android`.
- **No consent question appears.** It needs `VITE_FIREBASE_MEASUREMENT_ID` (and
  not the emulator mode), an instrument already chosen, and no lesson, quiz run
  or Settings on screen. It is asked once: clear the site data (or
  `localStorage.removeItem('guitarrot.analytics-consent.v1')`) to see it again.
- **Google sign-in "developer error" on Android.** A signing key's SHA-1 or
  SHA-256 is missing from the Android app in Firebase (the Play App Signing key
  is the usual one), or `google-services.json` was downloaded before it was
  added.
- **Analytics reports are empty.** Reports lag; use DebugView or Realtime. Dev
  builds send `debug_mode`, so their hits stay out of standard reports. Check
  the property's data filters for "Developer traffic" and "Internal traffic".
- **A parameter is missing from reports.** Register it as a custom dimension
  (above); it only collects from the day it is registered.
- **`firebase deploy` says it is the demo project.** Pass
  `--project <your-project-id>`, or run `firebase use --add` once.
