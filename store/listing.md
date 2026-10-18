# Google Play listing — guitarRot

Everything the Play Console asks for, ready to paste. Graphics are in this
folder; screenshots in `screenshots/`.

## App details

| Field | Value |
|---|---|
| App name (≤30) | `guitarRot: Learn Guitar` |
| Default language | English (United States) |
| App or game | App |
| Free or paid | Free |
| Category | Education |
| Tags | Music, Education |
| Contact email | (your developer email — shown publicly on the listing) |
| Website | https://guitar-rot.vercel.app |
| Privacy policy URL | https://guitar-rot.vercel.app/privacy.html |

**Short description (≤80):**

> Scroll riffs, not reels. Learn guitar with real sound, a tuner and 28 lessons.

**Full description (≤4000):**

> Swap doomscrolling for guitar. guitarRot is a feed you can't put down — except every swipe is a riff to play, a chord to learn or a quick quiz on the fretboard.
>
> LEARN FROM ZERO
> A 28-lesson course takes you from "which string is which?" to strumming songs and your first solo scale: tuning, reading tab, every note on the neck, your first chords, strumming patterns, melodies, power chords, keys, the 12-bar blues, hammer-ons, bends and the F barre chord. Each lesson explains, lets you hear it, has you play it on your own guitar, then checks you got it.
>
> IT HEARS YOU PLAY
> The built-in tuner and the "play this note" steps listen through your phone's microphone and tell you when you've hit the right note. Sound is analysed on your phone and never recorded.
>
> SOUNDS LIKE A GUITAR
> Real recorded steel-string, nylon and electric guitars — not synth beeps. Strings ring and stop the way real strings do, and bends, slides and palm mutes sound like the real thing.
>
> DO RE MI ON EVERY NOTE
> Every note is shown with its name and solfège: C (Do), D (Re), E (Mi), F (Fa), G (Sol), A (La), B (Si).
>
> PLAY ALONG
> 32 songs and studies with tab or chord charts, a metronome with count-in, slow-down and loop-a-section. 29 chord shapes with diagrams you can strum. A fretboard explorer and a quiz that drills note names until they stick.
>
> No account. No ads. No tracking. Works offline.

## Graphics

| Asset | File | Spec |
|---|---|---|
| App icon | `icon-512.png` | 512×512 PNG |
| Feature graphic | `feature-graphic.jpg` | 1024×500 JPEG, no alpha |
| Phone screenshots | `screenshots/01-start.png` … `07-feed.png` | 7 images, 1080×2160, upload in file order |

## Data safety (Policy → App content → Data safety)

- Does your app collect or share any of the required user data types? **No.**
  - The microphone is used for pitch detection only. Audio is processed
    on-device, in memory, and never stored or transmitted. Google's definition
    excludes data processed only on the device, so this is not "collection".
  - Progress and settings live in on-device app storage and are never sent.
- Is all user data encrypted in transit? Not applicable (nothing is sent).
- Do you provide a way for users to request data deletion? Not applicable
  (nothing is collected; uninstalling removes local data).

## Other declarations (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | https://guitar-rot.vercel.app/privacy.html |
| Ads | No, the app does not contain ads |
| App access | All functionality is available without special access |
| Content rating (IARC) | Category: Reference, News, or Educational → answer No to every content question → expect *Everyone / PEGI 3* |
| Target audience | 13 and over (keeps the app out of the Families programme's extra requirements; nothing in the app is unsuitable for younger users) |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |

## Release

**1.0.0 is built and signed** (`scripts/release-android.sh`):
`release/guitarRot-1.0.0.aab` is the file to upload to Play;
`release/guitarRot.apk` is on GitHub as release v1.0.0.

- Upload `guitarRot-<version>.aab` (Android App Bundle) to **Internal testing**
  first, then promote to Production.
- Opt in to **Play App Signing** (default). The key in
  `~/.guitarrot/guitarrot-upload.jks` is your *upload* key; Google holds the
  app-signing key. Back up the keystore and `android/keystore.properties`.
- New personal developer accounts must run a **closed test with at least 12
  testers for 14 days** before Production access is granted. Plan for it.
- Every new upload needs a higher `versionCode` in `android/app/build.gradle`.
