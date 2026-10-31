import type { Lesson } from '../../lessons';
import { gripNeck } from '../visuals';

const UNIT = 'Your first chords';

/** Lessons 5-9: C, Am, F and G, changing between them, the island strum, and a first tune. */
export const UKE_UNIT_2: readonly Lesson[] = [
  {
    id: 'uke-c-am',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'C (Do) and Am (La minor)',
    goal: 'Play C (Do) and Am (La minor), one finger each, and change between them.',
    steps: [
      {
        kind: 'explain',
        headline: 'Chord boxes, four lines wide',
        visual: { kind: 'illustration', name: 'uke-chord-box' },
        points: [
          'The 4 lines are the strings: ==G C E A, left to right==.',
          'A **dot** is where to press. The number in it is your finger.',
          'A ring above a string means: let it ring open.',
        ],
      },
      {
        kind: 'explain',
        headline: 'C (Do): one finger!',
        visual: gripNeck('uke-C', [0, 4]),
        points: [
          'Ring finger on **fret 3** of the A (La) string. That is all.',
          'The other three strings ring open: ==one finger, one chord==.',
        ],
        tip: 'C (Do) is C (Do), E (Mi) and G (Sol) together.',
      },
      {
        kind: 'chord',
        chordId: 'uke-C',
        caption: 'Ring finger (3) on the A (La) string, fret 3. Strum all four strings, downward.',
      },
      {
        kind: 'explain',
        headline: 'Am (La minor): one finger too',
        visual: gripNeck('uke-Am', [0, 4]),
        points: [
          'Middle finger on **fret 2** of the G (Sol) string.',
          'The other strings ring open. Am (La minor) sounds ==sadder than C (Do)==.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'uke-Am',
        caption: 'Middle finger (2) on the G (Sol) string, fret 2. Strum all four strings.',
      },
      {
        kind: 'explain',
        headline: 'Hop from one to the other',
        visual: { kind: 'illustration', name: 'uke-shape-move' },
        points: [
          'Lift one finger, ==put the other down==: that is the whole change.',
          'C (Do) uses the A (La) string, Am (La minor) the G (Sol) string.',
        ],
        tip: 'Look at the next spot as you leave this one.',
      },
      {
        kind: 'riff',
        riffId: 'uke-c-am-change',
        caption: 'Two bars of C (Do), two of Am (La minor), twice. **Start moving on the last beat** of the bar.',
      },
      {
        kind: 'check',
        question: 'Which notes are in C (Do)?',
        options: ['C (Do), E (Mi), G (Sol)', 'C (Do), Eb (Mib), G (Sol)', 'C (Do), F (Fa), G (Sol)', 'C (Do), E (Mi), A (La)'],
        answer: 'C (Do), E (Mi), G (Sol)',
        explain: 'C (Do) is C (Do), E (Mi), G (Sol). **Lower the E (Mi)** to Eb (Mib) and it turns minor.',
      },
      {
        kind: 'check',
        question: 'Which notes are in Am (La minor)?',
        options: ['A (La), C (Do), E (Mi)', 'A (La), C# (Do#), E (Mi)', 'A (La), B (Si), E (Mi)', 'A (La), C (Do), G (Sol)'],
        answer: 'A (La), C (Do), E (Mi)',
        explain: 'Am (La minor) is A (La), C (Do), E (Mi). **Raise the C (Do)** to C# (Do#) and you get A (La) major.',
      },
      {
        kind: 'check',
        question: 'Changing from C (Do) to Am (La minor), what moves?',
        options: [
          'The ring finger lifts and the middle finger lands on the G (Sol) string',
          'All four fingers move',
          'Nothing: it is the same shape',
          'Only the thumb',
        ],
        answer: 'The ring finger lifts and the middle finger lands on the G (Sol) string',
        explain: 'C (Do) is a ring finger on the A (La) string. Am (La minor) is a ==middle finger== on the G (Sol) string.',
      },
    ],
  },
  {
    id: 'uke-f-chord',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'F (Fa): two fingers',
    goal: 'Play F (Fa) and change between Am (La minor), C (Do) and F (Fa).',
    steps: [
      {
        kind: 'explain',
        headline: 'F (Fa): two fingers',
        visual: gripNeck('uke-F', [0, 4]),
        points: [
          'Index on **fret 1** of the E (Mi) string. Middle on **fret 2** of the G (Sol) string.',
          'The C (Do) and A (La) strings ring open.',
        ],
        tip: 'F (Fa) is F (Fa), A (La) and C (Do) together.',
      },
      {
        kind: 'chord',
        chordId: 'uke-F',
        caption: 'Index (1) on the E (Mi) string, fret 1. Middle (2) on the G (Sol) string, fret 2. Strum all four.',
      },
      {
        kind: 'explain',
        headline: 'Am (La minor) to F (Fa): add one',
        visual: { kind: 'chords', chordIds: ['uke-Am', 'uke-F'] },
        points: [
          'Your middle finger ==stays put== on the G (Sol) string.',
          'Just drop the index finger on fret 1 of the E (Mi) string: **one finger joins**.',
        ],
        tip: 'Keep the strum going while you change.',
      },
      {
        kind: 'riff',
        riffId: 'uke-am-f-change',
        caption: 'Two bars of Am (La minor), two of F (Fa), twice. The **middle finger never moves**.',
      },
      {
        kind: 'explain',
        headline: 'C (Do) to F (Fa)',
        visual: { kind: 'chords', chordIds: ['uke-C', 'uke-F'] },
        points: [
          'C (Do) to F (Fa) is one of the most common changes in songs.',
          'Lift the ring finger and ==drop index and middle together==.',
        ],
        tip: 'Say it as you play: **ring off, two on**.',
      },
      {
        kind: 'riff',
        riffId: 'uke-c-f-change',
        caption: 'Two bars of C (Do), two of F (Fa), twice. **Land both fingers at the same moment.**',
      },
      {
        kind: 'check',
        question: 'Which notes are in F (Fa)?',
        options: ['F (Fa), A (La), C (Do)', 'F (Fa), Ab (Lab), C (Do)', 'F (Fa), A (La), D (Re)', 'F (Fa), G (Sol), C (Do)'],
        answer: 'F (Fa), A (La), C (Do)',
        explain: 'F (Fa) is F (Fa), A (La), C (Do). **Lower the A (La)** to Ab (Lab) and it turns minor.',
      },
      {
        kind: 'check',
        question: 'Going from Am (La minor) to F (Fa), which finger stays put?',
        options: [
          'The middle finger, on fret 2 of the G (Sol) string',
          'The index finger',
          'The ring finger',
          'None: every finger lifts',
        ],
        answer: 'The middle finger, on fret 2 of the G (Sol) string',
        explain: 'Both shapes have the middle finger on **fret 2 of the G (Sol) string**. Only the index finger joins.',
      },
      {
        kind: 'check',
        question: 'How many fingers does F (Fa) need?',
        options: ['One', 'Two', 'Three', 'Four'],
        answer: 'Two',
        explain: 'F (Fa) presses **two strings**: the E (Mi) string at fret 1 and the G (Sol) string at fret 2.',
      },
    ],
  },
  {
    id: 'uke-g-chord',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'G (Sol): the triangle',
    goal: 'Play G (Sol) and change to it from C (Do), with an easier stand-in up your sleeve.',
    steps: [
      {
        kind: 'explain',
        headline: 'G (Sol): a small triangle',
        visual: gripNeck('uke-G', [0, 4]),
        points: [
          'Index on the C (Do) string, middle on the A (La) string, both at **fret 2**.',
          'Ring on the E (Mi) string at ==fret 3==. The G (Sol) string rings open.',
        ],
        tip: 'G (Sol) is G (Sol), B (Si) and D (Re) together.',
      },
      {
        kind: 'chord',
        chordId: 'uke-G',
        caption: 'Three fingers make a triangle: 1, 2 and 3. Strum all four strings.',
      },
      {
        kind: 'explain',
        headline: 'C (Do) to G (Sol): the long hop',
        visual: { kind: 'chords', chordIds: ['uke-C', 'uke-G'] },
        points: [
          'Lift the ring finger. Then land all three fingers **at the same moment**.',
          'Think of ==stamping a triangle== onto the neck.',
        ],
        tip: 'Practise silently: shape, count four, change.',
      },
      {
        kind: 'riff',
        riffId: 'uke-c-g-change',
        caption: 'Two bars of C (Do), two of G (Sol), twice. Most beginners find this one hard: **go slow, keep the hand moving**.',
      },
      {
        kind: 'explain',
        headline: 'The easier cousin of G (Sol)',
        visual: { kind: 'chords', chordIds: ['uke-G', 'uke-G7'] },
        points: [
          'G7 (Sol dominant seventh): G (Sol) with one note dropped to F (Fa).',
          'No finger goes past **fret 2**: ==a smaller stretch== than G (Sol).',
        ],
        tip: 'Songs in C (Do) often use this chord anyway. Try it for any G (Sol).',
      },
      {
        kind: 'chord',
        chordId: 'uke-G7',
        caption: 'Index (1): E (Mi) string, fret 1. Middle (2): C (Do) string, fret 2. Ring (3): A (La) string, fret 2.',
      },
      {
        kind: 'riff',
        riffId: 'uke-c-g7-change',
        caption: 'Two bars of C (Do), two of G7 (Sol dominant seventh), twice. Easier on the fingers than G (Sol).',
      },
      {
        kind: 'check',
        question: 'Which notes are in G (Sol)?',
        options: ['G (Sol), B (Si), D (Re)', 'G (Sol), Bb (Sib), D (Re)', 'G (Sol), C (Do), D (Re)', 'G (Sol), B (Si), E (Mi)'],
        answer: 'G (Sol), B (Si), D (Re)',
        explain: 'G (Sol) is G (Sol), B (Si), D (Re). **Lower the B (Si)** to Bb (Sib) and it turns minor.',
      },
      {
        kind: 'check',
        question: 'Which notes are in G7 (Sol dominant seventh)?',
        options: [
          'G (Sol), B (Si), D (Re), F (Fa)',
          'G (Sol), B (Si), D (Re), F# (Fa#)',
          'G (Sol), B (Si), D (Re)',
          'G (Sol), C (Do), D (Re), F (Fa)',
        ],
        answer: 'G (Sol), B (Si), D (Re), F (Fa)',
        explain: 'The seven chord is G (Sol), B (Si), D (Re) plus ==F (Fa)==. The extra note makes it a "seven".',
      },
      {
        kind: 'check',
        question: 'How is G7 (Sol dominant seventh) easier than G (Sol)?',
        options: [
          'No finger has to reach past fret 2',
          'It uses only one finger',
          'It leaves out the G (Sol) string',
          'It is played higher up the neck',
        ],
        answer: 'No finger has to reach past fret 2',
        explain: 'G (Sol) needs a finger on **fret 3**. The seven chord keeps every finger on frets 1 and 2.',
      },
    ],
  },
  {
    id: 'uke-island-strum',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'The island strum',
    goal: 'Strum down, down-up, up, down-up without ever stopping your hand.',
    steps: [
      {
        kind: 'explain',
        headline: 'Down, down-up, up, down-up',
        visual: { kind: 'illustration', name: 'uke-island-strum' },
        points: [
          'The ==island strum== has six strums in a bar.',
          'On beat 3 your hand swings down and **touches nothing**.',
        ],
        tip: 'Chant it as you play: down, down-up, up, down-up.',
      },
      {
        kind: 'riff',
        riffId: 'uke-island-c',
        caption: 'C (Do) with the island strum, four bars. **Slow**, until your hand never stops.',
      },
      {
        kind: 'explain',
        headline: 'Count the in-betweens',
        visual: { kind: 'illustration', name: 'strum-pattern' },
        points: [
          'Count ==1 & 2 & 3 & 4 &==: downs on the numbers, ups on the "&".',
          'The ghost arrows are **misses**: the hand swings, nothing is struck.',
        ],
        tip: 'Ups are lighter than downs: a soft brush, not a second hit.',
      },
      {
        kind: 'riff',
        riffId: 'uke-island-loop',
        caption: 'The four chords you know, with the island strum. **Change on the last beat**, and never stop the hand.',
      },
      {
        kind: 'check',
        question: 'In the island strum, how many strums touch the strings in one bar?',
        options: ['Six: three down, three up', 'Eight: four down, four up', 'Four: all down', 'Three: all up'],
        answer: 'Six: three down, three up',
        explain: 'Eight counts pass, but two are **misses**: the hand swings, nothing sounds. That leaves six.',
      },
      {
        kind: 'check',
        question: 'On which beat does your hand swing without touching the strings?',
        options: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
        answer: 'Beat 3',
        explain: 'The strums fall on 1, 2, the "&" after 2, the "&" after 3, 4 and the last "&". ==Beat 3 is the gap==.',
      },
      {
        kind: 'check',
        question: 'Your hand reaches a "miss" in the pattern. What does it do?',
        options: [
          'Keeps swinging, touching nothing',
          'Stops and waits',
          'Mutes the strings',
          'Strums twice as hard',
        ],
        answer: 'Keeps swinging, touching nothing',
        explain: 'A hand that keeps swinging **keeps the beat in your arm**. If it stops on a miss, the next strum is late.',
      },
    ],
  },
  {
    id: 'uke-first-song',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Four chords, one loop',
    goal: 'Play the C (Do), Am (La minor), F (Fa), G (Sol) loop, then a first real tune.',
    steps: [
      {
        kind: 'explain',
        headline: 'One loop, a thousand songs',
        visual: { kind: 'chords', chordIds: ['uke-C', 'uke-Am', 'uke-F', 'uke-G'] },
        points: [
          'C (Do), Am (La minor), F (Fa), G (Sol): ==one bar each==, then around again.',
          'Hundreds of songs are built on **this loop**.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-c-am-f-g-loop',
        caption: 'Four downstrokes a bar. **Move on the last beat**: your fingers are already travelling when beat 1 lands.',
      },
      {
        kind: 'explain',
        headline: 'Slow beats fast',
        visual: { kind: 'illustration', name: 'slow-loop' },
        points: [
          'Loop the bar that trips you, at the speed where you ==never stop==.',
          'Add **5 bpm** only when it feels clean.',
        ],
        tip: 'Singing along makes the time easier to keep.',
      },
      {
        kind: 'explain',
        headline: 'A real tune: Scarborough Fair',
        visual: { kind: 'chords', chordIds: ['uke-Am', 'uke-C', 'uke-G'] },
        points: [
          'An old English tune on just ==Am (La minor), C (Do) and G (Sol)==.',
          'It counts in **threes**: 1 2 3. Strum along with the app.',
        ],
      },
      {
        kind: 'song',
        songId: 'scarborough-fair',
        caption: 'Speed down to 60%. Count 1 2 3 and change chords on the **last beat** of the bar.',
      },
      {
        kind: 'check',
        question: 'Which four chords make the loop?',
        options: [
          'C (Do), Am (La minor), F (Fa), G (Sol)',
          'C (Do), Dm (Re minor), F (Fa), G (Sol)',
          'C (Do), Am (La minor), Em (Mi minor), G (Sol)',
          'G (Sol), D (Re), Em (Mi minor), C (Do)',
        ],
        answer: 'C (Do), Am (La minor), F (Fa), G (Sol)',
        explain: 'The loop is **C (Do), Am (La minor), F (Fa), G (Sol)**: the four chords you now know.',
      },
      {
        kind: 'check',
        question: 'How many beats are in a bar of Scarborough Fair?',
        options: ['Two', 'Three', 'Four', 'Six'],
        answer: 'Three',
        explain: 'It is in **3/4**: count 1 2 3, then 1 2 3 again. The loop above counts four.',
      },
      {
        kind: 'check',
        question: 'When should you start moving to the next chord?',
        options: [
          'During the last beat of the bar, so it lands on beat 1',
          'On beat 1 of the new bar, after you hear it',
          'After you finish the bar and stop',
          'Two bars before the change',
        ],
        answer: 'During the last beat of the bar, so it lands on beat 1',
        explain: 'Your hand needs time to travel. Leaving on the **last beat** makes the new chord land on time.',
      },
    ],
  },
];
