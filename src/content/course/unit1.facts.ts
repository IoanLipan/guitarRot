import { fact, type LessonFacts } from './facts';

export const UNIT_1_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'strings',
    facts: [
      // E A D G B E = Mi La Re Sol Si Mi, string 6 (index 0) up to string 1 (index 5).
      fact.stringNumber(0, 6, 'E'),
      fact.stringNumber(1, 5, 'A'),
      fact.stringNumber(2, 4, 'D'),
      fact.stringNumber(3, 3, 'G'),
      fact.stringNumber(4, 2, 'B'),
      fact.stringNumber(5, 1, 'E'),
      // "both E (Mi), two octaves apart"
      fact.samePitch({ stringIndex: 0, fret: 0 }, { stringIndex: 5, fret: 0 }, 2),
      fact.checkNote('You pluck the thickest string', 0, 0),
      fact.checkStringNumber('which string number is the D (Re) string', 2),
    ],
  },
  {
    lesson: 'tuning',
    facts: [
      // The 5th-fret method, with the G-to-B exception at fret 4.
      fact.samePitch({ stringIndex: 0, fret: 5 }, { stringIndex: 1, fret: 0 }),
      fact.samePitch({ stringIndex: 1, fret: 5 }, { stringIndex: 2, fret: 0 }),
      fact.samePitch({ stringIndex: 2, fret: 5 }, { stringIndex: 3, fret: 0 }),
      fact.samePitch({ stringIndex: 3, fret: 4 }, { stringIndex: 4, fret: 0 }),
      fact.samePitch({ stringIndex: 4, fret: 5 }, { stringIndex: 5, fret: 0 }),
      // "Fret 12 would give you E (Mi) again, an octave up."
      fact.samePitch({ stringIndex: 0, fret: 0 }, { stringIndex: 0, fret: 12 }, 1),
      fact.note(0, 5, 'A'),
      fact.checkSameNote('Where do you press the low E (Mi)?', { stringIndex: 1, fret: 0 }, 0, 0, 'ordinal'),
    ],
  },
  {
    lesson: 'tab',
    facts: [
      // "plays the thin one twice at the top": the open walk goes 6 5 4 3 2 1 1 2 3 4 5 6.
      fact.riffEvent('open-strings-walk', 0, 0, 0),
      fact.riffEvent('open-strings-walk', 5, 5, 0),
      fact.riffEvent('open-strings-walk', 6, 5, 0),
      fact.riffEvent('open-strings-walk', 11, 0, 0),
    ],
  },
  {
    lesson: 'first-notes',
    facts: [
      ...fact.notesOn(5, { 0: 'E', 1: 'F', 2: 'F#', 3: 'G' }),
      // "Mi Fa Sol Fa Mi"
      fact.riffEvent('mi-fa-sol', 0, 5, 0),
      fact.riffEvent('mi-fa-sol', 1, 5, 1),
      fact.riffEvent('mi-fa-sol', 2, 5, 3),
      fact.riffEvent('mi-fa-sol', 3, 5, 1),
      fact.checkFret('Which fret of the thinnest string gives you F (Fa)?', 5, 'F'),
    ],
  },
];
