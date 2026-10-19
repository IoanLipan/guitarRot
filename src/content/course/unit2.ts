import type { Lesson } from '../lessons';
import { onString } from './visuals';

const UNIT = 'Notes and the musical alphabet';

/** Lessons 5-9: the notes of the neck, learned by landmarks rather than by counting. */
export const UNIT_2: readonly Lesson[] = [
  {
    id: 'alphabet',
    unit: UNIT,
    title: 'The musical alphabet',
    goal: 'Recite the seven note names and know where the half steps hide.',
    steps: [
      {
        kind: 'explain',
        headline: 'Seven letters, then repeat',
        visual: { kind: 'illustration', name: 'alphabet-loop' },
        points: [
          'Music has ==seven note names==: A (La) to G (Sol).',
          'After G (Sol), the alphabet **starts over** at A (La), one octave higher.',
        ],
      },
      {
        kind: 'explain',
        headline: 'One letter, one syllable',
        visual: { kind: 'notes', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
        points: [
          'This is **fixed-do**: C (Do) is always Do, D (Re) is always Re.',
          'Start on C (Do) and read ==Do Re Mi Fa Sol La Si==, the ladder behind most melodies.',
        ],
      },
      {
        kind: 'explain',
        headline: '1 fret = half, 2 frets = whole',
        visual: {
          kind: 'neck',
          fretRange: [0, 3],
          dots: onString(1, [0, 1, 2]),
          highlightStrings: [1],
          tapToHear: true,
        },
        points: [
          'The smallest step is **one fret**: a half step (semitone).',
          'Two frets make a ==whole step==.',
          'Most neighbouring letters are a whole step apart.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Two spots are only 1 fret',
        visual: { kind: 'illustration', name: 'piano-half-steps' },
        points: [
          'Two pairs of neighbours are only **one fret** apart: E (Mi) to F (Fa), and B (Si) to C (Do).',
          '==No note fits between them.== On a piano, no black key sits there.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'Natural notes on the A (La) string. **Two frets** between neighbours, but only **one** for B (Si)-C (Do) and E (Mi)-F (Fa).',
        fretRange: [0, 12],
        positions: onString(1, [0, 2, 3, 5, 7, 8, 10, 12]),
        tapToHear: true,
      },
      {
        kind: 'listen',
        caption: 'Climb from the open A (La) string: **two frets** to the next note, then **one more**. Hear the size of each step.',
        targets: onString(1, [0, 2, 3]),
      },
      {
        kind: 'check',
        question: 'Which pair of notes is only one fret apart?',
        options: ['E (Mi) and F (Fa)', 'C (Do) and D (Re)', 'F (Fa) and G (Sol)', 'A (La) and B (Si)'],
        answer: 'E (Mi) and F (Fa)',
        explain: 'E (Mi)-F (Fa) and B (Si)-C (Do) are the **only** natural neighbours one fret apart. All others are two.',
      },
      {
        kind: 'check',
        question: 'How many frets up is it from C (Do) to D (Re)?',
        options: ['1 fret', '2 frets', '3 frets', '4 frets'],
        answer: '2 frets',
        explain: 'C (Do) to D (Re) is a **whole step**: two frets. C# (Do#) sits between them.',
      },
      {
        kind: 'check',
        question: 'What comes after G (Sol) in the musical alphabet?',
        options: ['A (La)', 'B (Si)', 'F (Fa)', 'C (Do)'],
        answer: 'A (La)',
        explain: 'The alphabet runs A (La) to G (Sol), then ==loops back== to A (La), one octave higher.',
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
        kind: 'explain',
        headline: 'Sharp = up, flat = down',
        visual: { kind: 'illustration', name: 'sharp-flat' },
        points: [
          'A **sharp (#)** raises a note one fret. A flat (b) lowers it one fret.',
          'C# (Do#) and Db (Reb) are ==the same fret==: one fret, two names.',
        ],
        tip: 'Which name a song uses depends on its key. For now, know both.',
      },
      {
        kind: 'explain',
        headline: '12 frets later, same note',
        visual: {
          kind: 'neck',
          fretRange: [0, 12],
          dots: [
            { stringIndex: 0, fret: 0 },
            { stringIndex: 0, fret: 12 },
          ],
          highlightStrings: [0],
          tapToHear: true,
        },
        points: [
          'Count up **12 frets** and the note name repeats, one octave higher.',
          'There are only ==12 different notes==. The whole neck repeats them.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'Every fret of the low E (Mi) string, open to 12. **Tap along** and hear each half step.',
        fretRange: [0, 12],
        positions: onString(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        tapToHear: true,
      },
      {
        kind: 'explain',
        headline: 'No sharp: E (Mi)-F (Fa), B (Si)-C (Do)',
        visual: {
          kind: 'neck',
          fretRange: [0, 8],
          dots: onString(0, [0, 1, 7, 8]),
          highlightStrings: [0],
          tapToHear: true,
        },
        points: [
          'E (Mi) and F (Fa) are already **one fret** apart. Nothing fits between.',
          'Same for B (Si) and C (Do): ==frets 7 and 8==.',
        ],
      },
      {
        kind: 'listen',
        caption: 'Climb the low E (Mi) string one fret at a time: open, then frets 1, 2, 3. **Every step is a half step.**',
        targets: onString(0, [0, 1, 2, 3]),
      },
      {
        kind: 'check',
        question: 'You play C (Do), then move up one fret. Which note do you land on?',
        options: ['C# (Do#)', 'D (Re)', 'B (Si)', 'E (Mi)'],
        answer: 'C# (Do#)',
        explain: 'A sharp is **one fret up**, so C# (Do#) is the very next fret. D (Re) is two frets up.',
      },
      {
        kind: 'check',
        question: 'Which note is one fret below B (Si)?',
        options: ['Bb (Sib)', 'A (La)', 'C (Do)', 'G# (Sol#)'],
        answer: 'Bb (Sib)',
        explain: 'A flat is **one fret down**. A (La) is two frets below B (Si), with Bb (Sib) in between.',
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
        explain: 'G# (Sol#) is one fret above G (Sol). Ab (Lab) is one below A (La). Same fret, **two names**.',
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
        kind: 'explain',
        headline: 'Use the dots as signposts',
        visual: {
          kind: 'neck',
          fretRange: [0, 12],
          dots: [3, 5, 7, 9, 12].map((fret) => ({ stringIndex: 0, fret, label: String(fret) })),
          highlightStrings: [0],
        },
        points: [
          'Most guitars mark **frets 3, 5, 7, 9 and 12** with dots on the neck.',
          'Fret 12 gets a double dot.',
          '==Look for the dots== instead of counting frets.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Eight landmarks, eight notes',
        visual: { kind: 'notes', notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E'] },
        points: [
          'Fret 0 is E (Mi). Fret 1 is F (Fa).',
          'Frets 3, 5, 7 are G (Sol), A (La), B (Si).',
          'Frets 8, 10, 12 are C (Do), D (Re), E (Mi).',
        ],
        tip: 'Learn these eight frets: ==0, 1, 3, 5, 7, 8, 10, 12==.',
      },
      {
        kind: 'explain',
        headline: 'B (Si) to C (Do): frets 7 and 8',
        visual: {
          kind: 'neck',
          fretRange: [5, 10],
          dots: onString(0, [7, 8]),
          highlightStrings: [0],
          tapToHear: true,
        },
        points: [
          'Frets 7 and 8 sit side by side: **one fret**, a half step.',
          'The other one-fret gap is at the start: E (Mi) to F (Fa), frets 0 and 1.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'The landmarks on the thickest string. **Tap each one and say its name.**',
        fretRange: [0, 12],
        positions: onString(0, [0, 1, 3, 5, 7, 8, 10, 12]),
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'low-e-landmarks',
        caption: 'All on the thickest string. Say it: Mi Sol La Si, Do Re Mi. **Use the dots**, don\'t count.',
      },
      {
        kind: 'listen',
        caption: 'Find each note from the landmarks, **without counting up from the nut**.',
        targets: onString(0, [3, 5, 8]),
      },
      { kind: 'drill', strings: [0], fretRange: [0, 12], count: 6 },
      {
        kind: 'check',
        question: 'Which fret of the low E (Mi) string is C (Do)?',
        options: ['Fret 8', 'Fret 7', 'Fret 10', 'Fret 5'],
        answer: 'Fret 8',
        explain: 'B (Si) is fret 7, and C (Do) is **one fret later**: fret 8. D (Re) is fret 10.',
      },
      {
        kind: 'check',
        question: 'Which note sits at fret 10 of the low E (Mi) string?',
        options: ['D (Re)', 'C (Do)', 'E (Mi)', 'B (Si)'],
        answer: 'D (Re)',
        explain: 'Fret 8 is C (Do), **fret 10** is D (Re), and fret 12 is E (Mi) again.',
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
        kind: 'explain',
        headline: 'Same notes, new places',
        visual: { kind: 'notes', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'] },
        points: [
          'Frets 0, 2, 3, 5 are A (La), B (Si), C (Do), D (Re).',
          'Frets 7, 8, 10, 12 are E (Mi), F (Fa), G (Sol), A (La).',
        ],
        tip: 'Handy: ==fret 5== of the low E (Mi) string is the open A (La) string next door.',
      },
      {
        kind: 'explain',
        headline: 'Half steps in new spots',
        visual: {
          kind: 'neck',
          fretRange: [5, 10],
          dots: [...onString(0, [7, 8]), ...onString(1, [7, 8])],
          highlightStrings: [0, 1],
          tapToHear: true,
        },
        points: [
          'Frets 7 and 8 are ==a half step== on both strings.',
          'Low E (Mi) string: B (Si) to C (Do). A (La) string: E (Mi) to F (Fa).',
          'The A (La) string also has B (Si) to C (Do) at frets 2 and 3.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'The same alphabet on two strings. **Compare where the half steps fall** on each.',
        fretRange: [0, 12],
        positions: [...onString(0, [0, 1, 3, 5, 7, 8, 10, 12]), ...onString(1, [0, 2, 3, 5, 7, 8, 10, 12])],
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'a-string-landmarks',
        caption: 'The same job, one string over: La Si Do Re, Mi Fa Sol La. **Use the dots** to find 5, 7, 10 and 12.',
      },
      { kind: 'drill', strings: [1], fretRange: [0, 12], count: 6 },
      {
        kind: 'check',
        question: 'Which fret of the A (La) string is D (Re)?',
        options: ['Fret 5', 'Fret 3', 'Fret 7', 'Fret 10'],
        answer: 'Fret 5',
        explain: 'Open A (La), B (Si) at fret 2, C (Do) at fret 3, then D (Re) at **fret 5**.',
      },
      {
        kind: 'check',
        question: 'Which note sits at fret 7 of the A (La) string?',
        options: ['E (Mi)', 'D (Re)', 'F (Fa)', 'B (Si)'],
        answer: 'E (Mi)',
        explain: 'D (Re) is fret 5. Then **fret 7** is E (Mi) and fret 8 is F (Fa), right after it.',
      },
      {
        kind: 'check',
        question: 'Which pair of notes on the A (La) string is only a half step apart?',
        options: ['B (Si) and C (Do)', 'C (Do) and D (Re)', 'D (Re) and E (Mi)', 'F (Fa) and G (Sol)'],
        answer: 'B (Si) and C (Do)',
        explain: 'B (Si) at fret 2 and C (Do) at fret 3 are **neighbouring frets**. The other pairs are two frets apart.',
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
        kind: 'explain',
        headline: 'Octave: same name, higher',
        visual: {
          kind: 'neck',
          fretRange: [0, 12],
          dots: [
            { stringIndex: 1, fret: 0 },
            { stringIndex: 1, fret: 12 },
          ],
          highlightStrings: [1],
          tapToHear: true,
        },
        points: [
          'An **octave** is the next note with the same name.',
          'Play both: they blend like one note at two heights.',
          'On one string, ==12 frets up== is always an octave.',
        ],
      },
      {
        kind: 'explain',
        headline: 'A shortcut across strings',
        visual: { kind: 'illustration', name: 'octave-shape' },
        points: [
          '==Two strings up, two frets up== gives the same note, one octave higher.',
          'Start on string 6 or 5. Example: G (Sol), fret 3 of string 6 → fret 5 of string 4.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'Two octave pairs. The higher note is always **two strings thinner** and **two frets higher**.',
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
        kind: 'explain',
        headline: 'Higher up, it takes 3 frets',
        visual: {
          kind: 'neck',
          fretRange: [0, 3],
          dots: [
            { stringIndex: 2, fret: 0 },
            { stringIndex: 4, fret: 3 },
            { stringIndex: 3, fret: 0 },
            { stringIndex: 5, fret: 3 },
          ],
          highlightStrings: [2, 3, 4, 5],
          tapToHear: true,
        },
        points: [
          'The gap between the G (Sol) and B (Si) strings is **one fret smaller**.',
          'From the D (Re) or G (Sol) string: two strings up, ==three frets== higher.',
        ],
        warn: 'The 2-fret shape here lands one fret too low.',
      },
      {
        kind: 'riff',
        riffId: 'octave-hop',
        caption: 'G (Sol) and its octave, C (Do) and its octave, then A (La) and D (Re). **Two beats each**: hear the same name, higher.',
      },
      {
        kind: 'listen',
        caption: 'Play G (Sol) low, then **find its octave** with the shape.',
        targets: [
          { stringIndex: 0, fret: 3 },
          { stringIndex: 2, fret: 5 },
        ],
      },
      {
        kind: 'check',
        question: 'You are on fret 5 of the low E (Mi) string: A (La). Where is A (La) one octave higher, using the shape?',
        options: [
          'Fret 7 of the D (Re) string',
          'Fret 5 of the D (Re) string',
          'Fret 7 of the A (La) string',
          'Fret 7 of the G (Sol) string',
        ],
        answer: 'Fret 7 of the D (Re) string',
        explain: 'Two strings thinner is the D (Re) string, two frets higher is **fret 7**. Fret 5 there is G (Sol).',
      },
      {
        kind: 'check',
        question: 'How many frets up the same string is an octave?',
        options: ['7 frets', '10 frets', '12 frets', '24 frets'],
        answer: '12 frets',
        explain: 'Twelve frets up the same string gives the **same name**, one octave higher.',
      },
      {
        kind: 'check',
        question: 'The two-strings-up, two-frets-up shape works when you start on…',
        options: ['The low E (Mi) or A (La) string', 'The G (Sol) or B (Si) string', 'Any string', 'Open strings only'],
        answer: 'The low E (Mi) or A (La) string',
        explain: 'From the D (Re) and G (Sol) strings the octave needs **three frets**: the G (Sol)-B (Si) gap is smaller.',
      },
    ],
  },
];
