# Real guitar sound, solfège, and a course that teaches you to play

Date: 2026-10-18. Planned on Opus; implemented by Sonnet subagents; reviewed on Opus.

## Why

Ioan's request, verbatim intent: (1) show Do Re Mi Fa Sol La Si next to every
note name, in brackets; (2) more content; (3) make it sound like a real guitar,
"not an electronic piano"; (4) using the app must actually teach you to play.

Read `docs/FUTURE_WORK.md` first. The "electric piano" complaint has come up
before — the last fix swapped Karplus-Strong for FluidR3 soundfont samples and
it still reads as a keyboard. This round fixes both halves: the recordings
(already done, commit `bcbc641`) and the *playback behaviour* (Task 2).

## Ground rules for every task

- Content is original or public domain, never third-party tabs. Every riff or
  song carries `source`; public-domain items carry `attribution`.
- Solfège is **fixed-do**, the Romanian/Italian/French system: C=Do, D=Re,
  E=Mi, F=Fa, G=Sol, A=La, B=Si. Sharps `Do#`, flats `Sib` (the `b` suffix, same
  as the letter names already use). Display format is `C (Do)`, `F# (Fa#)`,
  `Bb (Sib)`.
- A wrong music-theory constant fails no test and teaches a wrong note. Derive
  facts from the theory core (`src/music`) wherever possible instead of typing
  them by hand, and add a test that pins anything hand-typed.
- Match the surrounding code: strict TypeScript, comments that explain *why*,
  Tailwind classes in the existing palette (`bg-surface`, `text-ink-dim`,
  `text-accent`, `bg-ground`, …), `tapHaptic()` on taps.
- Verification before commit: `npx vitest run`, `npx tsc -b --noEmit`,
  `npx vite build`. All green.
- Commit with a conventional-commit message ending in
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Task 1 — Solfège next to every note name

**Files:** `src/music/notes.ts`, `src/music/chords.ts` (append only — Task 2
also edits this file near the top), `src/learn/Learn.tsx` (captions only),
`src/feed/ChordCard.tsx` (tone line only), `src/quiz/AnswerGrid.tsx`,
`src/quiz/explainAnswer.ts`, `src/render/Fretboard.tsx` (aria-label only),
`src/songs/*` (key subtitle), plus their tests.

1. `notes.ts`: add
   - `SOLFEGE_SHARP_NAMES = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si']`
   - `SOLFEGE_FLAT_NAMES = ['Do','Reb','Re','Mib','Mi','Fa','Solb','Sol','Lab','La','Sib','Si']`
   - `solfegeName(pc, { preferFlat? })`
   - `withSolfege(spelling: string): string` — takes a letter spelling as the
     app already prints it (`'C'`, `'F#'`, `'Bb'`, `'E2'`) and returns
     `'C (Do)'`, `'F# (Fa#)'`, `'Bb (Sib)'`, `'E2 (Mi)'`. A flat spelling gets
     the flat solfège. Throws on an unparseable spelling (reuse
     `parseNoteName`'s pattern; don't write a second parser).
   - `noteLabel(midi, opts)` = `withSolfege(noteName(midi, opts))`.
   - Tests: all 12 pitch classes both ways; octave passthrough; flats.
