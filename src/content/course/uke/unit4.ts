import type { Lesson } from '../../lessons';
import { onString } from '../visuals';

const UNIT = 'Notes and melody';

/** String indices: 0 = G, 1 = C, 2 = E, 3 = A. */
const E_STRING = 2;
const A_STRING = 3;

/** Lessons 15-18: the notes of the E and A strings, tab, a first picking pattern, a first melody. */
export const UKE_UNIT_4: readonly Lesson[] = [
  {
    id: 'uke-notes',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Notes on the E (Mi) and A (La) strings',
    goal: 'Name the natural notes on the E (Mi) and A (La) strings and find them by the fret dots.',
    steps: [
      {
        kind: 'explain',
        headline: 'Seven letters, then repeat',
        visual: { kind: 'illustration', name: 'alphabet-loop' },
        points: [
          'Music has ==seven note names==: A (La) to G (Sol).',
          'After G (Sol) the alphabet **starts over** at A (La), one octave higher.',
        ],
      },
      {
        kind: 'explain',
        headline: '1 fret = half, 2 frets = whole',
        visual: {
          kind: 'neck',
          fretRange: [0, 3],
          dots: onString(E_STRING, [0, 1, 2]),
          highlightStrings: [E_STRING],
          tapToHear: true,
        },
        points: [
          'The smallest step is **one fret**: a half step.',
          'Two frets make a ==whole step==.',
          'E (Mi) to F (Fa) is one fret: no note fits between.',
        ],
      },
      {
        kind: 'explain',
        headline: 'The A (La) string: five notes',
        visual: {
          kind: 'neck',
          fretRange: [0, 7],
          dots: onString(A_STRING, [0, 2, 3, 5, 7]),
          highlightStrings: [A_STRING],
          tapToHear: true,
        },
        points: [
          'Frets 0, 2, 3, 5, 7 are A (La), B (Si), C (Do), D (Re), E (Mi).',
          'B (Si) to C (Do) is the one-fret step: frets **2 and 3**.',
        ],
        tip: 'Most ukuleles have dots at frets 5, 7, 10 and 12. ==Use them.==',
      },
      {
        kind: 'fretboard',
        caption: 'The A (La) string. **Tap each dot** and say its name: La Si Do Re Mi.',
        fretRange: [0, 7],
        positions: onString(A_STRING, [0, 2, 3, 5, 7]),
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'uke-a-string-landmarks',
        caption: 'La Si Do Re Mi, and back. **Use the dots** to find fret 5 and fret 7.',
      },
      {
        kind: 'explain',
        headline: 'The E (Mi) string: four notes',
        visual: {
          kind: 'neck',
          fretRange: [0, 5],
          dots: onString(E_STRING, [0, 1, 3, 5]),
          highlightStrings: [E_STRING],
          tapToHear: true,
        },
        points: [
          'Frets 0, 1, 3, 5 are E (Mi), F (Fa), G (Sol), A (La).',
          'Fret 1 is the ==half step== E (Mi)-F (Fa). Fret 3 skips F# (Fa#).',
        ],
        tip: 'Fret 5 of the E (Mi) string is the open A (La) string next door.',
      },
      {
        kind: 'riff',
        riffId: 'uke-e-string-landmarks',
        caption: 'Mi Fa Sol La, and back. **Say the names** as you play them.',
      },
      {
        kind: 'listen',
        caption: 'Find **fret 3** of the E (Mi) string, then **fret 2** of the A (La) string. No mic? Skip it.',
        targets: [
          { stringIndex: E_STRING, fret: 3 },
          { stringIndex: A_STRING, fret: 2 },
        ],
      },
      { kind: 'drill', strings: [E_STRING, A_STRING], fretRange: [0, 7], count: 6 },
      {
        kind: 'check',
        question: 'Which fret of the A (La) string is D (Re)?',
        options: ['Fret 5', 'Fret 3', 'Fret 7', 'Fret 10'],
        answer: 'Fret 5',
        explain: 'Open A (La), B (Si) at fret 2, C (Do) at fret 3, then D (Re) at **fret 5**.',
      },
      {
        kind: 'check',
        question: 'Which note sits at fret 3 of the E (Mi) string?',
        options: ['G (Sol)', 'F (Fa)', 'A (La)', 'F# (Fa#)'],
        answer: 'G (Sol)',
        explain: 'F (Fa) is fret 1, F# (Fa#) is fret 2, and **fret 3** is G (Sol).',
      },
      {
        kind: 'check',
        question: 'Which pair of notes on the A (La) string is only a half step apart?',
        options: ['B (Si) and C (Do)', 'C (Do) and D (Re)', 'D (Re) and E (Mi)', 'A (La) and B (Si)'],
        answer: 'B (Si) and C (Do)',
        explain: 'B (Si) at fret 2 and C (Do) at fret 3 are **neighbouring frets**. The other pairs are two frets apart.',
      },
    ],
  },
  {
    id: 'uke-tab',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Reading ukulele tab',
    goal: 'Read a line of tab, with its four lines, and play it one string at a time.',
    steps: [
      {
        kind: 'explain',
        headline: 'Tab: four lines, four strings',
        visual: { kind: 'illustration', name: 'uke-tab-map' },
        points: [
          'One line per string. The **top line** is string 1, the A (La) string.',
          'The ==bottom line== is string 4, the G (Sol) string.',
          'Read left to right, like a sentence.',
        ],
      },
      {
        kind: 'explain',
        headline: 'A number is a fret',
        visual: {
          kind: 'neck',
          fretRange: [0, 4],
          dots: [
            { stringIndex: A_STRING, fret: 0, label: '0' },
            { stringIndex: A_STRING, fret: 3, label: '3' },
          ],
          highlightStrings: [A_STRING],
        },
        points: [
          'The number on a line is the **fret** to press on that string.',
          '==0 = open string==: no finger down.',
        ],
        tip: 'Numbers stacked in one column are played together: that is a chord.',
      },
      {
        kind: 'explain',
        headline: 'The one catch: the high G (Sol)',
        visual: { kind: 'illustration', name: 'uke-reentrant' },
        points: [
          'The bottom line, G (Sol), sounds ==higher than C (Do)==, the line above it.',
          'Tab shows **where** to play, not how high it sounds.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-c-four-downs',
        caption: 'A stacked column is a chord: 0 0 0 3 is C (Do). **Follow the tab** as it plays.',
      },
      {
        kind: 'explain',
        headline: 'One finger per fret',
        visual: { kind: 'illustration', name: 'finger-numbers' },
        points: [
          '==Index = fret 1, middle = 2, ring = 3, pinky = 4.==',
          'Curve your fingers so only the **tips** touch the strings.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-e-string-landmarks',
        caption: 'One line only: the E (Mi) string. The numbers 0 1 3 5 are the frets. **Pluck as it plays.**',
      },
      {
        kind: 'listen',
        caption: 'Play what the tab says: **0** on the E (Mi) string, then **fret 3**. No mic? Skip it.',
        targets: [
          { stringIndex: E_STRING, fret: 0 },
          { stringIndex: E_STRING, fret: 3 },
        ],
      },
      {
        kind: 'check',
        question: 'In ukulele tab, which line is the A (La) string?',
        options: ['The top line', 'The bottom line', 'The second line from the top', 'The second line from the bottom'],
        answer: 'The top line',
        explain: '**Top line** = string 1, the A (La) string. The bottom line is the G (Sol) string.',
      },
      {
        kind: 'check',
        question: 'What does a 0 on a tab line mean?',
        options: [
          'Play that string open, with no finger on it',
          'Do not play that string',
          'Press that string at the first fret',
          'Mute the string with your palm',
        ],
        answer: 'Play that string open, with no finger on it',
        explain: 'The number is the fret you press. Fret **0** is no fret at all: the open string.',
      },
      {
        kind: 'check',
        question: 'The bottom line of the tab is the G (Sol) string. How does it sound next to the C (Do) line above it?',
        options: [
          'Higher, because of re-entrant tuning',
          'Lower, as the bottom line does on a guitar',
          'The same note',
          'It changes with the song',
        ],
        answer: 'Higher, because of re-entrant tuning',
        explain: 'The open G (Sol) is ==higher than the open C (Do)==. The bottom line is a string, not a pitch.',
      },
    ],
  },
  {
    id: 'uke-fingerpicking',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Your first fingerpicking pattern',
    goal: 'Fingerpick a steady pattern with thumb, index and middle, and use it in a slow song.',
    steps: [
      {
        kind: 'explain',
        headline: 'Thumb, index, middle',
        visual: { kind: 'illustration', name: 'uke-fingerpicking' },
        points: [
          '**Thumb** plays the two strings nearest your chin: G (Sol) and C (Do).',
          '==Index plays E (Mi). Middle plays A (La).==',
        ],
        tip: 'Rest your thumb on the G (Sol) string before you pluck.',
      },
      {
        kind: 'explain',
        headline: 'The pattern, by string number',
        visual: { kind: 'notes', notes: ['G', 'C', 'E', 'A', 'E', 'C'] },
        points: [
          'The pattern goes by string number: ==4, 3, 2, 1, 2, 3==.',
          'Pluck **one note at a time**, evenly, and let each one ring.',
        ],
        tip: 'Say it: thumb, thumb, index, middle, index, thumb.',
      },
      {
        kind: 'riff',
        riffId: 'uke-fingerpick-c',
        caption: 'The pattern on C (Do), four bars. **Slow and even**: thumb, thumb, index, middle, index, thumb.',
      },
      {
        kind: 'explain',
        headline: 'Hold the chord, pluck the pattern',
        visual: { kind: 'chords', chordIds: ['uke-C', 'uke-Am', 'uke-F', 'uke-G'] },
        points: [
          'Fret the chord and ==keep it held== while the pattern repeats.',
          'Change chords between bars, as in the strum drills.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-fingerpick-loop',
        caption: 'The four-chord loop, picked. **Change on the last beat** and keep the pattern going.',
      },
      {
        kind: 'explain',
        headline: 'A real tune: The Water Is Wide',
        visual: { kind: 'chords', chordIds: ['uke-G', 'uke-Em', 'uke-C', 'uke-D'] },
        points: [
          'A slow Scottish folk song on ==G (Sol), Em (Mi minor), C (Do) and D (Re)==.',
          'The app plucks a pattern like yours. **Follow along** with your own fingers.',
        ],
      },
      {
        kind: 'song',
        songId: 'the-water-is-wide',
        caption: 'Speed down to 60%. Pluck the pattern while the app plays, and **change chords on the last beat**.',
      },
      {
        kind: 'check',
        question: 'Which finger plays the E (Mi) string in this pattern?',
        options: ['The index finger', 'The thumb', 'The middle finger', 'The pinky'],
        answer: 'The index finger',
        explain: '**Thumb** takes G (Sol) and C (Do), **index** takes E (Mi), **middle** takes A (La).',
      },
      {
        kind: 'check',
        question: 'In which order does the pattern pluck the strings, by string number?',
        options: ['4, 3, 2, 1, 2, 3', '1, 2, 3, 4, 3, 2', '4, 3, 2, 1, 4, 3', '1, 2, 3, 4, 1, 2'],
        answer: '4, 3, 2, 1, 2, 3',
        explain: 'Up from the chin to the floor, then back: ==4, 3, 2, 1, 2, 3==, and round again.',
      },
      {
        kind: 'check',
        question: 'Which strings does the thumb play?',
        options: [
          'The G (Sol) and C (Do) strings',
          'The E (Mi) and A (La) strings',
          'Only the A (La) string',
          'All four strings',
        ],
        answer: 'The G (Sol) and C (Do) strings',
        explain: 'The thumb plays the **two strings nearest your chin**: G (Sol) and C (Do).',
      },
    ],
  },
  {
    id: 'uke-first-melody',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Your first melody',
    goal: 'Play Twinkle, Twinkle on single notes and hear the leap from Do to Sol.',
    steps: [
      {
        kind: 'explain',
        headline: 'Six notes, mostly open strings',
        visual: {
          kind: 'neck',
          fretRange: [0, 2],
          dots: [
            { stringIndex: 1, fret: 0 },
            { stringIndex: 1, fret: 2 },
            { stringIndex: 2, fret: 0 },
            { stringIndex: 2, fret: 1 },
            { stringIndex: 0, fret: 0 },
            { stringIndex: 3, fret: 0 },
          ],
          tapToHear: true,
        },
        points: [
          'Twinkle needs C (Do) up to A (La): ==mostly open strings==.',
          'D (Re) is **fret 2** of the C (Do) string. F (Fa) is fret 1 of the E (Mi) string.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Do up to Sol: a leap',
        visual: { kind: 'illustration', name: 'leap-vs-step' },
        points: [
          'Twinkle opens with a **leap**: Do up to Sol, skipping Re, Mi and Fa.',
          'Then it ==steps== from neighbour to neighbour.',
        ],
        tip: 'Here both are open strings: the C (Do) string, then the G (Sol) string.',
      },
      {
        kind: 'riff',
        riffId: 'uke-twinkle-first-melody',
        caption: 'The whole tune. Sing **Do Do Sol Sol La La Sol** as you pluck.',
      },
      {
        kind: 'listen',
        caption: 'Pluck the open strings for Do, Sol, La, Sol: **C (Do), G (Sol), A (La), G (Sol)**. No mic? Skip it.',
        targets: [
          { stringIndex: 1, fret: 0 },
          { stringIndex: 0, fret: 0 },
          { stringIndex: 3, fret: 0 },
          { stringIndex: 0, fret: 0 },
        ],
      },
      {
        kind: 'explain',
        headline: 'Ode to Joy: all stepping',
        visual: { kind: 'illustration', name: 'scale-staircase' },
        points: [
          'Ode to Joy hardly leaps: it **steps** along the scale.',
          'It opens ==Mi Mi Fa Sol, Sol Fa Mi Re==.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-ode-first-phrase',
        caption: 'Four bars. Say the names: **Mi Mi Fa Sol**, Sol Fa Mi Re, Do Do Re Mi, Mi Re Re.',
      },
      {
        kind: 'check',
        question: 'Twinkle opens Do Do Sol Sol. Which two strings play Do and Sol?',
        options: [
          'The open C (Do) string and the open G (Sol) string',
          'The open E (Mi) string and the open A (La) string',
          'Fret 2 of the C (Do) string and the open A (La) string',
          'Fret 1 of the E (Mi) string and the open G (Sol) string',
        ],
        answer: 'The open C (Do) string and the open G (Sol) string',
        explain: 'Do is the **open C (Do) string** and Sol the open G (Sol) string: no finger needed.',
      },
      {
        kind: 'check',
        question: 'Which fret of the C (Do) string is D (Re)?',
        options: ['Fret 2', 'Fret 1', 'Fret 3', 'Fret 4'],
        answer: 'Fret 2',
        explain: 'C (Do) open, C# (Do#) at fret 1, then **D (Re) at fret 2**.',
      },
      {
        kind: 'check',
        question: 'Which fret of the E (Mi) string is F (Fa)?',
        options: ['Fret 1', 'Fret 2', 'Fret 3', 'Fret 5'],
        answer: 'Fret 1',
        explain: 'E (Mi) to F (Fa) is a **half step**: one fret. Fret 3 is G (Sol).',
      },
      {
        kind: 'check',
        question: 'Do up to Sol skips Re, Mi and Fa. What is that jump called?',
        options: ['A leap', 'A step', 'A slide', 'A rest'],
        answer: 'A leap',
        explain: 'A jump over notes is a **leap**. Moving to the next note is a step.',
      },
    ],
  },
];
