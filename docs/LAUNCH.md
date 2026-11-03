# Going live: web, Google Play, App Store

The one ordered list of what is left before launch. Each step links to the details.
Everything in code is done on the `accounts` branch. Every step below needs a person
with the company's logins.

Publisher: **Underdog Labs S.R.L.** Contact: **guitar.rot@proton.me**. Firebase project:
**`guitarrot-a27b5`** (owner guitar.rot@proton.me).

## Done (2026-11-03)

- **Firebase:**
  - project with Google Analytics;
  - web, Android and iOS apps;
  - debug and upload SHA fingerprints;
  - Firestore `eur3` with rules and indexes deployed;
  - Email/Password and Google sign-in;
  - authorized domain `guitar-rot.vercel.app`.
- **Google Analytics:** 14-month retention, Google signals off, Data Processing Amendment accepted.
- **Code:**
  - iOS app;
  - name filter, Report and Hide;
  - terms of use;
  - GDPR privacy policy and records ([`GDPR.md`](GDPR.md));
  - Apple token revocation on delete.

## 1. Accounts and money (once)

- [ ] **Firebase > Upgrade to Blaze**, with the company card. Then Google Cloud > Billing > Budgets: alerts at $10, $50 and $100. Spark stops working at 50k reads a day; see "Running costs" in the README.
- [ ] Do **not** upgrade Authentication to Identity Platform.
- [ ] **Second owner** on the Firebase project (Project settings > Users and permissions).
- [ ] **2-step verification** on guitar.rot@proton.me, both in Proton and in its Google account.
- [ ] **Vercel:** Pro plan (Hobby is non-commercial only), or move the site to Cloudflare Pages.
- [ ] **Lawyer or accountant:** one read of `public/privacy.html` and `public/terms.html`.

## 2. Apple sign-in (needed for the iPhone app)

- [ ] Apple Developer (Underdog Labs team):
  - App ID `com.guitarrot.app` with **Sign in with Apple**;
  - a Services ID `com.guitarrot.app.web` (web and Android);
  - a **key** (`.p8`) with Sign in with Apple.

  See [`ACCOUNTS.md` > Apple sign-in](ACCOUNTS.md#apple-sign-in-optional), steps 1 to 6.
- [ ] Firebase > Authentication > Sign-in method > **Apple**: Services ID, Team ID, Key ID, paste the `.p8`. This is also what makes **token revocation on account deletion** work.
- [ ] Ask Claude to set `VITE_AUTH_APPLE=1` for web and Android, and to refresh `GoogleService-Info.plist`.

## 3. Website (Vercel)

- [ ] Vercel > Settings > Environment Variables (Production): the six `VITE_FIREBASE_*` values from `.env.local`, plus `VITE_AUTH_APPLE=1` once step 2 is done.
- [ ] Merge `accounts` into `master`. Claude can do this when asked. Vercel deploys it.
- [ ] Check it (see [`ACCOUNTS.md` §7](ACCOUNTS.md)):
  - the consent question;
  - no analytics requests before "Share usage";
  - create an account, sign out, sign in with Google;
  - the leaderboard;
  - delete the account.

## 4. Google Play

- [ ] Play Console (Underdog Labs account) > **Create app** `guitarRot: Learn Guitar`. Paste the listing from [`store/listing.md`](../store/listing.md); contact guitar.rot@proton.me.
- [ ] Bump the version, build the AAB (`scripts/release-android.sh`) and upload it to **Internal testing**.
- [ ] Test and release > App signing: copy the **app signing key** SHA-1 and SHA-256. Claude adds them to Firebase and commits a fresh `google-services.json`. Without them, Google sign-in fails in the Play build.
- [ ] App content:
  - **Data safety** from [`ACCOUNTS.md` > Data safety answers](ACCOUNTS.md#play-console-data-safety-answers);
  - **Account deletion URL** `https://guitar-rot.vercel.app/privacy.html#delete-your-data`;
  - **Privacy policy** URL;
  - **Advertising ID: No**;
  - **Content rating** with "Users interact: Yes" ([`store/listing.md`](../store/listing.md));
  - **Target audience** 13 and over.
- [ ] Test on a phone from the internal track, then promote to Production.

## 5. App Store

Everything is in [`IOS.md` > Manual steps](IOS.md#manual-steps-only-a-person-can-do):

- [ ] Xcode signing with the Underdog Labs team.
- [ ] App Store Connect app record, SKU `guitarrot-ios`.
- [ ] Privacy labels, age rating, export compliance.
- [ ] Screenshots at 6.9" and 6.5".
- [ ] Archive, upload, then TestFlight on a real iPhone with the [phone checklist](IOS.md#phone-checklist): sound with the ringer off, tuner, Google and Apple sign-in, and **delete an Apple account, then check that Settings > your name > Sign in with Apple no longer lists guitarRot**.
- [ ] Submit for review. App Review notes: an account is optional; Apple and Google sign-in are offered; Delete account is in Settings > Account; the microphone is used only for pitch, on the device.

## 6. After launch

- [ ] Answer reports within 24 to 48 hours ([`ACCOUNTS.md` > Moderation](ACCOUNTS.md)) and data requests within a month ([`GDPR.md`](GDPR.md)).
- [ ] Watch the budget alerts and Firestore usage for the first weeks.
- [ ] The paywall, when it comes, needs:
  - new terms ("free" is written in them);
  - a privacy update (payments);
  - store forms (in-app purchases);
  - a fresh look at [`GDPR.md`](GDPR.md).