2. `chords.ts` (append at the end of the file): `chordSolfegeName(shape)` →
   `'La minor'`, `'Sol major'`, `'Mi dominant seventh'`, `'Sib major'` (flat
   solfège when the chord's display name contains `b`).
3. Display sites — every place a note name reaches the screen:
   - Learn explorer caption → `G (Sol)`.
   - Learn chord caption and `ChordCard` tone line →
     `Am — La minor — A (La) · C (Do) · E (Mi)`.
   - Quiz answer buttons for **note** questions show `withSolfege(option)`.
     Answer comparison must keep using the plain letter name — format at
     render only. Chord-question options stay chord names.
   - `explainAnswer` sentences use `withSolfege` for every note it names.
   - Fretboard per-fret `aria-label` → `G2 (Sol), string 6, fret 3`.
   - Songs list/player key subtitle: `G` → `G (Sol)`, `Am` → `Am (La minor)`.
   - Fretboard *dots* keep the bare letter — `Sol#` does not fit in a dot.
4. Update the UI tests whose expected text changes.

## Task 2 — Make it play like a real guitar

**Files:** `src/audio/SampledGuitar.ts` (rewrite), `src/audio/engine.ts`,
`src/audio/types.ts`, `src/audio/tones.ts`, `src/audio/timing.ts`,
`src/audio/riffPlayer.ts`, `src/music/chords.ts` (add one export right after
`chordVoicing`), `src/content/songs.ts`, the four `engine.strum(...)` callers
(`Learn.tsx`, `ChordCard.tsx`, `QuizVisual.tsx`, `SettingsSheet.tsx`: one-line
change each), tests, `docs/FUTURE_WORK.md` (Guitar tones section).

Recordings are already replaced (`public/audio/guitar/{acoustic,nylon,electric}`,
see its README/LICENSE). What still makes it sound like a keyboard:

- **No string choke.** On a guitar each string is monophonic: re-picking a
  string stops what it was ringing; other strings keep ringing. Today every
  strum stacks six fresh voices on top of the previous six → a sustained pad.
- **Keyboard gating.** `triggerAttackRelease(note, 1.4)` + `release: 0.6`
  gives every note the same hold-then-fade envelope, like a key let go.
  `Tone.Sampler` also can't be used to fix this: `triggerAttackRelease` calls
  `triggerRelease` immediately, which drops the voice from the sampler's own
  tracking, and `triggerRelease(note)` stops *every* voice of that pitch.
- **Synthetic pick noise.** `SampledGuitar` adds a white-noise burst per note
  to fake a pick. The new recordings have real pick attacks; the burst now
  only adds hiss.
- **Body boom.** The Acoustic profile's +7 dB peak at 110 Hz was tuned for the
  synth; real recordings already carry their body.
- **Techniques are silent.** `palmMute`, `hammer`, `pull`, `slide`, `bend`
  are drawn in tab but never reach the audio.
- **Strums are robotic**: always low→high, identical spacing, identical level.

Do this:

1. **Rewrite `SampledGuitar`** around `Tone.ToneAudioBuffers` (load the set
   once, `await` it) and one `Tone.ToneBufferSource` per note — no
   `Tone.Sampler`. For each note: pick the nearest recorded sample, set
   `playbackRate = 2 ** ((midi - sampleMidi) / 12)`, start at `time` with the
   velocity as gain, `fadeOut` ≈ 0.08 s.
   - **Per-string monophony:** keep `ringing[stringIndex] = { source, end }`
     (`end` = when it stops on its own: `time + duration` if a duration was
     given, else `time + buffer.duration / rate`). A new note on the same
     string calls `prev.source.stop(time)` **only if `prev.end > time`** —
     `OneShotSource.stop` cancels any earlier scheduled stop, so stopping a
     note that already ended would *extend* it. Notes with no `stringIndex`
     go to a seventh "loose" slot that never chokes.
   - **Duration:** given → `source.stop(time + duration)`. Not given → let the
     recording decay naturally (that's what a plucked string does).
   - **Techniques** (new optional `technique` on `PlayNoteOptions`):
     `hammer`/`pull` → velocity × 0.6 (no pick); `palmMute` → velocity × 0.8
     and duration capped at 0.12 s; `slide` → `playbackRate` starts two
     semitones low and ramps to target over 0.07 s; `bend` → starts at the
     fretted pitch and ramps up a whole step (+2 semitones) over
     `min(0.18, 0.3 × duration)` starting 0.03 s in. (Tab convention here:
     a `bend` event's fret is where you fret; the note is bent up a whole
     step from there.)
   - Small humanising only: velocity × (0.9–1.1). No random detune.
   - `stopAll()` stops everything still ringing now; `dispose()` disposes the
     sources, the output node and the buffers. Dispose each source after it
     ends so nodes don't leak over a long session.
   - Delete the noise-burst pick code and `setProfile` from `SampledGuitar`,
     and the engine's calls to it.
2. **`timing.ts` / `riffPlayer.ts`:** carry `technique` from `TabEvent` into
   `ScheduledNote` and pass it to `engine.playNote`.
3. **Strums with real strings:** add `chordStrings(shape): number[]` to
   `music/chords.ts` (sounding string indices, low→high; move the private
   `soundingStrings` out of `songs.ts` to become this). `StrumOptions` gains
   `strings?: number[]` (one per midi). `GuitarAudioEngine.strum` passes each
   note's string so strums choke the previous strum. The four callers pass
   `strings: chordStrings(chord)`. Humanise: per-string offset jitter of
   0–4 ms, and a gentle level taper (first string hit 1.0 → last 0.85).
4. **Up-strums in charts (`songs.ts`):** hits that fall off the beat (a
   fractional beat) are up-strokes: reverse string order and hit only the
   top four sounding strings. Fix the `folk` pattern to the standard
   "D – D U – U D U": beats `[0, 1, 1.5, 2.5, 3, 3.5]`.
5. **Body EQ only for the synth:** `engine.ts` applies `bodyGainDb` only when
   the live voice is `SynthGuitar`; 0 dB for samples (including on tone
   switch and on the synth fallback path).
6. **Nylon tone:** add a `classical` profile ("Classical" — "Nylon strings
   and fingertips. Warm, round, soft attack.") with `sampleSet: 'nylon'`;
   extend the `sampleSet` union. Synth half: like acoustic but darker.
   Amp half: no drive, `filterHz` ~5000, `reverbWet` ~0.18, `gain` 0.6.
7. Tests: nearest-sample/rate selection, choke-only-if-still-ringing,
   technique → velocity/duration mapping, up-strum string order, folk beats,
   strum strings passed through. Keep the pure parts pure (export small
   functions like `nearestSample` / `noteShape`) so they test without
   Web Audio.
8. **Check it in a real browser:** `npx vite build && npx vite preview`, open
   it, tap to start, confirm Settings shows `Engine: sampled` and the console
   is clean, tap chords and explorer frets, play a song. Report what you saw.
9. Update `docs/FUTURE_WORK.md` → Guitar tones / Sampled audio with what
   changed and why (short).

## Task 3 — Hear the player: pitch detection and a tuner

**Files (all new except two):** `src/audio/pitch.ts` + test,
`src/app/useMicPitch.ts`, `src/learn/Tuner.tsx` + test,
`src/audio/index.ts` (export), `android/app/src/main/AndroidManifest.xml`.
Do **not** edit `Learn.tsx` — Task 4 places the tuner.

1. `pitch.ts` — pure, no Web Audio:
   - `detectPitch(samples: Float32Array, sampleRate: number): { hz: number; clarity: number } | null`
     — YIN (difference function → cumulative-mean-normalised difference →
     first dip under ~0.12 → parabolic interpolation), searching 70–1100 Hz.
     Return `null` below an RMS gate (~0.01) or when no dip clears the
     threshold. `clarity = 1 − d'(τ)`.
   - `nearestNote(hz): { midi: number; cents: number }`.
   - Tests with synthetic buffers (4096 samples @ 44.1 kHz): sines at every
     open string (82.41, 110, 146.83, 196, 246.94, 329.63 Hz) and a
     harmonic-rich pluck (six decaying partials, strong 2nd harmonic) at E2
     and G3 → within ±3 cents and the right octave; silence and white noise
     → `null`.
2. `useMicPitch()` hook: `{ status: 'idle'|'starting'|'listening'|'denied'|'unsupported', reading: { hz, midi, cents } | null, start(), stop() }`.
   Use `Tone.UserMedia` → `Tone.Analyser('waveform', 4096)`; **never connect
   the mic to the destination** (feedback). Poll ~20×/s, take the median of
   the last 3 readings to stop the display jittering. `start()` must be
   called from a tap. Stop and close the mic on unmount. `unsupported` when
   `navigator.mediaDevices?.getUserMedia` is missing; `denied` on rejection.
3. `Tuner.tsx`: big detected note with solfège (`E (Mi)`), which standard
   string it's closest to, a cents meter −50…+50 with a centre zone; "In tune"
   once |cents| < 5 has held ~0.4 s; hint text "tighten (too low)" / "loosen
   (too high)". Six "hear it" buttons (E A D G B E with solfège) play each open
   string through the engine — tuning by ear works without a mic. A
   "Start tuner" button starts the mic; show a friendly message for
   `denied`/`unsupported`. Props: `{ engine: AudioEngine }`.
4. Android: add `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` permissions.
   Capacitor's `BridgeWebChromeClient` already turns the WebView's
   permission request into the runtime prompt.

## Task 4 — Lessons: types, progress, and the Course UI

**Depends on Tasks 1 and 3.**
**Files:** `src/content/lessons.ts` (types + validator + registry, empty or
with one sample lesson), `src/progress/types.ts`, `src/app/useProgress.ts`,
`src/learn/Learn.tsx`, new `src/learn/Course.tsx`, `src/learn/LessonView.tsx`,
`src/learn/steps/*` (one small component per step kind), tests.

```ts
type LessonStep =
  | { kind: 'text'; title?: string; body: readonly string[] }   // plain-text paragraphs
  | { kind: 'fretboard'; caption: string; fretRange: [number, number];
      positions: readonly FretPosition[]; tapToHear?: boolean }  // dots labelled with notes; caption lists them with solfège
  | { kind: 'chord'; chordId: string; caption?: string }        // diagram, strum button, tones with solfège
  | { kind: 'riff'; riffId: string; caption?: string }          // tab + play/stop + speed + metronome toggle
  | { kind: 'song'; songId: string; caption?: string }          // same player, from songToRiff(song)
  | { kind: 'listen'; caption: string; targets: readonly FretPosition[] } // play each target on your guitar; mic checks it
  | { kind: 'tuner' }
  | { kind: 'drill'; strings: readonly number[]; fretRange: [number, number]; count: number } // note-ID questions via noteQuestionAt
  | { kind: 'check'; question: string; options: readonly string[]; answer: string; explain: string };

type Lesson = { id: string; unit: string; title: string; goal: string; steps: readonly LessonStep[] };
```

- `validateLesson(lesson)` → string[]: non-blank ids/titles/text; chord, riff
  and song ids resolve (`CHORDS`, `findRiff(id)` over `RIFFS` and `DRILLS`,
  `SONGS`); `check.answer` ∈ options, options unique, ≥ 2; positions and
  targets are real strings/frets inside `fretRange`; drill strings valid,
  `count` ≥ 3. Every lesson ends with at least one `check`, `drill` or
  `listen` step — every lesson tests something. Test: all lessons validate,
  ids unique.
- Progress: `ProgressState.lessonsDone: string[]` (default `[]`, `migrate`
  keeps only strings; no version bump — a missing field just defaults).
  `useProgress` gains `completeLesson(id)`.
- **Learn tab** becomes a segmented control at the top:
  **Course** (default) · **Tuner** · **Explore** (today's explorer, chord
  library and scale section, unchanged).
- **Course:** "N of M lessons" progress; a big **Continue** card for the first
  not-done lesson; lessons grouped by unit, each row ✓ done / ● next. Every
  lesson is open — highlight, never lock.
- **LessonView:** full-screen inside the Learn pane. Top: close (×) and a
  step progress bar. One step per screen with a **Next** button.
  - `check`: tap an option; wrong → red, show `explain`, let them try again;
    Next enables only once right.
  - `drill`: `count` note questions in a row, same answer UI as the Quiz tab
    (reuse `AnswerGrid`/`QuizVisual`), with solfège.
  - `listen`: one target at a time — fretboard marker + "Play G (Sol): string
    6, fret 3"; a "Hear it" button; mic on → when the detected midi equals the
    target (or ±12, to forgive octave errors from the detector) for ~0.25 s,
    tick it and move on. A **Skip** is always available (no mic, noisy room).
  - `tuner`: embeds `Tuner`, with Next always enabled.
  - `riff`/`song`: compact player reusing `createRiffPlayer`, `TabStaff`,
    `createMetronome` the way `SongPlayer` does. Only one player alive at a
    time; stop on leaving the step.
  - End screen: "Lesson complete" → `completeLesson(id)` and **Next lesson**.
- Tests: Course shows progress and Continue; finishing a lesson marks it
  done; a wrong check answer blocks Next until corrected; listen can be
  skipped; migrate keeps/defaults `lessonsDone`.

## Task 5 — More chords, public-domain melodies, drills, feed riffs

**Files:** `src/content/chords.ts`, new `src/content/melody.ts` (helpers),
new `src/content/drills.ts`, `src/content/songCatalog.ts` (append songs),
`src/content/riffs.ts` (append riffs), `src/content/index.ts`, tests.
Do not edit `src/content/songs.ts` (Task 2 does).

1. **Chords** — add these 18 (each must pass `validateChordShape`):
   A7 `x02020`, B7 `x21202`, D7 `xx0212`, E7 `020100`, G7 `320001`,
   Am7 `x02010`, Em7 `020000`, Dm7 `xx0211`, Cmaj7 `x32000`, Fmaj7 `xx3210`,
   Asus2 `x02200`, Asus4 `x02230`, Dsus2 `xx0230`, Dsus4 `xx0233`,
   Bm `x24432` (barre fret 2, strings 5→1), F#m `244222` (barre fret 2, all),
   E5 `022xxx`, A5 `x022xx`, D5 `xx023x`, G5 `355xxx` (baseFret 3).
   Standard fingerings. (No C7: the common `x32310` omits the fifth, which
   the validator rightly rejects.)
2. **`melody.ts`:** `melodyEvents(notes: string, opts?: { onString?: number })`
   parsing `'E4:1 E4:1 F4:1 G4:1 | G4:1 …'` (`|` = bar line, ignored except
   for readability; `r:1` = rest) into `TabEvent`s. Fret choice: the
   lowest-fret position from `findPositions(STANDARD_TUNING, midi, [0, 12])`
   (which is first position: open strings first), or the given string when
   `onString` is set (throw if unreachable there). Tests.
3. **Public-domain melody songs** (append to `SONGS` as riff songs, easy,
   `source: 'public-domain'`, attribution, `about` naming the solfège of the
   opening). All in C major, first position, 4/4:
   - `ode-to-joy` — Beethoven, Symphony No. 9 (1824). 100 bpm:
     `E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | E4:1.5 D4:0.5 D4:2 | E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | D4:1.5 C4:0.5 C4:2 | D4:1 D4:1 E4:1 C4:1 | D4:1 E4:0.5 F4:0.5 E4:1 C4:1 | D4:1 E4:0.5 F4:0.5 E4:1 D4:1 | C4:1 D4:1 G3:2 | E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | D4:1.5 C4:0.5 C4:2`
   - `twinkle-twinkle` — traditional French melody ("Ah! vous dirai-je,
     maman", 1761). 100 bpm:
     `C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2`
   - `frere-jacques` — traditional French round. 100 bpm:
     `C4:1 D4:1 E4:1 C4:1 | C4:1 D4:1 E4:1 C4:1 | E4:1 F4:1 G4:2 | E4:1 F4:1 G4:2 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | C4:1 G3:1 C4:2 | C4:1 G3:1 C4:2`
   - `mary-had-a-little-lamb` — traditional American (1830s). 100 bpm:
     `E4:1 D4:1 C4:1 D4:1 | E4:1 E4:1 E4:2 | D4:1 D4:1 D4:2 | E4:1 G4:1 G4:2 | E4:1 D4:1 C4:1 D4:1 | E4:1 E4:1 E4:1 E4:1 | D4:1 D4:1 E4:1 D4:1 | C4:4`
   - `jingle-bells` — James Lord Pierpont (1857), chorus. 110 bpm:
     `E4:1 E4:1 E4:2 | E4:1 E4:1 E4:2 | E4:1 G4:1 C4:1.5 D4:0.5 | E4:4 | F4:1 F4:1 F4:1.5 F4:0.5 | F4:1 E4:1 E4:1 E4:0.5 E4:0.5 | E4:1 D4:1 D4:1 E4:1 | D4:2 G4:2 | E4:1 E4:1 E4:2 | E4:1 E4:1 E4:2 | E4:1 G4:1 C4:1.5 D4:0.5 | E4:4 | F4:1 F4:1 F4:1.5 F4:0.5 | F4:1 E4:1 E4:1 E4:0.5 E4:0.5 | G4:1 G4:1 F4:1 D4:1 | C4:4`
   - `au-clair-de-la-lune` — traditional French. 90 bpm:
     `C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4 | C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4 | D4:1 D4:1 D4:1 D4:1 | A3:2 A3:2 | D4:1 C4:1 B3:1 A3:1 | G3:4 | C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4`
   Add a test per melody that spells its pitch sequence back with
   `noteName` and compares it to the expected letters — so a fret typo
   can't silently change a tune.
4. **`drills.ts`** — `DRILLS: readonly Riff[]` (original, lesson practice
   material; not in the Feed) and `findRiff(id)` over `RIFFS` + `DRILLS`:
   - `open-strings-walk` (70 bpm): open strings 6→1 then 1→6, quarters.
   - `mi-fa-sol` (70): `E4:1 F4:1 G4:1 F4:1 | E4:1 F4:1 G4:2 | G4:1 F4:1 E4:1 F4:1 | E4:4`.
   - `low-e-landmarks` (70, `onString: 0`): `E2:1 G2:1 A2:1 B2:1 | C3:1 D3:1 E3:2 | E3:1 D3:1 C3:1 B2:1 | A2:1 G2:1 E2:2`.
   - `a-string-landmarks` (70, `onString: 1`): `A2:1 B2:1 C3:1 D3:1 | E3:1 F3:1 G3:1 A3:1 | A3:1 G3:1 F3:1 E3:1 | D3:1 C3:1 B2:1 A2:1`.
   - `octave-hop` (70): explicit events — G (s0 f3 → s2 f5), C (s1 f3 → s3 f5),
     A (s0 f5 → s2 f7), D (s1 f5 → s3 f7), half notes.
   - `c-major-scale` (80): `C3:1 D3:1 E3:1 F3:1 | G3:1 A3:1 B3:1 C4:1 | C4:1 B3:1 A3:1 G3:1 | F3:1 E3:1 D3:1 C3:1`.
   - `rhythm-ladder` (70, open G): `G3:4 | G3:2 G3:2 | G3:1 G3:1 G3:1 G3:1 | G3:0.5 ×8`.
   - `legato-drill` (70): original hammer-on/pull-off exercise on the G and B
     strings (0→2 h, 2→0 p, 0→3 h …), using `technique`.
   - Chord-change drills built by passing an in-memory `Song` with a `chart`
     through `songToRiff` (don't touch `songs.ts`): `em-four-downs` (downs,
     `Em Em Em Em`, 70), `em-am-change` (downs, `Em Em Am Am Em Em Am Am`, 70),
     `d-a-change` (downs, `D D A A D D A A`, 70), `g-c-change` (downs,
     `G G C C G G C C`, 70), `g-c-d-quarters` (downs, `G C D G`, 80),
     `folk-pattern-g-c` (folk, `G G C C D D G G`, 80).
   All must pass `validateRiff`.
5. **Feed riffs:** append ~8 new *original* riffs to `RIFFS` across styles
   not yet covered (reggae off-beat, surf tremolo, Travis-style fingerpicking
   in C, Am–G–F arpeggios, A minor blues lick, country hybrid-picking in G,
   drop-free metal chug in E, funk single-note line). Musical, idiomatic,
   levels 1–4, validated.

## Task 6 — The course: 28 lessons from zero

**Depends on Tasks 4 and 5.** Written in `src/content/lessons.ts` (or
`src/content/course/*.ts` if it gets long). Voice: short, direct, warm,
concrete; ≤ 3 short paragraphs per text step; always pair a note name with
its solfège. Every lesson: what you'll learn (`goal`), explain, show/hear,
**you play it** (riff/song/listen), then check.

Unit 1 — **Start here**
1. `strings` Six strings, six names — E A D G B E = Mi La Re Sol Si Mi, low
   (thick, string 6) to high (thin, string 1); "Eddie Ate Dynamite, Good Bye
   Eddie". Fretboard of the six open strings (tapToHear). Checks.
2. `tuning` Tune your guitar — why; tighten raises pitch; come *up* to the
   note. `tuner` step. The 5th-fret method (fret 5 matches the next open
   string, except fret **4** on the G string to get B). Fretboard of those
   positions. Check.
3. `tab` Read tab in two minutes — top line = thinnest string; numbers =
   frets; 0 = open; read left to right; stacked = together. `riff`
   `open-strings-walk`. Checks.
4. `first-notes` Your first fretted notes — fingertip just behind the fret,
   thumb behind the neck, one finger per fret. High E: E F G (Mi Fa Sol) at
   0 1 3. `riff` `mi-fa-sol`; `listen` those three. Check.

Unit 2 — **Notes and the musical alphabet**
5. `alphabet` A B C D E F G = La Si Do Re Mi Fa Sol, then it repeats. One
   fret = half step; most neighbours are two frets apart; **E–F (Mi–Fa) and
   B–C (Si–Do) are one fret apart**. Fretboard: naturals on the A string
   0–12. Checks.
6. `sharps-flats` # one fret up, b one fret down; C# = Db (Do# = Reb).
   Fretboard: every note on the low E 0–12. Checks.
7. `low-e-notes` Landmarks 0 E, 3 G, 5 A, 7 B, 8 C, 10 D, 12 E. `riff`
   `low-e-landmarks`; `listen` G, A, C on string 6; `drill` string 0, 0–12.
8. `a-string-notes` Landmarks 0 A, 2 B, 3 C, 5 D, 7 E, 8 F, 10 G, 12 A.
   `riff` `a-string-landmarks`; `drill` string 1.
9. `octaves` 12 frets = octave; shape: two strings up, two frets up (from
   strings 6 and 5). `riff` `octave-hop`. Check.

Unit 3 — **First chords and rhythm**
10. `em-chord` Em (Mi minor) = E G B, two fingers. `chord` Em; `riff`
    `em-four-downs`. Checks.
11. `am-em` Am = A C E; start the strum on string 5; move the shape as one.
    `chord` Am; `riff` `em-am-change`.
12. `d-and-a` D = D F# A (strum 4 strings), A = A C# E. `riff` `d-a-change`.
13. `g-and-c` G = G B D, C = C E G. `riff` `g-c-change`.
14. `counting` Beats, bars, 4/4, bpm, metronome; quarters = one strum a beat.
    `riff` `g-c-d-quarters`. Checks.
15. `down-up` "1 & 2 & 3 & 4 &": down on numbers, up on "&", hand never stops.
    The folk pattern D – D U – U D U. `riff` `folk-pattern-g-c`.
16. `first-song` Pick a two- or three-chord song from `SONGS` that uses
    only chords taught so far (check the catalogue) — `song` step. Check.

Unit 4 — **Melody: Do Re Mi**
17. `major-scale` W W H W W W H; C major = Do Re Mi Fa Sol La Si Do, no
    sharps or flats; the half steps are Mi–Fa and Si–Do. Fretboard: first
    position C major (A3, D0 2 3, G0 2, B0 1). `riff` `c-major-scale`;
    `listen` Do Re Mi. Checks.
18. `ode-to-joy` Solfège first: Mi Mi Fa Sol | Sol Fa Mi Re | Do Do Re Mi |
    Mi Re Re. `song` `ode-to-joy`; `listen` its first four notes. Check.
19. `twinkle-and-jacques` Do Do Sol Sol La La Sol. `song` `twinkle-twinkle`,
    `song` `frere-jacques`. Check.
20. `note-lengths` Whole 4, half 2, quarter 1, eighth ½, dotted = +half.
    `riff` `rhythm-ladder`. Checks.

Unit 5 — **Rock, blues, and why chords fit**
21. `power-chords` Root + fifth, no third → neither major nor minor, great
    with drive; movable; named by the root on string 6 or 5. `chord` E5, G5;
    existing `power-chord-drive` riff. Checks (e.g. root on string 6 fret 5 → A5).
22. `keys-1-4-5` A key = home note + its scale; the I, IV and V chords are
    the major chords of a major key: G → G C D (Sol Do Re), C → C F G,
    D → D G A, A → A D E; vi is the relative minor (G → Em). Checks. A
    `song` using G C D.
23. `pentatonic` E minor pentatonic = E G A B D (Mi Sol La Si Re); box 1.
    Fretboard of box 1 (frets 0–3); existing `em-pentatonic-box1` riff.
    Checks.
24. `twelve-bar` 12-bar blues: I I I I | IV IV I I | V IV I V. In E: E E E E
    A A E E B A E B. Existing `blues-shuffle-e` riff. Checks.

Unit 6 — **Level up**
25. `hammer-pull` What they are and why (speed, smoothness). `riff`
    `legato-drill`. Check.
26. `slides-bends` Slide = keep pressure and glide; bend = push the string
    to raise pitch a whole step (match the note two frets up). Existing riff
    with bends. Check.
27. `f-barre` F: index across fret 1, roll it slightly, thumb low; check each
    string; Fmaj7 as the stepping stone. `chord` Fmaj7, `chord` F. Check.
28. `practice-plan` 15 minutes a day beats two hours on Sunday; slow and
    clean with a metronome, +5 bpm when it's easy; loop the hard bar; warm
    up chromatically. `riff` `chromatic-warmup`. Check.

## Execution order

Wave 1 in parallel: Task 1 (main checkout), Tasks 2, 3, 5 (own worktrees).
Merge. Wave 2: Task 4. Wave 3: Task 6. Opus review after each task; final
whole-branch review and a browser pass on the built app.
