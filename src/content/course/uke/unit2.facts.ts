import { fact, type LessonFacts } from '../facts';

// String indices: 0 = G (string 4), 1 = C, 2 = E, 3 = A (string 1). A chord's strings read G C E A, left to right.

export const UKE_UNIT_2_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'uke-c-am',
    facts: [
      fact.chordTones('uke-C', ['C', 'E', 'G']),
      fact.chordTones('uke-Am', ['A', 'C', 'E']),
      // The distractor "C# instead of C" is A major.
      fact.chordTones('uke-A', ['A', 'C#', 'E']),
      fact.checkChordTones('Which notes are in C (Do)?', 'uke-C'),
      fact.checkChordTones('Which notes are in Am (La minor)?', 'uke-Am'),
      // C: ring finger on the A string, fret 3, and nothing else; all four strings ring.
      fact.grip('uke-C', 3, 3, 3),
      fact.fingers('uke-C', 1),
      fact.strings('uke-C', [0, 1, 2, 3]),
      fact.note(3, 3, 'C'),
      // Am: middle finger on the G string, fret 2, and nothing else.
      fact.grip('uke-Am', 0, 2, 2),
      fact.fingers('uke-Am', 1),
      fact.strings('uke-Am', [0, 1, 2, 3]),
      fact.note(0, 2, 'A'),
      // "Lower the E to Eb": a flat is one semitone down, so Eb is one below E.
      fact.semitones('Eb', 'E', 1),
    ],
  },
  {
    lesson: 'uke-f-chord',
    facts: [
      fact.chordTones('uke-F', ['F', 'A', 'C']),
      fact.checkChordTones('Which notes are in F (Fa)?', 'uke-F'),
      // Index on the E string fret 1, middle on the G string fret 2; the C and A strings ring open.
      fact.grip('uke-F', 2, 1, 1),
      fact.grip('uke-F', 0, 2, 2),
      fact.fingers('uke-F', 2),
      fact.strings('uke-F', [0, 1, 2, 3]),
      fact.note(2, 1, 'F'),
      fact.note(0, 2, 'A'),
      // Am to F: the middle finger stays on the G string, fret 2; the index finger joins on the E string.
      fact.grip('uke-Am', 0, 2, 2),
      // C to F: the ring finger leaves the A string; the index and middle land.
      fact.grip('uke-C', 3, 3, 3),
    ],
  },
  {
    lesson: 'uke-g-chord',
    facts: [
      fact.chordTones('uke-G', ['G', 'B', 'D']),
      fact.chordTones('uke-G7', ['G', 'B', 'D', 'F']),
      fact.checkChordTones('Which notes are in G (Sol)?', 'uke-G'),
      fact.checkChordTones('Which notes are in G7', 'uke-G7'),
      // G: index on the C string fret 2, middle on the A string fret 2, ring on the E string fret 3.
      fact.grip('uke-G', 1, 2, 1),
      fact.grip('uke-G', 3, 2, 2),
      fact.grip('uke-G', 2, 3, 3),
      fact.fingers('uke-G', 3),
      fact.strings('uke-G', [0, 1, 2, 3]),
      // G7: index on the E string fret 1, middle on the C string fret 2, ring on the A string fret 2.
      fact.grip('uke-G7', 2, 1, 1),
      fact.grip('uke-G7', 1, 2, 2),
      fact.grip('uke-G7', 3, 2, 3),
      fact.fingers('uke-G7', 3),
      // "one note dropped to F": the E string's fret 3 (G) becomes fret 1 (F), a whole step.
      fact.note(2, 3, 'G'),
      fact.note(2, 1, 'F'),
      fact.semitones('F', 'G', 2),
    ],
  },
  {
    lesson: 'uke-island-strum',
    facts: [
      // Six strokes in the island (folk) strum: three down on the beats, three up in between.
      fact.strum(3, 3),
      // Down on 1 and 2, up on the "&"s after 2 and 3, down on 4, up after 4: nothing on beat 3.
      fact.strumBeats('folk', 4, [0, 1, 1.5, 2.5, 3, 3.5]),
    ],
  },
  {
    lesson: 'uke-first-song',
    facts: [
      // Scarborough Fair: Am C G only, in 3/4; eight bars of the first verse, then the second.
      fact.songChords('scarborough-fair', ['Am', 'C', 'G']),
      fact.songMeter('scarborough-fair', '3/4'),
      fact.songBars('scarborough-fair', ['Am', 'Am', 'C', 'G', 'Am', 'Am', 'Am', 'Am', 'Am', 'C', 'Am', 'G', 'Am', 'Am', 'Am', 'Am']),
      // The loop drill is four chords in 4/4, one bar each.
      fact.riffMeter('uke-c-am-f-g-loop', '4/4'),
    ],
  },
];
