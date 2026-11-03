# GDPR: records and procedures

Internal notes for Underdog Labs S.R.L., the controller for guitarRot. The public
side is `public/privacy.html`; this file is what the company keeps for itself:
the record of processing (Art. 30), who the processors are, and what to do when
someone asks for their data or when something goes wrong. Keep it current
whenever the app starts collecting something new.

This is a careful engineering reading of the GDPR, not legal advice. Before launch,
have the privacy policy and the terms read once by the lawyer or accountant who set
up the company.

## The short version

- Everything that leaves the device is optional: an account, the leaderboard,
  usage statistics. With none of them, nothing personal is processed.
- No ads, no tracking across apps or sites, no selling, no profiling, no
  special-category data (the microphone is analysed on the device and never
  recorded or sent).
- No data protection officer is required (no large-scale systematic monitoring,
  no special categories) and no DPIA is required (no high-risk processing).
  Revisit both if the app ever adds social features, ads, or a paywall with
  payment data handled by us.

## Record of processing activities (Art. 30)

Controller: Underdog Labs S.R.L., Bd. Dinicu Golescu, nr. 7, et. Parter, ap. SP.
COM. 3, Sector 1, Bucharest 010861, Romania; CUI 55589141; J2026054454006;
guitar.rot@proton.me.

