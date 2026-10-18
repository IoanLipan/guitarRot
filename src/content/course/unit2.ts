import type { Lesson } from '../lessons';

const UNIT = 'Notes and the musical alphabet';

/** Positions on one string, as a list of frets. */
const onString = (stringIndex: number, frets: readonly number[]) =>
  frets.map((fret) => ({ stringIndex, fret }));

/** Lessons 5-9: the notes of the neck, learned by landmarks rather than by counting. */
export const UNIT_2: readonly Lesson[] = [
  {
    id: 'alphabet',
    unit: UNIT,
    title: 'The musical alphabet',
    goal: 'Recite the seven note names and know where the half steps hide.',
    steps: [
      {
        kind: 'text',
        title: 'Seven letters, seven syllables',
        body: [
          'Music uses seven note names: A (La), B (Si), C (Do), D (Re), E (Mi), F (Fa), G (Sol). After G (Sol) the alphabet starts over at A (La), an octave higher.',
          'Each letter keeps its syllable in every key. This is called fixed-do: C (Do) is always Do, D (Re) is always Re. Starting from C (Do), the same seven notes read Do Re Mi Fa Sol La Si, the ladder behind most melodies.',
        ],
      },
      {
        kind: 'text',
        title: 'Half steps and whole steps',
        body: [
          'The smallest step on the guitar is one fret. It is called a half step, or semitone. Two frets make a whole step.',
          'Most neighbouring letters are a whole step apart: two frets. Two pairs are only a half step apart, one fret: E (Mi) to F (Fa), and B (Si) to C (Do). There is no note in between.',
          'On a piano these are the pairs with no black key between them.',
        ],
      },
      {
        kind: 'fretboard',
        caption:
          'Every natural note on the A (La) string. Count the frets between neighbours: two nearly everywhere, but only one from B (Si) to C (Do) and from E (Mi) to F (Fa).',
        fretRange: [0, 12],
        positions: onString(1, [0, 2, 3, 5, 7, 8, 10, 12]),
        tapToHear: true,
      },
      {
        kind: 'listen',
        caption:
          'Climb from the open A (La) string: two frets to the next note, then one more fret. Listen to the size of each step.',
        targets: onString(1, [0, 2, 3]),
      },
      {
        kind: 'check',
        question: 'Which pair of notes is only one fret apart?',
        options: [
          'E (Mi) and F (Fa)',
          'C (Do) and D (Re)',
          'F (Fa) and G (Sol)',
          'A (La) and B (Si)',
        ],
        answer: 'E (Mi) and F (Fa)',
        explain:
          'E (Mi) to F (Fa) and B (Si) to C (Do) are the only natural neighbours one fret apart. Every other pair of neighbours is two frets apart.',
      },
      {
        kind: 'check',
        question: 'How many frets up is it from C (Do) to D (Re)?',
        options: ['1 fret', '2 frets', '3 frets', '4 frets'],
        answer: '2 frets',
        explain: 'C (Do) to D (Re) is a whole step, which is two frets. The C# (Do#) sits between them.',
      },
      {
        kind: 'check',
        question: 'What comes after G (Sol) in the musical alphabet?',
        options: ['A (La)', 'B (Si)', 'F (Fa)', 'C (Do)'],
        answer: 'A (La)',
        explain: 'The alphabet only runs from A (La) to G (Sol), then loops back to A (La), one octave higher.',
      },
    ],
  },
  {
    id: 'sharps-flats',
    unit: UNIT,
    title: 'Sharps and flats',
    goal: 'Name any fret on the low E (Mi) string, including sharps and flats.',
    steps: [
      {
        kind: 'text',
        title: 'The notes in between',
        body: [
          'Most neighbouring letters have one more note between them. A sharp (#) raises a note by one fret. A flat (b) lowers a note by one fret.',
          'The fret between C (Do) and D (Re) is C# (Do#), one fret above C (Do). It is also Db (Reb), one fret below D (Re). Same fret, two names. Which name a song uses depends on its key; for now just know both.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'Every fret of the low E (Mi) string from open to the 12th. Tap along and listen to each half step.',
        fretRange: [0, 12],
        positions: onString(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        tapToHear: true,
      },
      {
        kind: 'text',
        title: 'Twelve notes, then it repeats',
        body: [
          'Count up from any note and after 12 frets you reach the same note name again, one octave higher. There are only twelve different notes; the whole neck is those twelve repeating.',
          'E (Mi) and F (Fa) have no sharp between them, and neither have B (Si) and C (Do): they are already one fret apart.',
        ],
      },
      {
        kind: 'listen',
        caption:
          'Climb the low E (Mi) string one fret at a time: open, then frets 1, 2 and 3. Each step is a half step.',
        targets: onString(0, [0, 1, 2, 3]),
      },
      {
        kind: 'check',
        question: 'You play C (Do), then move up one fret. Which note do you land on?',
        options: ['C# (Do#)', 'D (Re)', 'B (Si)', 'E (Mi)'],
        answer: 'C# (Do#)',
        explain: 'A sharp is one fret up, so C# (Do#) is the very next fret. D (Re) is two frets up from C (Do).',
      },
      {
        kind: 'check',
        question: 'Which note is one fret below B (Si)?',
        options: ['Bb (Sib)', 'A (La)', 'C (Do)', 'G# (Sol#)'],
        answer: 'Bb (Sib)',
        explain: 'A flat is one fret down. A (La) is two frets below B (Si), with Bb (Sib) in between.',
      },
      {
        kind: 'check',
        question: 'Which pair of names belongs to the same fret?',
        options: [
          'G# (Sol#) and Ab (Lab)',
          'G (Sol) and Ab (Lab)',
          'G# (Sol#) and A (La)',
          'Ab (Lab) and A# (La#)',
        ],
        answer: 'G# (Sol#) and Ab (Lab)',
        explain:
          'G# (Sol#) is one fret above G (Sol) and Ab (Lab) is one fret below A (La), and those are the same fret. The other pairs are one or two frets apart.',
      },
    ],
  },
  {
    id: 'low-e-notes',
    unit: UNIT,
    title: 'The low E (Mi) string',
    goal: 'Find the natural notes on the thickest string using landmarks, without counting up from the nut.',
    steps: [
      {
        kind: 'text',
        title: 'Learn landmarks, not twelve frets',
        body: [
          'On the thickest string the natural notes sit at frets 0, 1, 3, 5, 7, 8, 10 and 12. Fret 0 is E (Mi) and fret 1 is F (Fa). Then frets 3, 5 and 7 are G (Sol), A (La), B (Si), and frets 8, 10 and 12 are C (Do), D (Re), E (Mi).',
          'The one-fret gaps are the ones you already know: E (Mi) to F (Fa) at the start, and B (Si) to C (Do) at frets 7 and 8.',
          'Use the dots on the side of the neck as signposts. Most guitars mark frets 3, 5, 7, 9 and 12, with a double dot at 12.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'The landmarks on the thickest string. Tap each one and say its name.',
        fretRange: [0, 12],
        positions: onString(0, [0, 1, 3, 5, 7, 8, 10, 12]),
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'low-e-landmarks',
        caption:
          'All on the thickest string. Say the names as you play: Mi Sol La Si, Do Re Mi. Use the dots on the neck instead of counting.',
      },
      {
        kind: 'listen',
        caption: 'Find each note from the landmarks, without counting up from the nut.',
        targets: onString(0, [3, 5, 8]),
      },
      { kind: 'drill', strings: [0], fretRange: [0, 12], count: 6 },
      {
        kind: 'check',
        question: 'Which fret of the low E (Mi) string is C (Do)?',
        options: ['Fret 8', 'Fret 7', 'Fret 10', 'Fret 5'],
        answer: 'Fret 8',
        explain: 'B (Si) is fret 7 and C (Do) comes one fret later, at fret 8. D (Re) is fret 10.',
      },
      {
        kind: 'check',
        question: 'Which note sits at fret 10 of the low E (Mi) string?',
        options: ['D (Re)', 'C (Do)', 'E (Mi)', 'B (Si)'],
        answer: 'D (Re)',
        explain: 'Fret 8 is C (Do), fret 10 is D (Re) and fret 12 is E (Mi) again.',
      },
    ],
  },
  {
    id: 'a-string-notes',
    unit: UNIT,
    title: 'The A (La) string',
    goal: 'Find the natural notes on the A (La) string and see that the same alphabet sits in a new place.',
    steps: [
      {
        kind: 'text',
        title: 'Same alphabet, new places',
        body: [
          'The A (La) string holds the same notes in different spots. Its landmarks: fret 0 is A (La), 2 is B (Si), 3 is C (Do), 5 is D (Re), 7 is E (Mi), 8 is F (Fa), 10 is G (Sol), and 12 is A (La) again.',
          'The half steps fall in new places: B (Si) to C (Do) at frets 2 and 3, and E (Mi) to F (Fa) at frets 7 and 8. Frets 7 and 8 are a half step on both strings, which is a handy thing to remember.',
          'Remember the tuning trick too: fret 5 of the low E (Mi) string is A (La), the open string next door.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'The same alphabet on two strings. Compare where the half steps fall on each.',
        fretRange: [0, 12],
        positions: [...onString(0, [0, 1, 3, 5, 7, 8, 10, 12]), ...onString(1, [0, 2, 3, 5, 7, 8, 10, 12])],
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'a-string-landmarks',
        caption:
          'The same job as last time, one string over. Say the names: La Si Do Re, Mi Fa Sol La. Use the dots to find 5, 7, 10 and 12.',
      },
      { kind: 'drill', strings: [1], fretRange: [0, 12], count: 6 },
      {
        kind: 'check',
        question: 'Which fret of the A (La) string is D (Re)?',
        options: ['Fret 5', 'Fret 3', 'Fret 7', 'Fret 10'],
        answer: 'Fret 5',
        explain: 'A (La) is open, B (Si) is fret 2, C (Do) is fret 3, and D (Re) is fret 5.',
      },
      {
        kind: 'check',
        question: 'Which note sits at fret 7 of the A (La) string?',
        options: ['E (Mi)', 'D (Re)', 'F (Fa)', 'B (Si)'],
        answer: 'E (Mi)',
        explain: 'D (Re) is fret 5, E (Mi) is fret 7 and F (Fa) is fret 8, right after it.',
      },
      {
        kind: 'check',
        question: 'Which pair of notes on the A (La) string is only a half step apart?',
        options: [
          'B (Si) and C (Do)',
          'C (Do) and D (Re)',
          'D (Re) and E (Mi)',
          'F (Fa) and G (Sol)',
        ],
        answer: 'B (Si) and C (Do)',
        explain:
          'B (Si) at fret 2 and C (Do) at fret 3 are neighbouring frets. The other pairs are two frets apart.',
      },
    ],
  },
  {
    id: 'octaves',
    unit: UNIT,
    title: 'Octaves',
    goal: 'Find the same note an octave higher with the two-strings-up, two-frets-up shape.',
    steps: [
      {
        kind: 'text',
        title: 'The same note, higher',
        body: [
          'An octave is the distance from a note to the next note with the same name. The two sound like one note at two heights: sing one and the other blends in.',
          'Along one string, 12 frets up is always an octave. The open low E (Mi) string and fret 12 of the same string are octave twins.',
        ],
      },
      {
        kind: 'text',
        title: 'A shortcut across strings',
        body: [
          'Start on a note on string 6 or string 5. Go two strings thinner and two frets higher: that is the same note, one octave up. G (Sol) at fret 3 of the low E (Mi) string has its twin at fret 5 of the D (Re) string.',
          'The shape works from the two thickest strings only. Higher up, the gap between the G (Sol) and B (Si) strings is a fret smaller, so the shape needs three frets instead of two.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'Two octave pairs. The higher note is always two strings thinner and two frets higher.',
        fretRange: [0, 6],
        positions: [
          { stringIndex: 0, fret: 3 },
          { stringIndex: 2, fret: 5 },
          { stringIndex: 1, fret: 3 },
          { stringIndex: 3, fret: 5 },
        ],
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'octave-hop',
        caption:
          'G (Sol) and its octave, C (Do) and its octave, then A (La) and D (Re) the same way. Each note lasts two beats, so listen for the same name sounding higher.',
      },
      {
        kind: 'listen',
        caption: 'Play G (Sol) low, then find its octave using the shape.',
        targets: [
          { stringIndex: 0, fret: 3 },
          { stringIndex: 2, fret: 5 },
        ],
      },
      {
        kind: 'check',
        question:
          'You are on fret 5 of the low E (Mi) string: A (La). Where is A (La) one octave higher, using the shape?',
        options: [
          'Fret 7 of the D (Re) string',
          'Fret 5 of the D (Re) string',
          'Fret 7 of the A (La) string',
          'Fret 7 of the G (Sol) string',
        ],
        answer: 'Fret 7 of the D (Re) string',
        explain:
          'Two strings thinner is the D (Re) string, and two frets higher is fret 7. Fret 5 of the D (Re) string is G (Sol).',
      },
      {
        kind: 'check',
        question: 'How many frets up the same string is an octave?',
        options: ['7 frets', '10 frets', '12 frets', '24 frets'],
        answer: '12 frets',
        explain: 'Twelve frets up the same string gives the same note name an octave higher.',
      },
      {
        kind: 'check',
        question: 'The two-strings-up, two-frets-up shape works when you start on…',
        options: [
          'The low E (Mi) or A (La) string',
          'The G (Sol) or B (Si) string',
          'Any string',
          'Open strings only',
        ],
        answer: 'The low E (Mi) or A (La) string',
        explain:
          'From the D (Re) and G (Sol) strings the same octave needs three frets, because the gap between the G (Sol) and B (Si) strings is smaller.',
      },
    ],
  },
];
