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
        kind: 'text',
        title: 'Do Re Mi Fa Sol La Si Do',
        body: [
          'A scale is a set of notes in order from low to high. The major scale is the one behind Do Re Mi. Starting on C (Do) it uses only natural notes: C (Do), D (Re), E (Mi), F (Fa), G (Sol), A (La), B (Si), C (Do).',
          'Its recipe is whole, whole, half, whole, whole, whole, half. The two half steps fall between E (Mi) and F (Fa), and between B (Si) and C (Do): the same two places you found in "The musical alphabet".',
          'Start that recipe on any other note and you get that note\'s major scale, with sharps or flats where the recipe needs them. Learn the pattern once and it works everywhere.',
        ],
      },
      {
        kind: 'fretboard',
        caption:
          'One octave of C (Do) major in first position. Start with your ring finger on fret 3 of the A (La) string, then climb string by string.',
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
        kind: 'text',
        title: 'Fingers for the scale',
        body: [
          'C (Do) is your ring finger. On the D (Re) string, the open string is D (Re), the middle finger plays E (Mi) and the ring finger plays F (Fa). On the G (Sol) string, the open string is G (Sol) and the middle finger plays A (La). On the B (Si) string, the open string is B (Si) and the index finger plays C (Do).',
        ],
      },
      {
        kind: 'riff',
        riffId: 'c-major-scale',
        caption:
          'Up and back down. Say Do Re Mi Fa Sol La Si Do out loud as you play, and listen for the two smaller steps, Mi to Fa and Si to Do.',
      },
      {
        kind: 'listen',
        caption: 'Play the first three notes of the scale, Do Re Mi, on your own guitar.',
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
        explain:
          'The pattern is whole, whole, half, whole, whole, whole, half. The halves land on Mi to Fa and on Si to Do: E (Mi) to F (Fa) and B (Si) to C (Do), one fret apart.',
      },
      {
        kind: 'check',
        question: 'How many sharps or flats does the C (Do) major scale have?',
        options: ['None: it uses only natural notes', 'One', 'Two', 'Seven'],
        answer: 'None: it uses only natural notes',
        explain:
          'The major-scale recipe, started on C (Do), lands on natural notes the whole way up. That is why it is the scale everyone learns first.',
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
        explain:
          'The second option is the natural minor scale, which moves its half steps to different places and sounds darker.',
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
        kind: 'text',
        title: 'Solfège first',
        body: [
          'Ode to Joy is a great first melody. Beethoven wrote it in 1824, and it moves almost entirely by steps, so your hand barely travels. Learn the tune in solfège before you touch the guitar.',
          'The opening goes Mi Mi Fa Sol, Sol Fa Mi Re, Do Do Re Mi, Mi Re Re. Sing it a few times. A tune you can sing is a tune your fingers can find.',
        ],
      },
      {
        kind: 'text',
        title: 'Where the notes live',
        body: [
          'It all happens on the two thinnest strings. Mi is the open high E (Mi) string, Fa is F (Fa) at fret 1, and Sol is G (Sol) at fret 3. On the B (Si) string, Do is C (Do) at fret 1 and Re is D (Re) at fret 3.',
          'Use your index finger for fret 1 and your ring finger for fret 3 on both strings. Pick every note separately, even the repeated ones.',
          'Bar 4 has a long-short rhythm: hold the first E (Mi) for one and a half beats, play a quick D (Re), then hold the next D (Re) for two beats.',
        ],
      },
      {
        kind: 'song',
        songId: 'ode-to-joy',
        caption: 'Sing the syllables while you watch the tab, then play along with the speed turned down.',
      },
      {
        kind: 'listen',
        caption: 'Play the falling line from bar 2: Sol, Fa, Mi, Re.',
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
        explain:
          'Ode to Joy climbs Mi Mi Fa Sol and walks back down Sol Fa Mi Re. The other lines open Mary Had a Little Lamb, Twinkle Twinkle and Frère Jacques.',
      },
      {
        kind: 'check',
        question: 'Which fret of the B (Si) string is D (Re)?',
        options: ['Fret 3', 'Fret 1', 'Fret 5', 'Fret 2'],
        answer: 'Fret 3',
        explain: 'On the B (Si) string, fret 1 is C (Do), fret 3 is D (Re) and fret 5 is E (Mi).',
      },
      {
        kind: 'check',
        question: 'How long do you hold the first E (Mi) in bar 4?',
        options: ['One and a half beats', 'One beat', 'Two beats', 'Half a beat'],
        answer: 'One and a half beats',
        explain:
          'The first E (Mi) lasts one and a half beats, the quick D (Re) half a beat, and the last D (Re) two beats. Together they fill exactly one bar.',
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
        kind: 'text',
        title: 'Twinkle, Twinkle',
        body: [
          'Twinkle, Twinkle is a French tune from 1761. It opens Do Do Sol Sol La La Sol. The first move, Do up to Sol, is a leap: a jump over the notes in between, instead of a step to a neighbour.',
          'On the neck: Do is C (Do) at fret 1 of the B (Si) string, Sol is G (Sol) at fret 3 of the high E (Mi) string, and La is A (La) at fret 5 of the same string. For fret 5, let your hand slide up the neck a little, then slide back.',
        ],
      },
      {
        kind: 'song',
        songId: 'twinkle-twinkle',
        caption: 'Sing the syllables as you play. Slow down the player until the leap from Do to Sol feels easy.',
      },
      {
        kind: 'text',
        title: 'Frère Jacques',
        body: [
          'Frère Jacques is a round: a song that people start one after another, so the parts overlap. On your own it goes Do Re Mi Do twice, Mi Fa Sol twice, Sol La Sol Fa Mi Do twice, and Do Sol Do twice.',
          'Notice that every phrase is played twice. That repetition is the easiest way to remember a tune. Once it is steady, ask a friend to start the same tune two bars behind you.',
        ],
      },
      {
        kind: 'song',
        songId: 'frere-jacques',
        caption: 'The final Sol is the open G (Sol) string, below the Do. Play it slowly first.',
      },
      {
        kind: 'listen',
        caption: 'Play the opening of Frère Jacques: Do, Re, Mi, Do.',
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
        explain:
          'A step moves to the next note of the scale. A leap skips over some. Twinkle, Twinkle opens with a leap from Do up to Sol.',
      },
      {
        kind: 'check',
        question: 'Which fret of the high E (Mi) string is A (La)?',
        options: ['Fret 5', 'Fret 4', 'Fret 3', 'Fret 7'],
        answer: 'Fret 5',
        explain:
          'G (Sol) is fret 3. A (La) is a whole step above it, two frets higher, at fret 5. Fret 4 is G# (Sol#).',
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
        explain: 'Frère Jacques works as a round because its phrases fit together when the second voice comes in two bars late.',
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
        kind: 'text',
        title: 'Counting lengths',
        body: [
          'Every note has a length, counted in beats. In 4/4: a whole note lasts 4 beats (a full bar), a half note lasts 2, a quarter note lasts 1, and an eighth note lasts half a beat.',
          'A dot after a note adds half its length again. A dotted half note lasts 3 beats (2 + 1). A dotted quarter lasts 1½ beats (1 + ½).',
          'Each length is half the one before: 1 whole = 2 halves = 4 quarters = 8 eighths.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'rhythm-ladder',
        caption:
          'Only the open G (Sol) string, so you can focus on timing: one note in the first bar, then two, four and eight. Count aloud. Use down-up picking for the eighths: down on the numbers, up on the "&".',
      },
      {
        kind: 'text',
        title: 'A dotted rhythm in a tune',
        body: [
          'Jingle Bells has a dotted rhythm in bar 3 of the chorus: E (Mi) and G (Sol) on beats 1 and 2, then a dotted quarter C (Do), and a quick eighth D (Re).',
          'Count "1 2 3 4 &": play C (Do) on 3, hold it through 4, and land D (Re) on the "&" of 4.',
        ],
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
        explain: 'A half note is half of a whole note, and a whole note fills a 4-beat bar.',
      },
      {
        kind: 'check',
        question: 'How long does a dotted half note last?',
        options: ['3 beats', '2 beats', '2½ beats', '4 beats'],
        answer: '3 beats',
        explain: 'A dotted half is 2 beats plus half of that again, 1 more beat, which makes 3.',
      },
      {
        kind: 'check',
        question: 'How many eighth notes fill one bar of 4/4?',
        options: ['2', '4', '8', '16'],
        answer: '8',
        explain: 'Eighth notes are half a beat long, so there are two in each beat and eight in a bar of four beats.',
      },
    ],
  },
];
