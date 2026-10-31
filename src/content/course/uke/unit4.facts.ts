import { fact, type LessonFacts } from '../facts';

// String indices: 0 = G (string 4), 1 = C, 2 = E, 3 = A (string 1).

export const UKE_UNIT_4_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'uke-notes',
    facts: [
      // The E string: open, fret 1, fret 3, fret 5 are E F G A; fret 2 is the F# that fret 3 skips.
      ...fact.notesOn(2, { 0: 'E', 1: 'F', 2: 'F#', 3: 'G', 5: 'A' }),
      // The A string: A B C D E at frets 0 2 3 5 7.
      ...fact.notesOn(3, { 0: 'A', 2: 'B', 3: 'C', 5: 'D', 7: 'E' }),
      // The half steps: E-F (frets 0 and 1 on the E string), B-C (frets 2 and 3 on the A string).
      fact.semitones('E', 'F', 1),
      fact.semitones('B', 'C', 1),
      // "Fret 5 of the E string is the open A string next door."
      fact.samePitch({ stringIndex: 2, fret: 5 }, { stringIndex: 3, fret: 0 }),
      // The two landmark drills walk exactly those frets.
      fact.riffEvent('uke-a-string-landmarks', 0, 3, 0),
      fact.riffEvent('uke-a-string-landmarks', 1, 3, 2),
      fact.riffEvent('uke-a-string-landmarks', 2, 3, 3),
      fact.riffEvent('uke-a-string-landmarks', 3, 3, 5),
      fact.riffEvent('uke-a-string-landmarks', 4, 3, 7),
      fact.riffEvent('uke-e-string-landmarks', 0, 2, 0),
      fact.riffEvent('uke-e-string-landmarks', 1, 2, 1),
      fact.riffEvent('uke-e-string-landmarks', 2, 2, 3),
      fact.riffEvent('uke-e-string-landmarks', 3, 2, 5),
      fact.checkFret('Which fret of the A (La) string is D (Re)?', 3, 'D'),
      fact.checkNote('Which note sits at fret 3 of the E (Mi) string?', 2, 3),
    ],
  },
  {
    lesson: 'uke-tab',
    facts: [
      // The top line of the tab is string 1, the A; the bottom line is string 4, the G.
      fact.stringNumber(3, 1, 'A'),
      fact.stringNumber(0, 4, 'G'),
      // "The bottom line sounds higher than the C line above it": the G string is above the C string.
      fact.pitchOrder({ stringIndex: 1, fret: 0 }, { stringIndex: 0, fret: 0 }),
      // A stacked column is a chord: 0 0 0 3 is C, read G string first.
      fact.grip('uke-C', 3, 3, 3),
      fact.note(3, 3, 'C'),
      // The E-string drill: frets 0 1 3 5; the listen targets are fret 0 and fret 3.
      fact.riffEvent('uke-e-string-landmarks', 0, 2, 0),
      fact.riffEvent('uke-e-string-landmarks', 2, 2, 3),
      fact.note(2, 0, 'E'),
      fact.note(2, 3, 'G'),
    ],
  },
  {
    lesson: 'uke-fingerpicking',
    facts: [
      // The picking strings: thumb G and C (4 and 3), index E (2), middle A (1).
      fact.stringNumber(0, 4, 'G'),
      fact.stringNumber(1, 3, 'C'),
      fact.stringNumber(2, 2, 'E'),
      fact.stringNumber(3, 1, 'A'),
      // The pattern drill on C, 0003: G C E A E C, strings 4 3 2 1 2 3 (the A string at fret 3).
      fact.riffEvent('uke-fingerpick-c', 0, 0, 0),
      fact.riffEvent('uke-fingerpick-c', 0.5, 1, 0),
      fact.riffEvent('uke-fingerpick-c', 1, 2, 0),
      fact.riffEvent('uke-fingerpick-c', 1.5, 3, 3),
      fact.riffEvent('uke-fingerpick-c', 2, 2, 0),
      fact.riffEvent('uke-fingerpick-c', 2.5, 1, 0),
      fact.riffMeter('uke-fingerpick-c', '4/4'),
      fact.riffMeter('uke-fingerpick-loop', '4/4'),
      // The Water Is Wide: G, Em, C and D, in 4/4.
      fact.songChords('the-water-is-wide', ['G', 'Em', 'C', 'D']),
      fact.songMeter('the-water-is-wide', '4/4'),
    ],
  },
  {
    lesson: 'uke-first-melody',
    facts: [
      // Twinkle opens Do Do Sol Sol La La Sol and ends Fa Fa Mi Mi Re Re Do.
      fact.riffMelody('uke-twinkle-first-melody', 'Do Do Sol Sol La La Sol Fa Fa Mi Mi Re Re Do'),
      // Ode to Joy opens Mi Mi Fa Sol, Sol Fa Mi Re, and the phrase ends Mi Re Re.
      fact.riffMelody('uke-ode-first-phrase', 'Mi Mi Fa Sol Sol Fa Mi Re Do Do Re Mi Mi Re Re'),
      // "A leap: Do up to Sol", a perfect fifth, seven semitones.
      fact.interval('C4', 'G4', 'P5'),
      // The six notes and where they are: open C, D at fret 2 of the C string, open E, F at fret 1 of the E string, open G, open A.
      fact.note(1, 0, 'C'),
      fact.note(1, 2, 'D'),
      fact.note(2, 0, 'E'),
      fact.note(2, 1, 'F'),
      fact.note(0, 0, 'G'),
      fact.note(3, 0, 'A'),
      fact.checkFret('Which fret of the C (Do) string is D (Re)?', 1, 'D'),
      fact.checkFret('Which fret of the E (Mi) string is F (Fa)?', 2, 'F'),
    ],
  },
];
