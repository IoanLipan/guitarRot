import { fact, type LessonFacts } from './facts';

// String indices: 0 = low E, 1 = A, 2 = D, 3 = G, 4 = B, 5 = high E.

export const UNIT_6_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'hammer-pull',
    facts: [
      // "Bar 3 is a trill on the B string with a single pick": it opens on the open B string, then fret 1.
      fact.riffEvent('legato-drill', 8, 4, 0),
      fact.riffEvent('legato-drill', 8.5, 4, 1),
    ],
  },
  {
    lesson: 'slides-bends',
    facts: [
      // The bend target: fret 8 of the B string is G, fret 10 is A, a whole step (two frets) up.
      fact.note(4, 8, 'G'),
      fact.note(4, 10, 'A'),
      fact.note(4, 9, 'G#'),
      fact.semitones('G', 'A', 2),
      fact.checkNote('You fret fret 8 of the B', 4, 10),
      // The drill: slide up two frets in bars 1-2, hear the target then bend to it in bars 3-4.
      fact.riffEvent('slide-and-bend', 0, 3, 7),
      fact.riffEvent('slide-and-bend', 2, 3, 9),
      fact.riffEvent('slide-and-bend', 4, 4, 3),
      fact.riffEvent('slide-and-bend', 6, 4, 5),
      fact.riffEvent('slide-and-bend', 8, 4, 10),
      fact.riffEvent('slide-and-bend', 10, 4, 8),
      fact.riffEvent('slide-and-bend', 12, 5, 12),
      fact.riffEvent('slide-and-bend', 14, 5, 10),
    ],
  },
  {
    lesson: 'f-barre',
    facts: [
      fact.chordTones('F-barre', ['F', 'A', 'C']),
      fact.chordTones('Fmaj7-open', ['F', 'A', 'C', 'E']),
      // "E, the note one fret below F."
      fact.semitones('E', 'F', 1),
      fact.note(5, 0, 'E'),
      fact.note(5, 1, 'F'),
      fact.checkNote('What does Fmaj7 (Fa major seventh) add', 5, 0),
      // Fmaj7: index B string fret 1, middle G string fret 2, ring D string fret 3; four strings.
      fact.grip('Fmaj7-open', 4, 1, 1),
      fact.grip('Fmaj7-open', 3, 2, 2),
      fact.grip('Fmaj7-open', 2, 3, 3),
      fact.strings('Fmaj7-open', [2, 3, 4, 5]),
      // The barre F: index across all six at fret 1 (the three barred strings listed), middle G string fret 2,
      // ring A string fret 3, pinky D string fret 3.
      fact.grip('F-barre', 0, 1, 1),
      fact.grip('F-barre', 4, 1, 1),
      fact.grip('F-barre', 5, 1, 1),
      fact.grip('F-barre', 3, 2, 2),
      fact.grip('F-barre', 1, 3, 3),
      fact.grip('F-barre', 2, 3, 4),
      fact.strings('F-barre', [0, 1, 2, 3, 4, 5]),
      // Listen targets, thickest first: F C F A C F.
      fact.note(0, 1, 'F'),
      fact.note(1, 3, 'C'),
      fact.note(2, 3, 'F'),
      fact.note(3, 2, 'A'),
      fact.note(4, 1, 'C'),
    ],
  },
  {
    lesson: 'practice-plan',
    facts: [
      // The warm-up: frets 1-2-3-4 on the low E, A, D and G strings in turn.
      fact.riffEvent('chromatic-warmup', 0, 0, 1),
      fact.riffEvent('chromatic-warmup', 1.5, 0, 4),
      fact.riffEvent('chromatic-warmup', 2, 1, 1),
      fact.riffEvent('chromatic-warmup', 3.5, 1, 4),
      fact.riffEvent('chromatic-warmup', 4, 2, 1),
      fact.riffEvent('chromatic-warmup', 5.5, 2, 4),
      fact.riffEvent('chromatic-warmup', 6, 3, 1),
      fact.riffEvent('chromatic-warmup', 7.5, 3, 4),
    ],
  },
];
