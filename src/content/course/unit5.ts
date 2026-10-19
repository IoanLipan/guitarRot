import type { Lesson } from '../lessons';
import { onString } from './visuals';

const UNIT = 'Rock, blues, and why chords fit';

/** Lessons 21-24: power chords, keys, the first solo scale and the blues form. */
export const UNIT_5: readonly Lesson[] = [
  {
    id: 'power-chords',
    unit: UNIT,
    title: 'Power chords',
    goal: 'Play E5 (Mi power chord) and G5 (Sol power chord), and name any power chord from its lowest note.',
    steps: [
      {
        kind: 'explain',
        headline: 'Two notes, lots of punch',
        visual: { kind: 'illustration', name: 'power-chord' },
        points: [
          'A power chord has two notes: the **root** and the **fifth** above it.',
          'For E (Mi), the fifth is B (Si).',
          'No third, so it is ==neither major nor minor==: strong and open.',
        ],
        tip: 'Rock guitarists love them: with distortion, fewer notes sound clearer.',
      },
      {
        kind: 'chord',
        chordId: 'E5-power',
        caption: 'Index on **fret 2, A (La) string**. Middle on **fret 2, D (Re) string**. Strum the three thickest strings.',
      },
      {
        kind: 'chord',
        chordId: 'G5-power',
        caption: 'The **same shape slid up three frets**: index fret 3 low E (Mi), ring fret 5 A (La), pinky fret 5 D (Re).',
      },
      {
        kind: 'explain',
        headline: 'Name it by its lowest note',
        visual: {
          kind: 'neck',
          fretRange: [0, 5],
          dots: [...onString(0, [0, 3, 5]), { stringIndex: 1, fret: 3 }],
          highlightStrings: [0, 1],
          tapToHear: true,
        },
        points: [
          'The lowest note ==names the chord==.',
          'Shape on the low E (Mi) string: fret 3 is G5 (Sol power chord), fret 5 is A5 (La power chord).',
          'Root on the A (La) string: fret 3 is C5 (Do power chord).',
        ],
        tip: 'The landmarks from "The low E (Mi) string" name your power chords.',
      },
      {
        kind: 'explain',
        headline: 'Palm mute for a chunky sound',
        visual: { kind: 'illustration', name: 'guitar-parts' },
        points: [
          'Rest the **edge of your picking hand** lightly on the strings.',
          'Right beside the ==bridge==.',
          'Pick as usual: the notes sound tight and chunky.',
        ],
        tip: 'The tab shows only the two lowest notes of each power chord.',
      },
      {
        kind: 'riff',
        riffId: 'power-chord-drive',
        caption: 'E5 (Mi power chord), G5 (Sol power chord), A5 (La power chord), E5: frets 0, 3, 5, 0. **Downstrokes, palm muted.**',
      },
      {
        kind: 'check',
        question: 'Which notes are in a power chord?',
        options: [
          'The root and the fifth',
          'The root, the third and the fifth',
          'The root and the third',
          'The root, the fifth and the seventh',
        ],
        answer: 'The root and the fifth',
        explain: 'A power chord is just the **root** and the **fifth** above it. The third is left out.',
      },
      {
        kind: 'check',
        question:
          'Your index finger is on fret 5 of the low E (Mi) string and you play the power chord shape. Which chord is it?',
        options: ['A5 (La power chord)', 'G5 (Sol power chord)', 'E5 (Mi power chord)', 'D5 (Re power chord)'],
        answer: 'A5 (La power chord)',
        explain: 'The lowest note names the chord: **fret 5** is A (La). Fret 3 gives G5 (Sol power chord), open gives E5 (Mi power chord).',
      },
      {
        kind: 'check',
        question: 'What does a power chord leave out?',
        options: [
          'The third, so it is neither major nor minor',
          'The root, so it sounds vague',
          'The fifth, so it sounds weak',
          'Nothing: it has every note of a major chord',
        ],
        answer: 'The third, so it is neither major nor minor',
        explain: 'The third decides major or minor. Without it, a power chord ==fits with either==.',
      },
    ],
  },
  {
    id: 'keys-1-4-5',
    unit: UNIT,
    title: 'Keys and the 1-4-5',
    goal: 'Name the I, IV and V chords of a key and know why a handful of chords fit together.',
    steps: [
      {
        kind: 'explain',
        headline: 'A key is a home note',
        visual: { kind: 'illustration', name: 'key-family' },
        points: [
          'A **key** is a home note plus its scale. In the key of G (Sol), home is G (Sol).',
          'The major chords on the ==1st, 4th and 5th== notes are called I, IV and V.',
          'In G (Sol) they are G (Sol), C (Do) and D (Re).',
        ],
      },
      {
        kind: 'explain',
        headline: 'Same recipe in the key of D (Re)',
        visual: { kind: 'chords', chordIds: ['D-open', 'G-open', 'A-open'] },
        points: [
          '==Same recipe, any key.== Key of D (Re): D (Re), G (Sol), A (La).',
          'Key of C (Do): C (Do), F (Fa), G (Sol). Key of A (La): A (La), D (Re), E (Mi).',
        ],
      },
      {
        kind: 'explain',
        headline: 'The shortcut: 5 frets, then 2',
        visual: {
          kind: 'neck',
          fretRange: [0, 7],
          dots: [
            { stringIndex: 0, fret: 0, label: 'I' },
            { stringIndex: 0, fret: 5, label: 'IV' },
            { stringIndex: 0, fret: 7, label: 'V' },
          ],
          highlightStrings: [0],
          tapToHear: true,
        },
        points: [
          'The **IV** is five frets above the I.',
          'The ==V is two frets above the IV==.',
          'Example, key of E (Mi): fret 0, fret 5 and fret 7 of the low E (Mi) string.',
        ],
      },
      {
        kind: 'explain',
        headline: 'A fourth friend: the vi',
        visual: { kind: 'chords', chordIds: ['Em-open', 'Am-open'] },
        points: [
          '**vi** is the minor chord on the 6th note of the scale.',
          'In G (Sol) it is Em (Mi minor). In C (Do) it is Am (La minor).',
          'Same family, ==darker mood==.',
        ],
        tip: 'Know a song\'s key? Guess its chords: try the I, IV and V first.',
      },
      {
        kind: 'song',
        songId: 'aura-lee',
        caption: 'Every chord comes from the key of G (Sol): G (Sol), C (Do), D (Re). **Hear how they belong together.**',
      },
      {
        kind: 'check',
        question: 'What are the I, IV and V chords in the key of G (Sol)?',
        options: [
          'G (Sol), C (Do), D (Re)',
          'G (Sol), A (La), D (Re)',
          'G (Sol), C (Do), E (Mi)',
          'G (Sol), B (Si), D (Re)',
        ],
        answer: 'G (Sol), C (Do), D (Re)',
        explain: 'The G (Sol) scale runs G (Sol), A (La), B (Si), C (Do), D (Re), E (Mi), F# (Fa#). Notes **1, 4, 5** give G (Sol), C (Do), D (Re).',
      },
      {
        kind: 'check',
        question: 'What are the I, IV and V chords in the key of D (Re)?',
        options: [
          'D (Re), G (Sol), A (La)',
          'D (Re), E (Mi), A (La)',
          'D (Re), G (Sol), B (Si)',
          'D (Re), C (Do), G (Sol)',
        ],
        answer: 'D (Re), G (Sol), A (La)',
        explain: 'From D (Re), the IV is **five frets up**: G (Sol). The V is seven frets up: A (La).',
      },
      {
        kind: 'check',
        question: 'In the key of C (Do), the relative minor chord (vi) sits on the 6th note of the scale. Which chord is it?',
        options: ['Am (La minor)', 'Em (Mi minor)', 'Dm (Re minor)', 'Gm (Sol minor)'],
        answer: 'Am (La minor)',
        explain: 'Count up the C (Do) major scale: the **6th note** is A (La), so the vi chord is Am (La minor).',
      },
    ],
  },
  {
    id: 'pentatonic',
    unit: UNIT,
    title: 'Minor pentatonic: your first solo scale',
    goal: 'Play E (Mi) minor pentatonic box 1 and improvise your first short phrases with it.',
    steps: [
      {
        kind: 'explain',
        headline: 'Five notes: E (Mi) minor pentatonic',
        visual: { kind: 'notes', notes: ['E', 'G', 'A', 'B', 'D'] },
        points: [
          '**Penta** means five. This scale has just five notes.',
          'It is the sound behind a huge share of rock and blues solos.',
          '==Forgiving==: over Em (Mi minor), every one of its notes sounds good.',
        ],
      },
      {
        kind: 'fretboard',
        caption: '**Box 1**: two notes on every string, frets 0 to 3. Middle finger on fret 2, ring on fret 3. Tap from the low string up.',
        fretRange: [0, 3],
        positions: [
          { stringIndex: 0, fret: 0 },
          { stringIndex: 0, fret: 3 },
          { stringIndex: 1, fret: 0 },
          { stringIndex: 1, fret: 2 },
          { stringIndex: 2, fret: 0 },
          { stringIndex: 2, fret: 2 },
          { stringIndex: 3, fret: 0 },
          { stringIndex: 3, fret: 2 },
          { stringIndex: 4, fret: 0 },
          { stringIndex: 4, fret: 3 },
          { stringIndex: 5, fret: 0 },
          { stringIndex: 5, fret: 3 },
        ],
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'em-pentatonic-box1',
        caption: 'Up through the box, two notes per string, in eighth notes. **Nothing in it sounds wrong**, in any order.',
      },
      {
        kind: 'explain',
        headline: 'Make it music: pick three notes',
        visual: { kind: 'notes', notes: ['E', 'G', 'A'] },
        points: [
          'Pick just ==three notes== from the box.',
          'Play them in a rhythm you like. Repeat it.',
          'Then change one note.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Gaps, repeats, a good ending',
        visual: {
          kind: 'neck',
          fretRange: [0, 3],
          dots: [
            { stringIndex: 0, fret: 0 },
            { stringIndex: 2, fret: 2 },
            { stringIndex: 5, fret: 0 },
          ],
          tapToHear: true,
        },
        points: [
          'Leave **gaps**: silence counts.',
          '**Repeat** a short idea.',
          'End on the root, E (Mi), so it sounds ==finished==. The dots show where it lives.',
        ],
        tip: 'Strum Em (Mi minor) with a friend, or record it on your phone, and play along.',
      },
      {
        kind: 'check',
        question: 'Which notes are in E (Mi) minor pentatonic?',
        options: [
          'E (Mi), G (Sol), A (La), B (Si), D (Re)',
          'E (Mi), F# (Fa#), G# (Sol#), B (Si), C# (Do#)',
          'E (Mi), G (Sol), A (La), B (Si), C (Do)',
          'E (Mi), F (Fa), G (Sol), A (La), B (Si)',
        ],
        answer: 'E (Mi), G (Sol), A (La), B (Si), D (Re)',
        explain: 'The second option is E (Mi) **major** pentatonic: brighter, happier. Minor has the darker G (Sol) and D (Re).',
      },
      {
        kind: 'check',
        question: 'How many notes does a pentatonic scale have?',
        options: ['3', '5', '7', '12'],
        answer: '5',
        explain: '**Penta** means five, as in pentagon.',
      },
      {
        kind: 'check',
        question: 'Which fret of the low E (Mi) string is G (Sol) in box 1?',
        options: ['Fret 3', 'Fret 2', 'Fret 5', 'Fret 0'],
        answer: 'Fret 3',
        explain: '**Fret 3** is G (Sol). Fret 1 is F (Fa), and box 1 skips it: F (Fa) is not in the scale.',
      },
    ],
  },
  {
    id: 'twelve-bar',
    unit: UNIT,
    title: 'The twelve-bar blues',
    goal: 'Count the twelve-bar blues form and name its chords in the key of E (Mi).',
    steps: [
      {
        kind: 'explain',
        headline: 'Twelve bars, three chords',
        visual: { kind: 'notes', notes: ['E', 'A', 'B'] },
        points: [
          '==Twelve bars, three chords, then it loops.== Blues and rock are built on it.',
          'It uses the I, IV and V from "Keys and the 1-4-5".',
          'In the key of E (Mi): I is E (Mi), IV is A (La), V is B (Si).',
        ],
      },
      {
        kind: 'explain',
        headline: 'The form: count the twelve',
        visual: { kind: 'illustration', name: 'twelve-bar' },
        points: [
          'Four bars of **I**, two of IV, two of I.',
          'Then ==V, IV, I, V== and it loops back to the top.',
          'In E (Mi): E E E E, A A E E, B A E B.',
        ],
      },
      {
        kind: 'explain',
        headline: 'The blues shuffle',
        visual: {
          kind: 'neck',
          fretRange: [0, 4],
          dots: [
            { stringIndex: 0, fret: 0 },
            { stringIndex: 1, fret: 2 },
            { stringIndex: 1, fret: 4 },
          ],
          highlightStrings: [0, 1],
          tapToHear: true,
        },
        points: [
          'Pick the open low E (Mi) string together with fret 2 of the A (La) string: B (Si).',
          'Then fret 4: C# (Do#). Alternate in ==steady eighth notes==.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Move it for the A (La) and B (Si) bars',
        visual: {
          kind: 'neck',
          fretRange: [0, 6],
          dots: [
            { stringIndex: 1, fret: 0 },
            { stringIndex: 1, fret: 2 },
            { stringIndex: 2, fret: 2 },
            { stringIndex: 2, fret: 4 },
            { stringIndex: 2, fret: 6 },
          ],
          highlightStrings: [1, 2],
          tapToHear: true,
        },
        points: [
          'A (La) bar: open A (La) string, plus E (Mi) and F# (Fa#) on the D (Re) string at frets 2 and 4.',
          'B (Si) bar: ==slide the pattern up two frets==.',
          'Root B (Si) is fret 2 of the A (La) string. Partners: F# (Fa#) at fret 4, G# (Sol#) at fret 6.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'blues-shuffle-e',
        caption: 'Four bars: E (Mi), E (Mi), A (La), E (Mi). Once it loops, **stretch it over all twelve bars**.',
      },
      {
        kind: 'check',
        question: 'How many bars of the I chord open a twelve-bar blues?',
        options: ['One', 'Two', 'Four', 'Eight'],
        answer: 'Four',
        explain: 'The form starts with **four bars of I**, then moves to IV for two bars.',
      },
      {
        kind: 'check',
        question: 'In the key of E (Mi), which chord is the IV?',
        options: ['A (La)', 'B (Si)', 'D (Re)', 'C# (Do#)'],
        answer: 'A (La)',
        explain: 'The IV is **five frets above** the I. Five frets above E (Mi) is A (La). B (Si) is the V.',
      },
      {
        kind: 'check',
        question: 'Which chord comes in bar 9 of a twelve-bar blues in E (Mi)?',
        options: [
          'B (Si), the V chord',
          'A (La), the IV chord',
          'E (Mi), the I chord',
          'C#m (Do# minor), the vi chord',
        ],
        answer: 'B (Si), the V chord',
        explain: 'Bars 9 to 12 go V, IV, I, V. In E (Mi) that is B A E B: **bar 9** is B (Si).',
      },
    ],
  },
];
