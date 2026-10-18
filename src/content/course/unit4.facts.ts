import { fact, type LessonFacts } from './facts';

// String indices: 0 = low E, 1 = A, 2 = D, 3 = G, 4 = B, 5 = high E.

export const UNIT_4_FACTS: readonly LessonFacts[] = [
  {
    lesson: 'major-scale',
    facts: [
      fact.scale('C', 'major', ['C', 'D', 'E', 'F', 'G', 'A', 'B']),
      fact.scaleSteps('major', 'WWHWWWH'),
      // The distractor "whole, half, whole, whole, half, whole, whole" is natural minor.
      fact.scaleSteps('naturalMinor', 'WHWWHWW'),
      fact.semitones('E', 'F', 1),
      fact.semitones('B', 'C', 1),
      // First-position C major: A string 3; D string 0 2 3; G string 0 2; B string 0 1.
      fact.note(1, 3, 'C'),
      fact.note(2, 0, 'D'),
      fact.note(2, 2, 'E'),
      fact.note(2, 3, 'F'),
      fact.note(3, 0, 'G'),
      fact.note(3, 2, 'A'),
      fact.note(4, 0, 'B'),
      fact.note(4, 1, 'C'),
      // The drill walks exactly those eight frets.
      fact.riffEvent('c-major-scale', 0, 1, 3),
      fact.riffEvent('c-major-scale', 1, 2, 0),
      fact.riffEvent('c-major-scale', 2, 2, 2),
      fact.riffEvent('c-major-scale', 3, 2, 3),
      fact.riffEvent('c-major-scale', 4, 3, 0),
      fact.riffEvent('c-major-scale', 5, 3, 2),
      fact.riffEvent('c-major-scale', 6, 4, 0),
      fact.riffEvent('c-major-scale', 7, 4, 1),
    ],
  },
  {
    lesson: 'ode-to-joy',
    facts: [
      fact.melody('ode-to-joy', 'Mi Mi Fa Sol Sol Fa Mi Re Do Do Re Mi Mi Re Re'),
      // The distractors really are the openings of the other tunes.
      fact.melody('mary-had-a-little-lamb', 'Mi Re Do Re Mi Mi Mi'),
      fact.melody('twinkle-twinkle', 'Do Do Sol Sol La La Sol'),
      fact.melody('frere-jacques', 'Do Re Mi Do Do Re Mi Do'),
      // Where the notes live.
      fact.note(5, 0, 'E'),
      fact.note(5, 1, 'F'),
      fact.note(5, 3, 'G'),
      fact.note(4, 1, 'C'),
      fact.note(4, 3, 'D'),
      fact.note(4, 5, 'E'),
      // Bar 4: E held 1.5 beats, a quick D, then D for two beats.
      fact.songEvent('ode-to-joy', 12, 5, 0, 1.5),
      fact.songEvent('ode-to-joy', 13.5, 4, 3, 0.5),
      fact.songEvent('ode-to-joy', 14, 4, 3, 2),
      fact.checkFret('Which fret of the B (Si) string is D (Re)?', 4, 'D'),
    ],
  },
  {
    lesson: 'twinkle-and-jacques',
    facts: [
      fact.melody('twinkle-twinkle', 'Do Do Sol Sol La La Sol'),
      // "Do up to Sol is a leap": a perfect fifth, seven semitones.
      fact.interval('C4', 'G4', 'P5'),
      fact.note(4, 1, 'C'),
      fact.note(5, 3, 'G'),
      fact.note(5, 4, 'G#'),
      fact.note(5, 5, 'A'),
      fact.checkFret('Which fret of the high E (Mi) string is A (La)?', 5, 'A'),
      // The whole of Frère Jacques, phrase by phrase, each played twice.
      fact.melody(
        'frere-jacques',
        'Do Re Mi Do Do Re Mi Do Mi Fa Sol Mi Fa Sol Sol La Sol Fa Mi Do Sol La Sol Fa Mi Do Do Sol Do Do Sol Do',
      ),
      // "The final Sol is the open G string, below the Do."
      fact.songEvent('frere-jacques', 25, 3, 0, 1),
      fact.songEvent('frere-jacques', 24, 4, 1, 1),
      // The listen target: Do Re Mi Do.
      fact.note(4, 1, 'C'),
      fact.note(4, 3, 'D'),
      fact.note(5, 0, 'E'),
    ],
  },
  {
    lesson: 'note-lengths',
    facts: [
      fact.beats('whole', 4),
      fact.beats('half', 2),
      fact.beats('quarter', 1),
      fact.beats('eighth', 0.5),
      fact.beats('dotted half', 3),
      fact.beats('dotted quarter', 1.5),
      fact.fits('eighth', 8),
      fact.fits('quarter', 4),
      fact.fits('half', 2),
      // The rhythm ladder: one note, two, four, then eight in a bar.
      fact.riffEvent('rhythm-ladder', 0, 3, 0, 4),
      fact.riffEvent('rhythm-ladder', 4, 3, 0, 2),
      fact.riffEvent('rhythm-ladder', 6, 3, 0, 2),
      fact.riffEvent('rhythm-ladder', 8, 3, 0, 1),
      fact.riffEvent('rhythm-ladder', 11, 3, 0, 1),
      fact.riffEvent('rhythm-ladder', 12, 3, 0, 0.5),
      fact.riffEvent('rhythm-ladder', 15.5, 3, 0, 0.5),
      // Jingle Bells bar 3: E on 1, G on 2, a dotted-quarter C on 3, a quick D on the "&" of 4.
      fact.songEvent('jingle-bells', 8, 5, 0, 1),
      fact.songEvent('jingle-bells', 9, 5, 3, 1),
      fact.songEvent('jingle-bells', 10, 4, 1, 1.5),
      fact.songEvent('jingle-bells', 11.5, 4, 3, 0.5),
    ],
  },
];
