import { fact, type LessonFacts } from './facts';

// String indices: 0 = low E, 1 = A, 2 = D, 3 = G, 4 = B, 5 = high E.

export const UNIT_5_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'power-chords',
    facts: [
      // Root and fifth only. "For E the fifth is B."
      fact.chordTones('E5-power', ['E', 'B']),
      fact.chordTones('G5-power', ['G', 'D']),
      fact.interval('E2', 'B2', 'P5'),
      // E5: low E open, index on the A string fret 2, middle on the D string fret 2; three strings.
      fact.grip('E5-power', 1, 2, 1),
      fact.grip('E5-power', 2, 2, 2),
      fact.strings('E5-power', [0, 1, 2]),
      // G5: the same shape slid up three frets: index fret 3 low E, ring fret 5 A string, pinky fret 5 D string.
      fact.grip('G5-power', 0, 3, 1),
      fact.grip('G5-power', 1, 5, 3),
      fact.grip('G5-power', 2, 5, 4),
      // "The fret tells you the name": 3 is G, 5 is A on the low E string; 3 is C on the A string.
      fact.note(0, 3, 'G'),
      fact.note(0, 5, 'A'),
      fact.note(0, 0, 'E'),
      fact.note(1, 3, 'C'),
      // The riff: frets 0, 3, 5, 0 on the low E, each with the fifth two frets up on the A string.
      fact.riffEvent('power-chord-drive', 0, 0, 0),
      fact.riffEvent('power-chord-drive', 0, 1, 2),
      fact.riffEvent('power-chord-drive', 4, 0, 3),
      fact.riffEvent('power-chord-drive', 4, 1, 5),
      fact.riffEvent('power-chord-drive', 8, 0, 5),
      fact.riffEvent('power-chord-drive', 8, 1, 7),
      fact.riffEvent('power-chord-drive', 12, 0, 0),
      fact.riffEvent('power-chord-drive', 12, 1, 2),
    ],
  },
  {
    lesson: 'keys-1-4-5',
    facts: [
      // I, IV, V and vi of each key the lesson names.
      fact.key('G', 'G', 'C', 'D', 'E'),
      fact.key('C', 'C', 'F', 'G', 'A'),
      fact.key('D', 'D', 'G', 'A', 'B'),
      fact.key('A', 'A', 'D', 'E', 'F#'),
      // "The G major scale runs G A B C D E F#."
      fact.scale('G', 'major', ['G', 'A', 'B', 'C', 'D', 'E', 'F#']),
      // The song uses only the key's I, IV and V.
      fact.songChords('aura-lee', ['G', 'C', 'D']),
    ],
  },
  {
    lesson: 'pentatonic',
    facts: [
      fact.scale('E', 'minorPentatonic', ['E', 'G', 'A', 'B', 'D']),
      // The distractor is E major pentatonic.
      fact.scale('E', 'majorPentatonic', ['E', 'F#', 'G#', 'B', 'C#']),
      // F is outside the scale: box 1 skips fret 1 of the low E string.
      fact.note(0, 1, 'F'),
      fact.note(0, 3, 'G'),
      fact.checkFret('Which fret of the low E (Mi) string is G (Sol) in box 1?', 0, 'G'),
    ],
  },
  {
    lesson: 'twelve-bar',
    facts: [
      // In E: I E, IV A, V B.
      fact.key('E', 'E', 'A', 'B', 'C#'),
      // The shuffle: open low E with the A string at fret 2 (B, the fifth) then fret 4 (C#, the sixth).
      fact.note(1, 2, 'B'),
      fact.note(1, 4, 'C#'),
      fact.riffEvent('blues-shuffle-e', 0, 0, 0),
      fact.riffEvent('blues-shuffle-e', 0, 1, 2),
      fact.riffEvent('blues-shuffle-e', 0.5, 1, 4),
      // Two bars on E, one on A, back to E.
      fact.riffEvent('blues-shuffle-e', 4, 0, 0),
      fact.riffEvent('blues-shuffle-e', 8, 1, 0),
      fact.riffEvent('blues-shuffle-e', 12, 0, 0),
      // The A bar: open A string with the D string at fret 2 (E) and fret 4 (F#).
      fact.note(2, 2, 'E'),
      fact.note(2, 4, 'F#'),
      fact.riffEvent('blues-shuffle-e', 8, 2, 2),
      fact.riffEvent('blues-shuffle-e', 8.5, 2, 4),
      // The B bar: slid up two frets: B at fret 2 of the A string, partners at fret 4 (F#) and fret 6 (G#) on the D string.
      fact.note(2, 6, 'G#'),
    ],
  },
];
