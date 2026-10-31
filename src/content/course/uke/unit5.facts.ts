import { fact, type LessonFacts } from '../facts';

// String indices: 0 = G (string 4), 1 = C, 2 = E, 3 = A (string 1).

export const UKE_UNIT_5_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'uke-campanella',
    facts: [
      // The scale, Do to La and back, as the drill plays it.
      fact.riffMelody('uke-campanella-scale', 'Do Re Mi Fa Sol La La Sol Fa Mi Re Do'),
      // Where each note is: C and D share the C string (D cuts C off); E and F share the E string; G and A have strings of their own.
      fact.note(1, 0, 'C'),
      fact.note(1, 2, 'D'),
      fact.note(2, 0, 'E'),
      fact.note(2, 1, 'F'),
      fact.note(0, 0, 'G'),
      fact.note(3, 0, 'A'),
      // A note rings for 2.5 beats when the next one is on another string, and for one beat when the next one is on its own string.
      fact.riffEvent('uke-campanella-scale', 0, 1, 0, 1),
      fact.riffEvent('uke-campanella-scale', 1, 1, 2, 2.5),
      fact.riffEvent('uke-campanella-scale', 2, 2, 0, 1),
      fact.riffEvent('uke-campanella-scale', 3, 2, 1, 2.5),
      fact.riffEvent('uke-campanella-scale', 4, 0, 0, 2.5),
      // The listen target: open C, E, G, A, each in a new pitch.
      fact.pitchOrder({ stringIndex: 1, fret: 0 }, { stringIndex: 2, fret: 0 }, { stringIndex: 0, fret: 0 }, { stringIndex: 3, fret: 0 }),
      fact.checkNote('fret 1 of the E (Mi) string', 2, 1),
    ],
  },
  {
    lesson: 'uke-bb',
    facts: [
      fact.chordTones('uke-Bb', ['Bb', 'D', 'F']),
      fact.checkChordTones('Which notes are in Bb', 'uke-Bb', true),
      // Bb: the index flat across the E and A strings at fret 1, middle on the C string fret 2, ring on the G string fret 3.
      fact.grip('uke-Bb', 2, 1, 1),
      fact.grip('uke-Bb', 3, 1, 1),
      fact.grip('uke-Bb', 1, 2, 2),
      fact.grip('uke-Bb', 0, 3, 3),
      fact.strings('uke-Bb', [0, 1, 2, 3]),
      fact.note(0, 3, 'Bb'),
      fact.note(1, 2, 'D'),
      fact.note(2, 1, 'F'),
      fact.note(3, 1, 'Bb'),
      // F to Bb: the index is already on fret 1 of the E string in F.
      fact.grip('uke-F', 2, 1, 1),
      // The key of F: F, Bb, C (the vi is Dm); the drill is in 4/4.
      fact.key('F', 'F', 'Bb', 'C', 'D'),
      fact.riffMeter('uke-f-bb-change', '4/4'),
      fact.riffMeter('uke-one-four-five-f', '4/4'),
      // "Lower the D to Db and it turns minor": Db is one semitone below D.
      fact.semitones('Db', 'D', 1),
    ],
  },
  {
    lesson: 'uke-practice',
    facts: [
      // Tom Dooley: G and D only.
      fact.songChords('tom-dooley', ['G', 'D']),
      fact.riffMeter('uke-island-loop', '4/4'),
    ],
  },
];
