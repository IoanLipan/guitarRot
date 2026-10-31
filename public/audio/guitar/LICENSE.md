# Sample licence and attribution

The `.mp3` files in `acoustic/`, `nylon/` and `electric/` come from
[nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
by **Nicholaus Brosowsky**, released under the
[Creative Commons Attribution 3.0 licence](https://creativecommons.org/licenses/by/3.0/).
That collection credits its original recordings as:

- `acoustic/` — steel-string acoustic guitar, **University of Iowa Electronic
  Music Studios** (Musical Instrument Samples)
- `nylon/` — classical guitar, **quartertone** on Freesound
  ("classicalguitar-multisampled")
- `electric/` — clean electric guitar, **Karoryfer Samples**

guitarRot re-encoded them (mono, 112 kbps), trimmed the silence before each
pick, capped each note at six seconds with a fade, and scaled each set to a
common level. The nylon `D5` file was dropped: it measures a semitone sharp
of its label.

CC BY requires that the attribution travels with the work, so it is also
shown in the app: Settings credits "Guitar samples: tonejs-instruments by
Nicholaus Brosowsky (CC BY 3.0) — University of Iowa EMS, quartertone,
Karoryfer". Keep that credit if you change the sound engine but keep these
files.

## ukulele/

The `.mp3` files in `ukulele/` are a different collection under a different
licence, and are not part of tonejs-instruments:

- **Source** — the FreePats *Ukulele* instrument (version 2026-08-11),
  [freepats/ukulele1](https://github.com/freepats/ukulele1) at commit
  `86d345f6f7b79a106ace98eca0da19b087786dba`, listed on
  [freepats.zenvoid.org/GuitarFamily/ukulele.html](https://freepats.zenvoid.org/GuitarFamily/ukulele.html).
- **Recorded by** Mateusz Dąbrowski, from a Flight Fireball tenor ukulele
  (RØDE Podcaster microphone, one room, one session, 96 kHz / 24-bit mono,
  delivered by the author at 48 kHz).
- **Licence** — [Creative Commons CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
  public domain dedication (the repository's `LICENSE.txt` is the CC0 legal
  code). No attribution is required; the app credits the recordist anyway.

The thirteen pitched notes were taken as published, then guitarRot retuned each
one by a few cents (a resampling of at most 0.5%, from the mean of FreePats'
own `tune` offsets and a median f0 measurement), lifted everything above
about 2 kHz by 3 dB (a gentle high shelf; the recording is warmer than a
ukulele usually sounds and the app's filter can only cut), trimmed the
silence before the pick, faded in the first millisecond, levelled each
note's first half second to the average level of the nylon set over the same
range, and re-encoded them (mono, 44.1 kHz, 112 kbps). The natural decay and the 150 ms
tail fade the author applied are untouched. The two percussive samples in the
FreePats set (`body-tap`, `chuck`) are not used.
