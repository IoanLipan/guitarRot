# Guitar samples

The app ships with no samples. `GuitarAudioEngine` probes
`/audio/guitar/manifest.json` on startup: when it is absent or lists nothing,
the engine uses `SynthGuitar`, a Karplus-Strong plucked string that needs no
assets. Pitch is exact either way, so quizzes are correct with or without
samples. Installing samples is purely a sound-quality upgrade and needs no
code change.

## Installing samples

1. Drop mono `.mp3` or `.ogg` files in this directory, one per sampled note,
   named after the note: `E2.mp3`, `G2.mp3`, `A2.mp3`, and so on.
   One sample every three or four semitones from E2 to E5 is plenty; the
   sampler pitch-shifts to fill the gaps.
2. Create `manifest.json` beside them:

   ```json
   {
     "baseUrl": "/audio/guitar/",
     "samples": {
       "E2": "E2.mp3",
       "A2": "A2.mp3",
       "D3": "D3.mp3",
       "G3": "G3.mp3",
       "B3": "B3.mp3",
       "E4": "E4.mp3"
     }
   }
   ```

3. Reload. The dev harness reports which backend is live.

Use samples you have the right to use — your own recordings, or a set
released under CC0 or a similar permissive licence. Keep the licence text
next to the files.
