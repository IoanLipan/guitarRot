import { fact, type LessonFacts } from './facts';

// String indices: 0 = low E ... 5 = high E.

export const UNIT_3_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'em-chord',
    facts: [
      fact.chordTones('Em-open', ['E', 'G', 'B']),
      // The distractor "G# instead of G" really is E major.
      fact.chordTones('E-open', ['E', 'G#', 'B']),
      fact.checkChordTones('Which notes are in Em (Mi minor)?', 'Em-open'),
      // Middle finger on the A string, ring on the D string, both at fret 2; all six ring.
      fact.grip('Em-open', 1, 2, 2),
      fact.grip('Em-open', 2, 2, 3),
      fact.strings('Em-open', [0, 1, 2, 3, 4, 5]),
    ],
  },
  {
    lesson: 'am-em',
    facts: [
      fact.chordTones('Am-open', ['A', 'C', 'E']),
      fact.chordTones('A-open', ['A', 'C#', 'E']),
      fact.checkChordTones('Which notes are in Am (La minor)?', 'Am-open'),
      // Index on the B string fret 1, middle on D string fret 2, ring on G string fret 2.
      fact.grip('Am-open', 4, 1, 1),
      fact.grip('Am-open', 2, 2, 2),
      fact.grip('Am-open', 3, 2, 3),
      // "Skip the thickest string": five strings sound, from the A string.
      fact.strings('Am-open', [1, 2, 3, 4, 5]),
      // Em's middle and ring fingers sit one string below Am's, on the same fret (the "one block" move).
      fact.grip('Em-open', 1, 2, 2),
      fact.grip('Em-open', 2, 2, 3),
      fact.note(1, 0, 'A'),
    ],
  },
  {
    lesson: 'd-and-a',
    facts: [
      fact.chordTones('D-open', ['D', 'F#', 'A']),
      fact.chordTones('A-open', ['A', 'C#', 'E']),
      fact.chordTones('Am-open', ['A', 'C', 'E']),
      fact.checkChordTones('Which notes make D (Re) major?', 'D-open'),
      // D: index G string fret 2, ring B string fret 3, middle high E fret 2; four strings.
      fact.grip('D-open', 3, 2, 1),
      fact.grip('D-open', 4, 3, 3),
      fact.grip('D-open', 5, 2, 2),
      fact.strings('D-open', [2, 3, 4, 5]),
      // A: index D string, middle G string, ring B string, all fret 2; five strings.
      fact.grip('A-open', 2, 2, 1),
      fact.grip('A-open', 3, 2, 2),
      fact.grip('A-open', 4, 2, 3),
      fact.strings('A-open', [1, 2, 3, 4, 5]),
      // The distractor "D with F instead of F#" is D minor.
      fact.chordTones('Dm-open', ['D', 'F', 'A']),
    ],
  },
  {
    lesson: 'g-and-c',
    facts: [
      fact.chordTones('G-open', ['G', 'B', 'D']),
      fact.chordTones('C-open', ['C', 'E', 'G']),
      fact.checkChordTones('Which notes are in G (Sol) major?', 'G-open'),
      fact.checkChordTones('Which notes are in C (Do) major?', 'C-open'),
      // G: ring on low E fret 3, middle on A string fret 2, pinky on high E fret 3; all six strings.
      fact.grip('G-open', 0, 3, 3),
      fact.grip('G-open', 1, 2, 2),
      fact.grip('G-open', 5, 3, 4),
      fact.strings('G-open', [0, 1, 2, 3, 4, 5]),
      // C: ring on A string fret 3, middle on D string fret 2, index on B string fret 1; skip the low E.
      fact.grip('C-open', 1, 3, 3),
      fact.grip('C-open', 2, 2, 2),
      fact.grip('C-open', 4, 1, 1),
      fact.strings('C-open', [1, 2, 3, 4, 5]),
      // Am to C: index and middle stay put; the ring finger moves from the G string fret 2 to the A string fret 3.
      fact.grip('Am-open', 4, 1, 1),
      fact.grip('Am-open', 2, 2, 2),
      fact.grip('Am-open', 3, 2, 3),
      // G to C: ring hops low E fret 3 -> A string fret 3 and middle hops A string fret 2 -> D string fret 2
      // (the G and C grips above), and the pinky leaves the high E string.
    ],
  },
  {
    lesson: 'counting',
    facts: [
      fact.beatSeconds(60, 1),
      fact.beatSeconds(120, 0.5),
      fact.beats('quarter', 1),
    ],
  },
  {
    lesson: 'down-up',
    facts: [
      // Six strokes in the folk pattern: three down on the beats, three up in between.
      fact.strum(3, 3),
    ],
  },
  {
    lesson: 'first-song',
    facts: [
      // Two bars of G, four of D, two of G, played twice.
      fact.songBars('tom-dooley', [
        'G', 'G', 'D', 'D', 'D', 'D', 'G', 'G', 'G', 'G', 'D', 'D', 'D', 'D', 'G', 'G',
      ]),
      fact.songChords('tom-dooley', ['G', 'D']),
      // The follow-up songs use only G, C and D.
      fact.songChords('oh-susanna', ['G', 'C', 'D']),
      fact.songChords('when-the-saints', ['G', 'C', 'D']),
      fact.songChords('aura-lee', ['G', 'C', 'D']),
    ],
  },
];
