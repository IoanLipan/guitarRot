import { fact, type Fact, type LessonFacts } from './facts';

const LOW_E = 0;
const A_STRING = 1;

/** Natural notes of the low E string, as the landmarks lesson teaches them. */
const lowELandmarks: Fact[] = fact.notesOn(LOW_E, { 0: 'E', 1: 'F', 3: 'G', 5: 'A', 7: 'B', 8: 'C', 10: 'D', 12: 'E' });

/** Natural notes of the A string. */
const aStringLandmarks: Fact[] = fact.notesOn(A_STRING, {
  0: 'A',
  2: 'B',
  3: 'C',
  5: 'D',
  7: 'E',
  8: 'F',
  10: 'G',
  12: 'A',
});

export const UNIT_2_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'alphabet',
    facts: [
      fact.solfege('A', 'La'),
      fact.solfege('B', 'Si'),
      fact.solfege('C', 'Do'),
      fact.solfege('D', 'Re'),
      fact.solfege('E', 'Mi'),
      fact.solfege('F', 'Fa'),
      fact.solfege('G', 'Sol'),
      // Whole steps everywhere except E-F and B-C.
      fact.semitones('C', 'D', 2),
      fact.semitones('D', 'E', 2),
      fact.semitones('E', 'F', 1),
      fact.semitones('F', 'G', 2),
      fact.semitones('G', 'A', 2),
      fact.semitones('A', 'B', 2),
      fact.semitones('B', 'C', 1),
      // The A-string fretboard step: "two nearly everywhere, one from B to C and E to F".
      ...aStringLandmarks,
    ],
  },
  {
    lesson: 'sharps-flats',
    facts: [
      fact.semitones('C', 'C#', 1),
      fact.semitones('Db', 'D', 1),
      fact.semitones('C#', 'Db', 0),
      // The whole low E string, fret by fret.
      ...fact.notesOn(LOW_E, {
        0: 'E',
        1: 'F',
        2: 'F#',
        3: 'G',
        4: 'G#',
        5: 'A',
        6: 'A#',
        7: 'B',
        8: 'C',
        9: 'C#',
        10: 'D',
        11: 'D#',
        12: 'E',
      }),
      // "one fret below B": B is fret 2 of the A string, Bb is fret 1; A is fret 0.
      fact.note(A_STRING, 2, 'B'),
      fact.note(A_STRING, 1, 'Bb'),
      fact.note(A_STRING, 0, 'A'),
      // "G# and Ab are the same fret; G is one below and A one above".
      fact.note(LOW_E, 4, 'Ab'),
      fact.note(LOW_E, 3, 'G'),
      fact.note(LOW_E, 5, 'A'),
      fact.note(LOW_E, 6, 'Bb'),
      // "12 frets later you reach the same note name again".
      fact.samePitch({ stringIndex: LOW_E, fret: 0 }, { stringIndex: LOW_E, fret: 12 }, 1),
      // C to C# in the A-string position used by the check.
      fact.note(A_STRING, 3, 'C'),
      fact.note(A_STRING, 4, 'C#'),
      fact.note(A_STRING, 5, 'D'),
      fact.checkNote('You play C (Do), then move up one fret', A_STRING, 4),
      fact.checkNote('Which note is one fret below B (Si)?', A_STRING, 1, true),
    ],
  },
  {
    lesson: 'low-e-notes',
    facts: [
      ...lowELandmarks,
      // "Say the names: Mi Sol La Si, Do Re Mi" are the riff's first seven notes.
      fact.riffEvent('low-e-landmarks', 0, 0, 0),
      fact.riffEvent('low-e-landmarks', 1, 0, 3),
      fact.riffEvent('low-e-landmarks', 2, 0, 5),
      fact.riffEvent('low-e-landmarks', 3, 0, 7),
      fact.riffEvent('low-e-landmarks', 4, 0, 8),
      fact.riffEvent('low-e-landmarks', 5, 0, 10),
      fact.riffEvent('low-e-landmarks', 6, 0, 12),
      fact.semitones('E', 'F', 1),
      fact.semitones('B', 'C', 1),
      fact.checkFret('Which fret of the low E (Mi) string is C (Do)?', LOW_E, 'C'),
      fact.checkNote('Which note sits at fret 10 of the low E (Mi) string?', LOW_E, 10),
    ],
  },
  {
    lesson: 'a-string-notes',
    facts: [
      ...aStringLandmarks,
      // Frets 7 and 8 are a half step on both strings; so are 2-3 on the A string.
      fact.semitones('B', 'C', 1),
      fact.semitones('E', 'F', 1),
      // "fret 5 of the low E string is A, the open string next door".
      fact.samePitch({ stringIndex: LOW_E, fret: 5 }, { stringIndex: A_STRING, fret: 0 }),
      // The riff's eight ascending notes: La Si Do Re, Mi Fa Sol La.
      fact.riffEvent('a-string-landmarks', 0, A_STRING, 0),
      fact.riffEvent('a-string-landmarks', 1, A_STRING, 2),
      fact.riffEvent('a-string-landmarks', 2, A_STRING, 3),
      fact.riffEvent('a-string-landmarks', 3, A_STRING, 5),
      fact.riffEvent('a-string-landmarks', 4, A_STRING, 7),
      fact.riffEvent('a-string-landmarks', 5, A_STRING, 8),
      fact.riffEvent('a-string-landmarks', 6, A_STRING, 10),
      fact.riffEvent('a-string-landmarks', 7, A_STRING, 12),
      fact.checkFret('Which fret of the A (La) string is D (Re)?', A_STRING, 'D'),
      fact.checkNote('Which note sits at fret 7 of the A (La) string?', A_STRING, 7),
      // The distractor pairs are whole steps.
      fact.semitones('C', 'D', 2),
      fact.semitones('D', 'E', 2),
      fact.semitones('F', 'G', 2),
    ],
  },
  {
    lesson: 'octaves',
    facts: [
      // 12 frets up one string.
      fact.samePitch({ stringIndex: LOW_E, fret: 0 }, { stringIndex: LOW_E, fret: 12 }, 1),
      // From strings 6 and 5: two strings thinner, two frets higher.
      fact.samePitch({ stringIndex: 0, fret: 3 }, { stringIndex: 2, fret: 5 }, 1),
      fact.samePitch({ stringIndex: 1, fret: 3 }, { stringIndex: 3, fret: 5 }, 1),
      fact.samePitch({ stringIndex: 0, fret: 5 }, { stringIndex: 2, fret: 7 }, 1),
      fact.samePitch({ stringIndex: 1, fret: 5 }, { stringIndex: 3, fret: 7 }, 1),
      fact.note(0, 3, 'G'),
      fact.note(2, 5, 'G'),
      fact.note(1, 3, 'C'),
      fact.note(0, 5, 'A'),
      fact.note(2, 7, 'A'),
      fact.note(1, 5, 'D'),
      fact.checkSameNote('Where is A (La) one octave higher', { stringIndex: 0, fret: 5 }, 2, 1, 'string-fret'),
      // Higher up the same octave needs three frets, not two (D string to B string, G string to high E).
      fact.samePitch({ stringIndex: 2, fret: 0 }, { stringIndex: 4, fret: 3 }, 1),
      fact.samePitch({ stringIndex: 3, fret: 0 }, { stringIndex: 5, fret: 3 }, 1),
      // The wrong answers to the octave check name different notes.
      fact.note(2, 5, 'G'),
      fact.note(1, 7, 'E'),
      fact.note(3, 7, 'D'),
      // The octave-hop riff's eight notes, two beats each.
      fact.riffEvent('octave-hop', 0, 0, 3, 2),
      fact.riffEvent('octave-hop', 2, 2, 5, 2),
      fact.riffEvent('octave-hop', 4, 1, 3, 2),
      fact.riffEvent('octave-hop', 6, 3, 5, 2),
      fact.riffEvent('octave-hop', 8, 0, 5, 2),
      fact.riffEvent('octave-hop', 10, 2, 7, 2),
      fact.riffEvent('octave-hop', 12, 1, 5, 2),
      fact.riffEvent('octave-hop', 14, 3, 7, 2),
    ],
  },
];
