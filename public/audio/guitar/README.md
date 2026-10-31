# Guitar samples

`GuitarAudioEngine` probes `/audio/guitar/manifest.json` on startup. When it
is absent or lists nothing usable, the engine falls back to `SynthGuitar`, a
Karplus-Strong plucked string that needs no assets. Pitch is exact either
way, so quizzes are correct with or without samples.

## What is installed

Four sets of real recorded notes; the engine pitch-shifts the nearest one
to fill any gap:

- `acoustic/` — steel-string, **every semitone** from D2 to D5, so nothing
  in first position is ever stretched; topped up to A#5 with the four
  highest nylon recordings. Plays the Acoustic tone.
- `nylon/` — classical guitar, B1 to A#5, roughly every two semitones.
- `electric/` — clean electric, every three semitones, C#2 to C6. Plays
  Clean, Rock, Blues and Country, which get their character from the amp
  chain (drive, tone, reverb) rather than from a different recording.
- `ukulele/` — a tenor ukulele, C4 to C6 (every note through fret 15 of a
  standard-tuned ukulele), every one to three semitones.
  Plays the Ukulele tone. Public domain (CC0), unlike the three sets above.

Every file starts within a few milliseconds of the pick — the originals had
30-50ms of silence first, which made every strum and riff land late.

See [`LICENSE.md`](LICENSE.md) for provenance and the required attribution.

## Manifest format

A manifest is either one unnamed set:

```json
{ "baseUrl": "/audio/guitar/", "samples": { "E2": "E2.mp3", "A2": "A2.mp3" } }
```

...or named sets, which is what ships here, so a tone profile can choose its
instrument through its `sampleSet` field:

```json
{
  "baseUrl": "/audio/guitar/",
  "sets": {
    "acoustic": { "E2": "acoustic/E2.mp3" },
    "electric": { "E2": "electric/E2.mp3" }
  }
}
```

Keys that are not parseable note names are dropped, so one typo cannot break
loading. A tone asking for a set that is not there falls back to `default`,
then to whatever set exists, rather than going silent.

## Replacing them

Drop mono `.mp3` or `.ogg` files named after the note (`E2.mp3`, `Bb3.mp3`),
list them in the manifest, and reload — no code change needed. Use samples
you have the right to use, and keep the licence text next to the files.
