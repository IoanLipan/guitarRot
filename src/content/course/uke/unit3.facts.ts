import { fact, type LessonFacts } from '../facts';

// String indices: 0 = G (string 4), 1 = C, 2 = E, 3 = A (string 1). A chord's strings read G C E A, left to right.

export const UKE_UNIT_3_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'uke-minors',
    facts: [
      fact.chordTones('uke-Dm', ['D', 'F', 'A']),
      fact.chordTones('uke-Em', ['E', 'G', 'B']),
      // "Raise the F one fret to F# and it turns major": D major is D F# A.
      fact.chordTones('uke-D', ['D', 'F#', 'A']),
      fact.semitones('F', 'F#', 1),
      fact.checkChordTones('Which notes are in Dm', 'uke-Dm'),
      fact.checkChordTones('Which notes are in Em', 'uke-Em'),
      // Dm: index on the E string fret 1, middle on the G string fret 2, ring on the C string fret 2.
      fact.grip('uke-Dm', 2, 1, 1),
      fact.grip('uke-Dm', 0, 2, 2),
      fact.grip('uke-Dm', 1, 2, 3),
      fact.fingers('uke-Dm', 3),
      fact.strings('uke-Dm', [0, 1, 2, 3]),
      fact.note(1, 2, 'D'),
      // Dm is F plus one finger: F has the index and middle fingers where Dm does.
      fact.grip('uke-F', 2, 1, 1),
      fact.grip('uke-F', 0, 2, 2),
      fact.fingers('uke-F', 2),
      // Dm to Am: the middle finger stays on the G string, fret 2.
      fact.grip('uke-Am', 0, 2, 2),
      // Em: index on the A string fret 2, middle on the E string fret 3, ring on the C string fret 4; the G string rings open.
      fact.grip('uke-Em', 3, 2, 1),
      fact.grip('uke-Em', 2, 3, 2),
      fact.grip('uke-Em', 1, 4, 3),
      fact.fingers('uke-Em', 3),
      fact.strings('uke-Em', [0, 1, 2, 3]),
      fact.note(1, 4, 'E'),
      fact.note(2, 3, 'G'),
      fact.note(3, 2, 'B'),
      // Drunken Sailor: only Dm and C.
      fact.songChords('drunken-sailor', ['Dm', 'C']),
    ],
  },
  {
    lesson: 'uke-sevenths',
    facts: [
      fact.chordTones('uke-C7', ['C', 'E', 'G', 'Bb']),
      fact.chordTones('uke-A7', ['A', 'C#', 'E', 'G']),
      fact.checkChordTones('Which notes are in C7', 'uke-C7', true),
      fact.checkChordTones('Which notes are in A7', 'uke-A7'),
      // C7: one finger, the index on the A string at fret 1 (Bb); C had it on fret 3.
      fact.grip('uke-C7', 3, 1, 1),
      fact.fingers('uke-C7', 1),
      fact.strings('uke-C7', [0, 1, 2, 3]),
      fact.grip('uke-C', 3, 3, 3),
      fact.note(3, 1, 'Bb'),
      // A7: one finger, the index on the C string at fret 1 (C#).
      fact.grip('uke-A7', 1, 1, 1),
      fact.fingers('uke-A7', 1),
      fact.strings('uke-A7', [0, 1, 2, 3]),
      fact.note(1, 1, 'C#'),
      // "With C instead of C# it would be minor": the open C string, and Am's C.
      fact.chordTones('uke-Am', ['A', 'C', 'E']),
    ],
  },
  {
    lesson: 'uke-chunk',
    facts: [
      // Four beats to the bar: beats 1 and 3 ring, 2 and 4 chop.
      fact.riffMeter('uke-chop-c-g7', '4/4'),
      fact.strumBeats('downs', 4, [0, 1, 2, 3]),
    ],
  },
  {
    lesson: 'uke-one-four-five',
    facts: [
      // The key of C: C, F, G (the vi is Am); the key of G: G, C, D (the vi is Em).
      fact.key('C', 'C', 'F', 'G', 'A'),
      fact.key('G', 'G', 'C', 'D', 'E'),
      fact.scale('C', 'major', ['C', 'D', 'E', 'F', 'G', 'A', 'B']),
      // D: the index finger flat across the G, C and E strings at fret 2; the A string rings open.
      fact.chordTones('uke-D', ['D', 'F#', 'A']),
      fact.grip('uke-D', 0, 2, 1),
      fact.grip('uke-D', 1, 2, 1),
      fact.grip('uke-D', 2, 2, 1),
      fact.strings('uke-D', [0, 1, 2, 3]),
      fact.note(0, 2, 'A'),
      fact.note(1, 2, 'D'),
      fact.note(2, 2, 'F#'),
      // The checks, recomputed.
      fact.songChords('when-the-saints', ['G', 'C', 'D']),
      fact.riffMeter('uke-one-four-five-c', '4/4'),
      fact.riffMeter('uke-one-four-five-g', '4/4'),
    ],
  },
  {
    lesson: 'uke-waltz',
    facts: [
      fact.songMeter('amazing-grace', '3/4'),
      fact.songChords('amazing-grace', ['G', 'C', 'D']),
      fact.riffMeter('uke-waltz-g-c-d', '3/4'),
      // One downstroke per beat, three beats a bar.
      fact.strumBeats('downs', 3, [0, 1, 2]),
    ],
  },
];
