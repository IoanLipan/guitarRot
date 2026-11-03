# Accounts, cloud features and usage analytics

guitarRot is an offline app first. Everything in this document is **optional and
off** unless the build is given a Firebase project: with no `VITE_FIREBASE_*`
variables the app has no account UI, no consent question, makes no network call
and never downloads any Firebase code, exactly as it did before.

This file is the one place that explains the cloud layer and holds the
**manual setup checklist** for the owner (the things only a person with a
Google account can do). Code lives in `src/cloud/`.

- [What the layer does](#what-the-layer-does)
- [Creating an account: the sheet, usernames, Apple](#creating-an-account-the-sheet-usernames-apple)
- [Apple sign-in (optional)](#apple-sign-in-optional)
- [Environment variables](#environment-variables)
- [Developing without a Firebase project (emulators)](#developing-without-a-firebase-project-emulators)
- [Moderation](#moderation)
- [Usage analytics](#usage-analytics)
- [Manual setup checklist](#manual-setup-checklist)
- [Play Console: Data safety answers](#play-console-data-safety-answers)
- [Troubleshooting](#troubleshooting)

## What the layer does

| Phase | What | Where | Needs in Firebase |
|---|---|---|---|
| 1. Accounts | Sign up with a username, email and password, or with Google or Apple; sign in; sign out; password reset; delete account (and, through `onBeforeAccountDelete` hooks, the cloud data). | `src/cloud/auth.ts`, `AccountProvider.tsx`, `AccountCard.tsx`, `AccountSheet.tsx`, `usernames.ts` | Authentication (Email/Password, Google, optionally Apple), Firestore `usernames` and `profiles` |
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

## Creating an account: the sheet, usernames, Apple

### One sheet, five doors

`src/cloud/AccountSheet.tsx` is the only place an account is made or signed
into. The app shell owns it (`AppShell.tsx`: one `accountIntent`, so Android Back
closes it from anywhere) and hands every screen the way to open it
(`useOpenAccountSheet()`), so all of these open the same sheet:

| Door | Opens | Shown when |
|---|---|---|
| Start screen (and the "What do you play?" question) | `sign-in`: a quiet **I already have an account** link, for a new phone. Signing in restores the progress through the normal sync, and the start screen carries on ("Continue: ..."). | cloud on, signed out |
| You tab, Account card | `sign-up` (**Create account**, the one amber button on the card) or `sign-in` | cloud on, signed out |
| Settings > Account row | `sign-up` ("Create account or sign in") | signed out; signed in goes to the You tab |
| The one-time offer | `nudge`: **Save your progress**, Google / Apple / email, and **Not now** | see below |
| Leaderboard card | `sign-up` ("Create account to join") | signed out |

The sheet: Google and Apple on top (same size, same stack; Google's dark button
with their four-colour G, Apple's white button with their logo, "Continue with
Apple"), then "or", then **Username, Email, Password** (show/hide; "At least 8
characters") and one amber **Create account**; under it "Already have an
account? **Sign in**". Sign in is the providers, then email and password, "Forgot
your password?" and **Sign in**; "New here? **Create an account**". Problems are
said once, in words, under the field they belong to (username taken or invalid,
email in use, weak password, no connection). The minimum for a **new** password is
8 characters (`validate.ts`); an older, shorter password still signs in.

**The one-time offer** (`src/app/useSaveNudge.ts`): the first win after the app
opened (a lesson finished for the first time, or a badge unlocked, whichever
comes first) is held until a calm moment (no lesson, no quiz run or results,
no Settings, no open pick, no other question, and the analytics question
answered or not asked in this build), then **Save your progress** appears about
0.9 s later. Only when signed out and cloud is on. It is made **once per
device** (`localStorage` key `guitarrot.save-nudge.v1`; it is about the phone, so
it never syncs) and never again whatever the answer: "Not now", a tap outside,
Back and creating an account all count. Where storage is blocked it is made at
most once per visit.

### Usernames

A username is the one name a person goes by: unique, case-insensitive, public
(the leaderboard starts from it). **3 to 20 characters of `a-z`, `0-9`, `_` and
`.`, starting and ending with a letter or digit** (which also keeps a handle clear
of Firestore's reserved `__x__` ids), stored lowercase, minus a few reserved
words (`admin`, `guitarrot`, `support`, ...). `src/cloud/username.ts` validates,
suggests (a number after the word) and seeds the field from a person's name (the
first word, accents removed, else the start of the email, never an Apple "hide my
email" relay address, else `player`). The rules hold the same shape, and
`usernames.rules.emu.test.ts` checks the two agree on every example.

**Data model** (`src/cloud/usernames.ts`):

```
usernames/{handle} = { uid, createdAt }                       the claim; the id IS the username
profiles/{uid}     = { username, createdAt, updatedAt }       the person's side of it
```

Being the document id is what makes a handle unique: two people claiming `ada`
at once write the same document and only one create can win. Claiming, changing
and leaving all happen in **one Firestore transaction** (`claimIn`): read the
profile and the handle; refuse with `username-taken` if somebody else holds it;
create the handle, delete the one being left, write the profile. The loser of a
race is retried by the SDK, sees the winner's claim and is told "That username is
taken." Choosing the name you already have is a no-op.

**Rules** (`firestore.rules`, the "USERNAMES AND PROFILES" block; they use
`getAfter`/`existsAfter`, which look at the state a commit would leave):

- a handle document can be **created** only by a signed-in person, as
  `{ uid: their uid, createdAt: server time }`, for a valid handle, and only if
  *their profile, after the commit, names that handle*;
- it can never be **updated**, and **deleted** only by its owner and only if
  their profile, after the commit, no longer names it (or is gone);
- a **profile** is created or updated only by its owner, in exactly the shape
  above, naming a handle *whose claim, after the commit, is theirs*; a changed
  name must also **free the old handle in the same commit**; its `createdAt`
  never changes; it can be deleted by its owner;
- a single handle can be **read by anyone, signed in or not** (`get`; the sign-up
  form asks "is it free?" while the person types, before an account exists, and
  what it learns is only a uid), nobody can **list** either collection, and a
  profile is read by its owner only.

So: you can't claim a taken handle, can't write someone else's profile, can't
create a handle without your own matching profile, can't hold two handles, and
can't leave one claimed by nobody's profile. All of it is tested in
`usernames.rules.emu.test.ts` (including a race of three at once, and the app's
own transaction run by two people at once: exactly one wins) and
`usernames.emu.test.ts` (the real SDK: signing up, changing, freeing,
deleting).

**Flows.**

- *Email sign-up*: the sheet checks the username's shape, then asks the server
  (debounced 0.4 s while typing: **Available** / **Taken**, with free names to tap
  when taken); `signUpWithEmail` asks once more, creates the Auth user, claims the
  handle and sets the Auth `displayName` to the username. If the name is lost in
  that last moment the person is signed in without one (`UsernameMissingError`)
  and the sheet asks for another, not the whole form again.
- *Google or Apple, then the username step*: after a provider sign-in the sheet
  waits for the profile (`ProfileProvider`, a Firestore listener that fetches
  nothing until somebody is signed in). A person who has none is asked once for a
  username, starting from their name, with one **Continue**; they cannot skip
  inside the step. Closing it leaves them signed in and the Account card shows
  **Pick a username** (and the leaderboard asks for one before joining) until
  it is done. A sign-in that comes back from a full-page redirect (popup blocked)
  shows that card prompt the same way.
- *Changing it*: Account card > **Change username** opens the same step; the old
  handle is freed in the same transaction.
- *Deleting the account* removes both documents. The hook is registered **last**
  (`onBeforeAccountDelete(..., { last: true })`, from `auth.ts`), so a failed
  progress or leaderboard clean-up keeps the account with its name intact.
- *Offline*: availability can't be checked ("Can't check right now"); the claim at
  the end decides and needs a connection (it fails with "No connection"; nothing is
  queued).

Analytics: `sign_up` and `login` carry `method: google | apple | password`;
`username_set` (no parameters, never the name) fires when a handle is claimed or
changed.

## Apple sign-in (optional)

Off until the project is set up: the button shows only when the build has
`VITE_AUTH_APPLE=1` (and cloud features on). Apple's **Sign in with Apple needs a
paid Apple Developer Program membership** (about 99 USD a year), a Services ID
and a key, so there is nothing to switch on in the repo until you have them.
(App Store rule 4.8 is why a future iOS build offering Google would have to offer
Apple; the web and Android builds have no such rule, so Apple is optional here.)

### How it works

- **Web:** `signInWithPopup` with `new OAuthProvider('apple.com')`, scopes `email`
  and `name`; where the browser blocks popups it falls back to
  `signInWithRedirect` (the page comes back to `getRedirectResult`, exactly as for
  Google). Apple shares the name **only the first time** a person authorises the
  app; Firebase puts it in `displayName` then. A person who hides their email gets
  a `...@privaterelay.appleid.com` address: the app never builds a username or a
  display name from it.
- **Android:** `@capacitor-firebase/authentication`'s `signInWithApple` (so
  `apple.com` is in `providers` in `capacitor.config.ts`). It runs Firebase's own
  browser flow (a Custom Tab on `<project>.firebaseapp.com/__/auth/handler`;
  nothing extra to configure beyond the web setup below, and the SHA
  fingerprints from the Android step). Read from the plugin's source
  (`AppleAuthProviderHandler.java`, 8.6.x): **`skipNativeAuth: true` does not
  apply to Apple**, because that handler calls `startActivityForSignInWithProvider`,
  which signs a *native* Firebase user in itself. What it returns is
  `credential.idToken` (Apple's ID token) and `credential.nonce` (the **raw**
  nonce; it sent Apple the SHA-256 of it). The app feeds those to the JS SDK with
  `new OAuthProvider('apple.com').credential({ idToken, rawNonce })` and
  `signInWithCredential`, then **signs the plugin's native user out again**, so
  there is still one auth state (the JS SDK's). Apple's ID token carries no name;
  the name the plugin's native user received (first authorisation only) is saved
  on the JS user if it has none. **This path cannot be tested without a real
  Apple Services ID and a phone**: the unit and emulator tests stand in for the
  plugin and use the Auth emulator's fake Apple provider. The one thing only a real
  run can show is that Firebase accepts Apple's ID token a second time (once in
  the plugin, once in the JS SDK). The token and nonce are valid for that and, as
  far as is documented, Firebase keeps no used-token list, but verify it on the
  first real device.
- **Deleting an Apple account** signs in with Apple again when Firebase wants a
  recent sign-in (popup on the web, the plugin on Android). An iOS App Store
  build would also have to revoke the Apple token (`revokeAccessToken`); there is
  no iOS build.
- **Locally:** `VITE_AUTH_APPLE=1 npm run dev:emulators`. The Auth emulator's fake
  Apple window opens for the real button (email, optional name), so the whole
  flow, username step included, runs with no Apple account.

### Manual setup (once)

1. [ ] Use the **Underdog Labs S.R.L.** team in the Apple Developer Program (the
       organisation membership CeFacem ships with; no new enrolment needed).
2. [ ] Certificates, Identifiers & Profiles > Identifiers > **+** > **App IDs** >
       App. Description `guitarRot`, bundle id `com.guitarrot.app`; under
       Capabilities tick **Sign in with Apple** (Enable as a primary App ID).
       Register.
3. [ ] Identifiers > **+** > **Services IDs**. Identifier `com.guitarrot.app.web`
       (must differ from the App ID). Register, then open it: tick **Sign in with
       Apple** > **Configure**:
       - Primary App ID: the one from step 2;
       - Domains and Subdomains: `<project-id>.firebaseapp.com` (your
         `VITE_FIREBASE_AUTH_DOMAIN`);
       - Return URLs: `https://<project-id>.firebaseapp.com/__/auth/handler`
         (Firebase shows this exact URL when you enable Apple, step 6).
       Next > Done > Continue > Save.
4. [ ] **Domain verification.** Newer Apple setups do not ask for it. If yours
       does, download `apple-developer-domain-association.txt` and serve it at
       `https://<authDomain>/.well-known/apple-developer-domain-association.txt`
       (for the default `firebaseapp.com` domain that means a Firebase Hosting
       deploy of that one file; with a custom auth domain, your own host), then
       press **Verify**.
5. [ ] Keys > **+** > name `guitarRot Firebase`, tick **Sign in with Apple** >
       Configure > the primary App ID > Save > Continue > Register. **Download the
       `.p8` now (Apple lets you once)** and note its **Key ID**. Your **Team ID**
       is in the top-right of the developer pages (and Membership details).
6. [ ] Firebase console > Authentication > Sign-in method > **Apple** > Enable.
       Services ID: `com.guitarrot.app.web`; Apple team ID; Key ID; Private key:
       paste the `.p8`'s text. Save. Check the redirect URL it shows is the one in
       step 3. (Never commit the `.p8`.)
7. [ ] Build with `VITE_AUTH_APPLE=1` (Vercel's environment variables for the web;
       the shell or `.env.local` before `npm run build && npx cap sync android` for
       the app) and redeploy: Vite inlines it at build time.
8. [ ] Try it: on the website, **Continue with Apple** opens Apple's window and
       returns signed in, then asks for a username; on a phone, the same through a
       browser tab. Firebase console > Authentication > Users shows provider
       `apple.com`.
9. [ ] Optional: if you ever email people who hide their address (this app only
       sends password and verification emails to password accounts, so you do
       not need it now), register your sending domain under Apple's "Sign in with
       Apple for Email Communication".

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
| `VITE_AUTH_APPLE` | no | `1` shows **Continue with Apple**. Only after Apple sign-in is set up ([below](#apple-sign-in-optional)). Works with the emulators too. |
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

The Auth emulator fakes Google and Apple (each opens a small "add new account"
window; try Apple with `VITE_AUTH_APPLE=1 npm run dev:emulators`).

Needs the `firebase` CLI and a JDK (`scripts/with-java.sh` finds Homebrew's
`openjdk@21`). The `demo-` project id keeps the emulators offline by design:
nothing can reach a real project. `npm test` never needs them. To try the
consent question and analytics without touching a real project, see
[Trying analytics with a fake config](#trying-analytics-with-a-fake-config).

## Moderation

Two pieces of text are shown to other players and so are user-generated content: the
**username** (public, unique) and the **leaderboard name**. App Store guideline 1.2 and Play's
user-generated-content policy want four things; this is where each one lives.

| Requirement | What guitarRot does | Where |
|---|---|---|
| A filter for objectionable content | A deny-list filter on both names, in the app | `src/cloud/nameFilter.ts` |
| A way to report it, answered in good time | **Report this name** on every other player's leaderboard row; reports arrive by email; target 24 to 48 hours | `src/leaderboard/PlayerSheet.tsx`, `report.ts` |
| A way to block abusive users | **Hide this player**, kept on the phone, with **N players hidden. Show them** at the foot of the board | `src/leaderboard/hidden.ts` |
| Published contact information | `guitar.rot@proton.me`, in the terms, the privacy policy and the store listings | `public/terms.html`, `public/privacy.html` |

Apple also looks for terms that say there is no tolerance for objectionable names or abusive
users, accepted when somebody makes an account: `public/terms.html`
(`https://guitar-rot.vercel.app/terms.html`), linked under **Create account** in the sign-up sheet
and the one-time offer ("By creating an account you agree to the Terms and the Privacy policy") and
under Settings > About > **Terms of use**.

### The filter

`nameFilter.ts` holds a few dozen roots of slurs and strong profanity in English and Romanian. A name
is flattened first (lowercase, accents removed, so `ș ț ă â î` become `s t a a i`; leetspeak undone:
`0 o`, `1 i or l`, `3 e`, `4 a`, `5 s`, `7 t`, `@ a`, `$ s`; `.`, `_`, `-` and spaces dropped) and refused if
it contains a root. A short allowlist of real words and names that contain a root (Scunthorpe,
Kinoshita, popular) is taken out before the roots are looked for. The message is always
"Pick a different name." and never repeats the word.

- It is used by `validateUsername` (so the sign-up field, the username step and
  `usernameSeed`/`suggestUsernames` all honour it) and by `validateLeaderboardName`.
- The board also **leaves out any row whose name the filter refuses** (`BoardView`), so a name written
  before the filter existed, or by a modified client, does not show.
- It is a deterrent, not a classifier: it will miss creative spellings and will sometimes refuse an
  innocent name. To add a word, put its flattened form in `ROOTS`; to let a real name through, add
  the word (flattened) to `ALLOWED`; either way add a case to `nameFilter.test.ts`.
- **It is client-side only.** `firestore.rules` still check only the shape and the reserved words: a
  substring and leetspeak check cannot be written there (the reserved-word check is an exact match). A
  modified client can therefore write any well-formed name, which is why reports and the steps below
  matter, and why the board drops rows the filter refuses.

### How reports arrive

On a leaderboard row (not your own) the dots open a sheet with **Report this name** and **Hide this
player**. Report opens the person's email app with a message to `guitar.rot@proton.me`, subject
**Report a guitarRot name**, and a body with:

```
Name shown: <the name on the board>
Player id: <the player's uid>
What is wrong with it (optional):
```

(A `Username:` line is added when the app knows it; the board shows only the name, so look the
username up from the player id, below.) The email comes from the reporter's own address. Reporting
also hides that player for the reporter. Nothing is sent from the app itself, so there is no
backend to run and nothing to configure; the privacy policy promises the email is used only to review
the name and is deleted once it has been dealt with.

Hiding is local: the uids are in `localStorage` under `guitarrot.hidden-players.v1` (at most 200),
never synced and never seen by us.

### Acting on a report

The target is to **respond within 24 to 48 hours**. In the Firebase console, for the player id in the
email (it is the id of every document below):

1. **Look at the row.** Firestore Database > `leaderboard` > the document with that id. If the
   `name` breaks the terms, either edit `name` to something neutral (the app only ever rewrites it
   when the player renames themselves, so it stays) or **delete the document** to take the
   player off the board. A player whose row is gone sees the join form again, and the filter now
   applies to the name they pick.
2. **Free the username**, if it is the offensive part. Open `profiles/{uid}` and note `username`
   (the handle). Delete **`usernames/{handle}`** and delete (or correct) **`profiles/{uid}`**. The app
   treats a missing profile as "no username yet": the Account card shows **Pick a username** and the
   leaderboard asks for one before joining. The handle is free for anybody to claim at once.
3. **Ban the account**, for abuse and not only a name: Authentication > Users > find the uid > **Disable
   account**. They cannot sign in again; a phone that is already signed in keeps working until its
   token refreshes (up to an hour), so delete their `leaderboard` row as well and look once more
   after an hour. Deleting the user outright (Authentication > Delete account) also works, but leaves
   `users/{uid}`, `profiles/{uid}`, `usernames/{handle}` and `leaderboard/{uid}` behind to be removed by hand.
4. **Answer the reporter** if it helps, then **delete the email**.

Nothing needs deploying for any of this: console edits bypass the security rules.

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
| `sign_up`, `login` | `method` (`google`/`apple`/`password`) | `src/cloud/auth.ts` (GA4 recommended events; a first Google or Apple sign-in is `sign_up`) |
| `username_set` | | `src/cloud/auth.ts`, when a username is claimed or changed (never the name itself) |
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

Everything here needs the app's own accounts and cannot be done from the repo.
Do it once, in order. Tick as you go.

guitarRot is published by **Underdog Labs S.R.L.** (the controller named in
`public/privacy.html`, the same company that publishes CeFacem), and its contact
address is **`guitar.rot@proton.me`**.

### 0. The app's Google account

- [ ] Make a Google account **for that address** rather than using a personal
      Gmail: <https://accounts.google.com/signup> > "Use your existing email" >
      `guitar.rot@proton.me`, then confirm the code Google mails to Proton.
      Firebase, Google Analytics and the Google sign-in "support email" all
      hang off this account.
- [ ] Turn on 2-step verification for it, and later add a second **Owner**
      (Firebase console > Project settings > Users and permissions) so the
      project is never locked behind one login.
- [ ] Point the Firebase CLI at it (this Mac's CLI is logged in as a personal
      account): `firebase login:add` (opens a browser, sign in as
      `guitar.rot@proton.me`), then `firebase login:use guitar.rot@proton.me`.

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
      (`guitarRot`) and the **support email** `guitar.rot@proton.me`.
- [ ] Optional: **Apple** (needs a paid Apple Developer account; follow
      [Apple sign-in](#apple-sign-in-optional), then build with `VITE_AUTH_APPLE=1`).
- [ ] Settings > **Authorized domains**: `localhost` is there by default; add
      `guitar-rot.vercel.app` and any custom domain. Preview deployments
      (`*.vercel.app` hashes) are not wildcard-matched: add the ones you want
      to sign in from, or test sign-in on production only.
- [ ] Templates: set the sender name (`guitarRot`) and **Reply to**
      `guitar.rot@proton.me`, and the "Reset password" and "Verify email" texts
      and language, if you want them in your voice.
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
- [ ] From the repo, once: `npm i -g firebase-tools` (or use `npx firebase-tools`; plain `npx firebase` finds the app SDK, which has no CLI),
      `firebase login:use guitar.rot@proton.me` (step 0), then deploy the rules and indexes to the **real**
      project (the repo's `.firebaserc` default is the emulator-only
      `demo-guitarrot`, so name the project):

      ```bash
      firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>
      ```

- [ ] Check Firestore > Rules shows the deployed rules and Firestore > Indexes
      shows the leaderboard indexes as **Enabled** (a new index can take minutes).
      A query that needs an index fails with a console link to create it.
- [ ] Re-run the deploy whenever `firestore.rules` or `firestore.indexes.json`
      change. **The username sign-up needs the `usernames` and `profiles` rules
      live**: with an older deployment, creating an account says "We couldn't save
      your username" and the person is left signed in with no username. Deploy the
      rules **before** shipping a build that has the sheet. (The collections need
      no setup; the first claim creates them.)

### 6. Play Console

- [ ] Sign in to the **Underdog Labs S.R.L.** developer account (the one that
      publishes CeFacem) > **Create app** `guitarRot: Learn Guitar`, package
      `com.guitarrot.app`. The rest of the listing is in `store/listing.md`;
      the public **contact email** is `guitar.rot@proton.me`.
- [ ] Fill the **Data safety** form from the section below.
- [ ] **Account deletion**: Play requires apps with accounts to offer in-app
      deletion (Settings > Account > Delete account) **and** a web link where
      someone can request deletion without the app (the policy offers an email
      to `guitar.rot@proton.me`, answered within 30 days). Enter
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
| Personal info > **Name** | yes | yes (needs an account) | App functionality, Account management | username (public: it is the leaderboard's starting name); display name; Google or Apple profile name |
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
- **Creating an account says "We couldn't save your username".** The `usernames`
  and `profiles` rules are not deployed to this project
  (`firebase deploy --only firestore:rules --project <id>`). The Auth account was
  made; the person is signed in and the Account card offers **Pick a username**
  once the rules are live.
- **The Apple button is not there.** The build needs `VITE_AUTH_APPLE=1` (and
  the Firebase config); rebuild after setting it. **It is there but fails with
  "That way of signing in isn't turned on yet"**: Apple is not enabled in
  Authentication > Sign-in method. **"Signing in isn't set up for this web
  address yet"**: the domain is missing from Authentication > Settings >
  Authorized domains. Apple's own page showing `invalid_request`: the Services
  ID's return URL or domain does not match the Firebase auth domain exactly.
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
