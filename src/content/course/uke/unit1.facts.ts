import { fact, type LessonFacts } from '../facts';

// String indices: 0 = G (string 4, the high one), 1 = C, 2 = E, 3 = A (string 1, nearest the floor).

export const UKE_UNIT_1_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'uke-meet',
    facts: [
      // "the string nearest the floor ... string 1": the A.
      fact.stringNumber(3, 1, 'A'),
      fact.checkNote('nearest the floor', 3, 0),
    ],
  },
  {
    lesson: 'uke-strings',
    facts: [
      // G C E A = Sol Do Mi La, string 4 (index 0) down to string 1 (index 3).
      fact.stringNumber(0, 4, 'G'),
      fact.stringNumber(1, 3, 'C'),
      fact.stringNumber(2, 2, 'E'),
      fact.stringNumber(3, 1, 'A'),
      // "Goats Chew Every Apple": the first letters spell the strings.
      fact.initials('Goats', 'Chew', 'Every', 'Apple'),
      fact.checkInitial('which word stands for the E (Mi) string', 2),
      // "The open strings make a C chord with an A on top".
      fact.chordTones('uke-C', ['C', 'E', 'G']),
      // Re-entrant: by pitch, low to high, it is C E G A, so the G string sits above the C and the E.
      fact.pitchOrder({ stringIndex: 1, fret: 0 }, { stringIndex: 2, fret: 0 }, { stringIndex: 0, fret: 0 }, { stringIndex: 3, fret: 0 }),
      fact.checkStringNumber('which string number is the C (Do) string', 1),
      // "the lowest open string" is the C.
      fact.checkNote('sounds the lowest', 1, 0),
    ],
  },
  {
    lesson: 'uke-tuning',
    facts: [
      // The fret-4 / fret-5 / fret-3 method, all from the C string's E and the E string's A and G.
      fact.samePitch({ stringIndex: 1, fret: 4 }, { stringIndex: 2, fret: 0 }),
      fact.samePitch({ stringIndex: 2, fret: 5 }, { stringIndex: 3, fret: 0 }),
      fact.samePitch({ stringIndex: 2, fret: 3 }, { stringIndex: 0, fret: 0 }),
      fact.note(1, 4, 'E'),
      fact.note(2, 5, 'A'),
      fact.note(2, 3, 'G'),
      // "Fret 12 is C again, an octave up."
      fact.samePitch({ stringIndex: 1, fret: 0 }, { stringIndex: 1, fret: 12 }, 1),
      fact.checkSameNote('Where do you press the C (Do)?', { stringIndex: 2, fret: 0 }, 1, 0, 'ordinal'),
      fact.checkSameNote('where on the E (Mi) string do you press', { stringIndex: 0, fret: 0 }, 2, 0, 'string-fret'),
      // "Fret 5 there is A, the open string on the other side."
      fact.note(2, 5, 'A'),
    ],
  },
  {
    lesson: 'uke-first-strum',
    facts: [
      fact.beatSeconds(60, 1),
      fact.beatSeconds(120, 0.5),
      fact.beats('quarter', 1),
    ],
  },
];