| Activity | Data | People | Purpose | Legal basis | Where | Kept |
|---|---|---|---|---|---|---|
| Account | email, username, password hash, Google/Apple name and photo link, Apple relay address | people who sign up | sign-in, keep progress across devices | contract, Art. 6(1)(b) | Firebase Auth (US) | until the account is deleted |
| Synced progress | lessons, points, streaks, quiz bests, settings, user id | account holders | sync | contract, 6(1)(b) | Firestore `eur3` (EU) | until the account is deleted |
| Usernames | `usernames/{handle}`, `profiles/{uid}` | account holders | unique public name | contract, 6(1)(b) | Firestore `eur3` | until the account is deleted |
| Leaderboard | display name, points, week points, user id | players who join | public weekly and all-time board | contract, 6(1)(b) (joining is the player's choice) | Firestore `eur3` | until they leave or delete the account |
| Sign-in security logs | IP address, device details | account holders | abuse prevention | legitimate interest, 6(1)(f) | Firebase Auth (US) | a few weeks (Google) |
| Usage statistics | screens, events, coarse level, device and app info, approximate location, random app-instance id | people who said yes | improve the app | consent, 6(1)(a), plus ePrivacy consent for the device id | Google Analytics (may be US) | 14 months (GA retention setting) |
| Name reports | reporter's email, reported name and id | reporters, reported players | keep the board safe | legitimate interest, 6(1)(f) | Proton mailbox (CH) | until handled, at most 6 months |
| Emails and requests | whatever the person writes | anyone who writes | answer them | legitimate interest, 6(1)(f); legal obligation for rights requests, 6(1)(c) | Proton mailbox (CH) | as long as needed, at most 12 months |
| Web server logs | IP address, time, page, user agent | website visitors | run and secure the site | legitimate interest, 6(1)(f) | Vercel | Vercel's log retention |

Technical and organisational measures:
- Firestore rules allow each user only their own documents. Usernames are unique by construction, and leaderboard writes are capped.
- TLS everywhere. Passwords are hashed by Firebase and never readable by us.
- The Firebase project is owned by the company account (guitar.rot@proton.me) with 2-step verification. A second owner is to be added.
- There is no admin backend. Deletion is self-service in the app.

## Processors and their terms

| Processor | For | Terms | Transfer basis |
|---|---|---|---|
| Google (Firebase Authentication, Cloud Firestore) | accounts, sync, leaderboard | Firebase Data Processing and Security Terms, part of the Firebase terms accepted when the project was created | EU-U.S. Data Privacy Framework (Google LLC is certified) + SCCs |
| Google Analytics | usage statistics | Google Ads Data Processing Terms, accepted in GA Admin > Account details (done 2026-11-03) | DPF + SCCs |
| Vercel | website hosting | Vercel DPA (vercel.com/legal/dpa) | DPF + SCCs |
| Proton AG | the company inbox | Proton's DPA (proton.me/legal/dpa) | Switzerland has an EU adequacy decision |

Apple and Google are **independent controllers** for "Sign in with Apple/Google" and
for their app stores, not our processors.

## Settings that the policy depends on

If one of these changes, the policy is wrong:

- Firestore database location **`eur3`** (set at creation, cannot change).
- GA4 data retention **14 months**. Google signals **off**. All data sharing **off**. No Google Ads link.
- Analytics consent defaults: everything denied until the person says yes. Ad storage, ad user data and ad personalisation are always denied (`src/cloud/analyticsBackend.ts`; on Android the manifest; on iOS `Info.plist`).
- `_ga` cookie lifetime **13 months** (`cookie_expires` in `analyticsBackend.ts`).
- Firebase Authentication **not upgraded to Identity Platform** (an upgrade changes pricing, not privacy, but check its terms).

## Requests from people (Art. 12 to 22)

They arrive at guitar.rot@proton.me. Answer **within one month**. You can extend by two more months for complex cases, but tell the person within the first month.

1. **Check it is them.** The request should come from the account's email, or name the username and then be confirmed from the account's email. Don't ask for ID documents.
2. **Find their data.** In the Firebase console:
   - Authentication > Users: search the email, note the **uid**.
   - Firestore: `users/{uid}`, `profiles/{uid}`, the `usernames` doc named in that profile, and `leaderboard/{uid}`.
3. **Act on it:**
   - **Access or portability:** export those documents as JSON, plus the Auth record (email, providers, created and last sign-in dates), and email them.
   - **Deletion:** delete those Firestore docs, then the Auth user. This is the same as the in-app Delete account. Do it **within 30 days**, since the policy promises that.
   - **Correction:** the person can change their username in the app. Otherwise edit the doc.
   - **Objection or restriction:** for security logs there is nothing we can switch off. Explain, or delete the account.
   - **Analytics:** we cannot single out one person's analytics; the policy says so. Point to the switch in Settings.
4. **Reply** saying what was done, and delete the email thread after 12 months at the latest.

## Name reports

See "Moderation" in `docs/ACCOUNTS.md`. Aim to act within 24 to 48 hours, and delete the report email once it is handled (at most 6 months).

## Personal data breaches (Art. 33 and 34)

A breach is any loss of confidentiality, integrity or availability of personal data. Examples:
- a leaked owner login;
- rules deployed open by mistake;
- a processor telling us it was breached.

1. **Contain it.** Revoke sessions, change the owner password, roll back rules (`firebase deploy --only firestore:rules` with the last good file), disable affected users.
2. **Write down** what happened, when it was found, which data and how many people, the likely consequences and what was done. Keep this log even for breaches that need no report.
3. **Within 72 hours of becoming aware,** notify **ANSPDCP** (dataprotection.ro, online breach notification form) unless the breach is unlikely to risk people's rights. Leaked emails or password hashes count as a risk; a short outage does not.
4. If the risk to people is **high**, also tell the affected people without undue delay, in plain words, with what they should do (for example, change a reused password).

## Children

Not directed at under-13s. Romania's age of digital consent is 16, so the consent sheet and the policy ask under-16s to involve a parent before saying yes to usage statistics. The account rests on contract, not consent. Play's target audience is 13 and over. If you ever aim the app at children, the Play Families policy, Apple's Kids category and Art. 8 GDPR all apply, and this file needs redoing.

## Before launch

- [ ] Lawyer or accountant reads `public/privacy.html` and `public/terms.html` once.
- [ ] GA: retention 14 months, Google signals off, data sharing off (`docs/ACCOUNTS.md` §1).
- [ ] GA Data Processing Amendment accepted (done 2026-11-03).
- [ ] Vercel: on a paid plan for commercial use, and its DPA in place (see README, "Running costs").
- [ ] Second owner on the Firebase project; 2-step verification on guitar.rot@proton.me and on its Google account.
- [ ] App Store privacy labels (`docs/IOS.md`) and the Play Data safety form (`docs/ACCOUNTS.md`) match this file.
