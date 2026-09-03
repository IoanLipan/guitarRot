# Guitar samples

`GuitarAudioEngine` probes `/audio/guitar/manifest.json` on startup. When it
is absent or lists nothing usable, the engine falls back to `SynthGuitar`, a
Karplus-Strong plucked string that needs no assets. Pitch is exact either
way, so quizzes are correct with or without samples.

## What is installed

Two sets of real recorded notes, one sample every three semitones from E2 to
E6 (the sampler pitch-shifts to fill the gaps):

- `acoustic/` — plays the Acoustic tone
- `electric/` — plays Clean, Rock, Blues and Country, which get their
  character from the amp chain (drive, tone, reverb, body) rather than from
  a different recording

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
