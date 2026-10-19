import type { Lesson } from '../lessons';

const UNIT = 'Melody: Do Re Mi';

/** Lessons 17-20: single-note melodies, from the scale to the rhythm of a tune. */
export const UNIT_4: readonly Lesson[] = [
  {
    id: 'major-scale',
    unit: UNIT,
    title: 'The major scale',
    goal: 'Play the C (Do) major scale, Do Re Mi Fa Sol La Si Do, and know the pattern behind every major scale.',
    steps: [
      {
        kind: 'explain',
        headline: 'Do Re Mi Fa Sol La Si Do',
        visual: { kind: 'notes', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'] },
        points: [
          'A **scale** is a set of notes in order, low to high.',
          'The major scale is the one behind ==Do Re Mi==.',
          'Starting on C (Do), it uses only natural notes.',
        ],
      },
      {
        kind: 'explain',
        headline: 'The major scale recipe',
        visual: { kind: 'illustration', name: 'scale-staircase' },
        points: [
          '==Whole, whole, half, whole, whole, whole, half.==',
          'The half steps are E (Mi)-F (Fa) and B (Si)-C (Do), as in "The musical alphabet".',
        ],
        tip: 'Start on any note: you get **that note\'s major scale**.',
      },
      {
        kind: 'fretboard',
        caption: 'One octave of C (Do) major in first position. Start with your ring finger on **fret 3, A (La) string**, then climb.',
        fretRange: [0, 4],
        positions: [
          { stringIndex: 1, fret: 3 },
          { stringIndex: 2, fret: 0 },
          { stringIndex: 2, fret: 2 },
          { stringIndex: 2, fret: 3 },
          { stringIndex: 3, fret: 0 },
          { stringIndex: 3, fret: 2 },
          { stringIndex: 4, fret: 0 },
          { stringIndex: 4, fret: 1 },
        ],
        tapToHear: true,
      },
      {
        kind: 'explain',
        headline: 'Fingers for the scale',
        visual: {
          kind: 'neck',
          fretRange: [0, 4],
          dots: [
            { stringIndex: 1, fret: 3, label: '3' },
            { stringIndex: 2, fret: 0, label: '0' },
            { stringIndex: 2, fret: 2, label: '2' },
            { stringIndex: 2, fret: 3, label: '3' },
            { stringIndex: 3, fret: 0, label: '0' },
            { stringIndex: 3, fret: 2, label: '2' },
            { stringIndex: 4, fret: 0, label: '0' },
            { stringIndex: 4, fret: 1, label: '1' },
          ],
          highlightStrings: [1, 2, 3, 4],
        },
        points: [
          'Start with your ==ring finger== on C (Do): fret 3, A (La) string.',
          'The numbers are fingers; **0** is an open string.',
          'D (Re) string: 0, 2, 3 are D (Re), E (Mi), F (Fa).',
        ],
      },
      {
        kind: 'riff',
        riffId: 'c-major-scale',
        caption: 'Up and back down. Say Do Re Mi Fa Sol La Si Do and hear the two **smaller steps**: Mi-Fa and Si-Do.',
      },
      {
        kind: 'listen',
        caption: 'Play the first three notes, **Do Re Mi**, on your own guitar.',
        targets: [
          { stringIndex: 1, fret: 3 },
          { stringIndex: 2, fret: 0 },
          { stringIndex: 2, fret: 2 },
        ],
      },
      {
        kind: 'check',
        question: 'Where are the two half steps in the major scale?',
        options: [
          'Between Mi and Fa, and between Si and Do',
          'Between Do and Re, and between Re and Mi',
          'Between Fa and Sol, and between La and Si',
          'Between Re and Mi, and between Sol and La',
        ],
        answer: 'Between Mi and Fa, and between Si and Do',
        explain: 'The halves land on **Mi-Fa** and **Si-Do**: E (Mi) to F (Fa) and B (Si) to C (Do), one fret apart.',
      },
      {
        kind: 'check',
        question: 'How many sharps or flats does the C (Do) major scale have?',
        options: ['None: it uses only natural notes', 'One', 'Two', 'Seven'],
        answer: 'None: it uses only natural notes',
        explain: 'The recipe, started on C (Do), lands on **natural notes** all the way up. That is why everyone learns it first.',
      },
      {
        kind: 'check',
        question: 'Which step pattern makes a major scale?',
        options: [
          'Whole, whole, half, whole, whole, whole, half',
          'Whole, half, whole, whole, half, whole, whole',
          'Half, whole, whole, half, whole, whole, whole',
          'Whole, whole, whole, half, whole, whole, half',
        ],
        answer: 'Whole, whole, half, whole, whole, whole, half',
        explain: 'The second option is the natural **minor** scale. Its half steps sit in other places, so it sounds darker.',
      },
    ],
  },
  {
    id: 'ode-to-joy',
    unit: UNIT,
    title: 'Ode to Joy',
    goal: 'Play Ode to Joy from its solfège, on the two thinnest strings.',
    steps: [
      {
        kind: 'explain',
        headline: 'Sing it first: Mi Mi Fa Sol',
        visual: { kind: 'notes', notes: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D'] },
        points: [
          'Beethoven wrote it in 1824. It moves almost all by **steps**.',
          'Sing: ==Mi Mi Fa Sol, Sol Fa Mi Re, Do Do Re Mi, Mi Re Re==.',
          'A tune you can sing is a tune your fingers can find.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Two strings, five notes',
        visual: {
          kind: 'neck',
          fretRange: [0, 4],
          dots: [
            { stringIndex: 5, fret: 0, label: 'solfege' },
            { stringIndex: 5, fret: 1, label: 'solfege' },
            { stringIndex: 5, fret: 3, label: 'solfege' },
            { stringIndex: 4, fret: 1, label: 'solfege' },
            { stringIndex: 4, fret: 3, label: 'solfege' },
          ],
          highlightStrings: [4, 5],
          tapToHear: true,
        },
        points: [
          'High E (Mi) string: open is **Mi**, fret 1 is Fa, fret 3 is Sol.',
          'B (Si) string: fret 1 is Do, fret 3 is Re.',
          'Index on fret 1, ring on fret 3. ==Pick every note==, even the repeats.',
        ],
      },
      {
        kind: 'song',
        songId: 'ode-to-joy',
        caption: 'Sing the syllables as you watch the tab, then play along with the speed turned down.',
      },
      {
        kind: 'explain',
        headline: 'Bar 4: long, short, long',
        visual: { kind: 'illustration', name: 'note-lengths' },
        points: [
          'Hold the first E (Mi) for **1½ beats**.',
          'Play a quick D (Re): half a beat.',
          'Hold the last D (Re) for ==2 beats==.',
        ],
      },
      {
        kind: 'listen',
        caption: 'Play the falling line from bar 2: **Sol, Fa, Mi, Re**.',
        targets: [
          { stringIndex: 5, fret: 3 },
          { stringIndex: 5, fret: 1 },
          { stringIndex: 5, fret: 0 },
          { stringIndex: 4, fret: 3 },
        ],
      },
      {
        kind: 'check',
        question: 'Which line opens Ode to Joy?',
        options: [
          'Mi Mi Fa Sol, Sol Fa Mi Re',
          'Mi Re Do Re, Mi Mi Mi',
          'Do Do Sol Sol, La La Sol',
          'Do Re Mi Do, Do Re Mi Do',
        ],
        answer: 'Mi Mi Fa Sol, Sol Fa Mi Re',
        explain: 'It climbs **Mi Mi Fa Sol** and walks back down. The others open Mary Had a Little Lamb, Twinkle Twinkle and Frère Jacques.',
      },
      {
        kind: 'check',
        question: 'Which fret of the B (Si) string is D (Re)?',
        options: ['Fret 3', 'Fret 1', 'Fret 5', 'Fret 2'],
        answer: 'Fret 3',
        explain: 'On the B (Si) string, fret 1 is C (Do), **fret 3 is D (Re)** and fret 5 is E (Mi).',
      },
      {
        kind: 'check',
        question: 'How long do you hold the first E (Mi) in bar 4?',
        options: ['One and a half beats', 'One beat', 'Two beats', 'Half a beat'],
        answer: 'One and a half beats',
        explain: 'The first E (Mi) lasts 1½ beats, the quick D (Re) half a beat, the last D (Re) two beats: **one full bar**.',
      },
    ],
  },
  {
    id: 'twinkle-and-jacques',
    unit: UNIT,
    title: 'Twinkle and Frère Jacques',
    goal: 'Play two more tunes, and hear the difference between a step and a leap.',
    steps: [
      {
        kind: 'explain',
        headline: 'Step or leap?',
        visual: { kind: 'illustration', name: 'leap-vs-step' },
        points: [
          'A **step** moves to the neighbouring note.',
          'A **leap** jumps over the notes in between.',
          'Twinkle, Twinkle opens with a leap: ==Do up to Sol==.',
        ],
        tip: 'A French tune from 1761: Do Do Sol Sol La La Sol.',
      },
      {
        kind: 'explain',
        headline: 'Where Twinkle lives',
        visual: {
          kind: 'neck',
          fretRange: [0, 6],
          dots: [
            { stringIndex: 4, fret: 1, label: 'solfege' },
            { stringIndex: 5, fret: 3, label: 'solfege' },
            { stringIndex: 5, fret: 5, label: 'solfege' },
          ],
          highlightStrings: [4, 5],
          tapToHear: true,
        },
        points: [
          'Do is C (Do), fret 1 of the B (Si) string.',
          'Sol is G (Sol), fret 3 of the high E (Mi) string.',
          'La is A (La), fret 5 of the same string. ==Slide your hand up==, then back.',
        ],
      },
      {
        kind: 'song',
        songId: 'twinkle-twinkle',
        caption: 'Sing the syllables as you play. Slow the player down until the leap from Do to Sol feels easy.',
      },
      {
        kind: 'explain',
        headline: 'Frère Jacques opens Do Re Mi Do',
        visual: { kind: 'notes', notes: ['C', 'D', 'E', 'C'] },
        points: [
          'It is a **round**: people start one after another, so the parts overlap.',
          'Every phrase is played ==twice==: easy to remember.',
        ],
        tip: 'Ask a friend to start two bars behind you.',
      },
      {
        kind: 'song',
        songId: 'frere-jacques',
        caption: 'The final Sol is the **open G (Sol) string**, below the Do. Play it slowly first.',
      },
      {
        kind: 'listen',
        caption: 'Play the opening of Frère Jacques: **Do, Re, Mi, Do**.',
        targets: [
          { stringIndex: 4, fret: 1 },
          { stringIndex: 4, fret: 3 },
          { stringIndex: 5, fret: 0 },
          { stringIndex: 4, fret: 1 },
        ],
      },
      {
        kind: 'check',
        question: 'What is a leap in a melody?',
        options: [
          'A jump past the neighbouring notes',
          'Moving to the very next note, up or down',
          'A note held for four beats',
          'A rest in the music',
        ],
        answer: 'A jump past the neighbouring notes',
        explain: 'A step moves to the next note of the scale. A **leap** skips some. Twinkle, Twinkle opens with Do up to Sol.',
      },
      {
        kind: 'check',
        question: 'Which fret of the high E (Mi) string is A (La)?',
        options: ['Fret 5', 'Fret 4', 'Fret 3', 'Fret 7'],
        answer: 'Fret 5',
        explain: 'G (Sol) is fret 3. A (La) is a whole step up, **two frets higher**, at fret 5. Fret 4 is G# (Sol#).',
      },
      {
        kind: 'check',
        question: 'What is a round?',
        options: [
          'A song that people start one after another, so the parts overlap',
          'A song with no end',
          'A song that only repeats its chorus',
          'A song played on one string',
        ],
        answer: 'A song that people start one after another, so the parts overlap',
        explain: 'It works as a round because its phrases **fit together** when the second voice comes in two bars late.',
      },
    ],
  },
  {
    id: 'note-lengths',
    unit: UNIT,
    title: 'Note lengths',
    goal: 'Know how many beats a whole, half, quarter, eighth and dotted note lasts, and play them in time.',
    steps: [
      {
        kind: 'explain',
        headline: 'Notes have lengths in beats',
        visual: { kind: 'illustration', name: 'note-lengths' },
        points: [
          'In 4/4: whole = **4 beats**, half = 2, quarter = 1, eighth = ½.',
          'Each is half the last: 1 whole = 2 halves = 4 quarters = 8 eighths.',
        ],
        tip: 'A ==dot== adds half again: dotted half = 3 beats.',
      },
      {
        kind: 'riff',
        riffId: 'rhythm-ladder',
        caption: 'Open G (Sol) string only, so timing is all that matters: one note, then 2, 4, 8. Count aloud. **Eighths: down-up.**',
      },
      {
        kind: 'explain',
        headline: 'Jingle Bells: a dotted rhythm',
        visual: { kind: 'notes', notes: ['E', 'G', 'C', 'D'] },
        points: [
          'Chorus bar 3: E (Mi) on beat 1, G (Sol) on beat 2.',
          'Then a **dotted quarter** (1½ beats) C (Do) on beat 3.',
          'A quick eighth D (Re) lands on the "&" of 4.',
        ],
        tip: 'Count ==1 2 3 4 &==.',
      },
      {
        kind: 'song',
        songId: 'jingle-bells',
        caption: 'Clap bar 3 before you play it, then play the whole chorus slowly.',
      },
      {
        kind: 'check',
        question: 'How many beats does a half note last in 4/4?',
        options: ['1 beat', '2 beats', '3 beats', '4 beats'],
        answer: '2 beats',
        explain: 'A half note is **half of a whole note**, and a whole note fills a 4-beat bar.',
      },
      {
        kind: 'check',
        question: 'How long does a dotted half note last?',
        options: ['3 beats', '2 beats', '2½ beats', '4 beats'],
        answer: '3 beats',
        explain: 'A dotted half is 2 beats plus half of that again, 1 more beat. That makes **3**.',
      },
      {
        kind: 'check',
        question: 'How many eighth notes fill one bar of 4/4?',
        options: ['2', '4', '8', '16'],
        answer: '8',
        explain: 'Eighth notes are half a beat long: **two per beat**, eight in a bar of four beats.',
      },
    ],
  },
];
