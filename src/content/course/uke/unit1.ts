import type { Lesson } from '../../lessons';

const UNIT = 'Meet the ukulele';

/** Strings in string-index order: 0 = the high G (string 4) up to 3 = the A (string 1). */
const openStrings = [0, 1, 2, 3].map((stringIndex) => ({ stringIndex, fret: 0 }));

/** Lessons 1-4: from holding the ukulele to your first strum. */
export const UKE_UNIT_1: readonly Lesson[] = [
  {
    id: 'uke-meet',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Meet your ukulele',
    goal: 'Name the parts of the ukulele and hold it so it feels easy.',
    steps: [
      {
        kind: 'explain',
        headline: 'Four strings, one small body',
        visual: { kind: 'illustration', name: 'uke-parts' },
        points: [
          'A ukulele has ==four nylon strings==, soft on your fingertips.',
          'Press a string on a **fret**, a metal bar on the neck, to change its note.',
        ],
        tip: 'Fret 1 is the one nearest the headstock.',
      },
      {
        kind: 'explain',
        headline: 'Hug it close',
        visual: { kind: 'illustration', name: 'uke-holding' },
        points: [
          'Rest it against your chest and ==hug it in with your strumming arm==.',
          'Your fretting hand only guides the neck. Keep the thumb **behind** it.',
        ],
        warn: 'Gripping the neck to hold it up? ==Use your arm instead.==',
      },
      {
        kind: 'listen',
        caption: 'Pluck the string **nearest the floor** with your thumb. It is the A (La) string. No mic? Skip it.',
        targets: [{ stringIndex: 3, fret: 0 }],
      },
      {
        kind: 'check',
        question: 'Which note is the string nearest the floor?',
        options: ['A (La)', 'G (Sol)', 'C (Do)', 'E (Mi)'],
        answer: 'A (La)',
        explain: 'Hold it as shown and the **A (La) string** is nearest the floor. It is string 1, the first one.',
      },
      {
        kind: 'check',
        question: 'Where does the ukulele rest while you play?',
        options: [
          'Against your chest, hugged in by your forearm',
          'On your knee, held up by the fretting hand',
          'Flat on a table',
          'Hanging low by your belt',
        ],
        answer: 'Against your chest, hugged in by your forearm',
        explain: 'Your **arm** holds the ukulele still, so both hands are free to play.',
      },
      {
        kind: 'check',
        question: 'Your fretting hand tires from holding the ukulele up. What helps?',
        options: [
          'Hug it in with your strumming arm',
          'Squeeze the neck harder',
          'Hold it further from your body',
          'Rest it on your fretting thumb',
        ],
        answer: 'Hug it in with your strumming arm',
        explain: 'The fretting hand should only **guide** the neck. Hugging it in lets that hand relax.',
      },
    ],
  },
  {
    id: 'uke-strings',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Four strings, four names',
    goal: 'Name all four open strings and know why the 4th string sounds high.',
    steps: [
      {
        kind: 'explain',
        headline: 'Four strings, four names',
        visual: { kind: 'illustration', name: 'uke-string-order' },
        points: [
          'From your chin to the floor: ==G C E A==.',
          'Number them from the floor: A (La) is string **1**, G (Sol) is string 4.',
          'Remember it: **Goats Chew Every Apple**.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Four notes to learn',
        visual: { kind: 'notes', notes: ['G', 'C', 'E', 'A'] },
        points: [
          'The open strings are G (Sol), C (Do), E (Mi), A (La).',
          'Strum them together and they ==already sound happy==: C (Do), E (Mi) and G (Sol) make a C (Do) chord.',
        ],
      },
      {
        kind: 'explain',
        headline: 'The odd one out: the high G (Sol)',
        visual: { kind: 'illustration', name: 'uke-reentrant' },
        points: [
          'Normally the string nearest your chin is the lowest.',
          'Not here: G (Sol) sounds ==higher than C (Do)== next to it.',
          'That is **re-entrant** tuning: the ukulele\'s bright, chiming sound.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Low to high: the real order',
        visual: { kind: 'notes', notes: ['C', 'E', 'G', 'A'] },
        points: [
          'By pitch, low to high: C (Do), E (Mi), G (Sol), A (La).',
          'The C (Do) string is the ==lowest sound== on the whole ukulele.',
        ],
        tip: 'Pluck the strings in order: it sounds like ==my dog has fleas==.',
      },
      {
        kind: 'fretboard',
        caption: 'The four open strings. **Tap each dot** and hear that the 4th string, G (Sol), sits higher than C (Do).',
        fretRange: [0, 2],
        positions: openStrings,
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'uke-open-strings-walk',
        caption: 'Pluck along with the tab: G C E A, then back down. **Say the names** as you go.',
      },
      {
        kind: 'listen',
        caption: 'Pluck each open string with your thumb, **G (Sol) first**, then C (Do), E (Mi), A (La). No mic? Skip it.',
        targets: openStrings,
      },
      {
        kind: 'check',
        question: 'Counting from the floor, which string number is the C (Do) string?',
        options: ['String 1', 'String 2', 'String 3', 'String 4'],
        answer: 'String 3',
        explain: 'From the floor: A (La) is string 1, E (Mi) 2, ==C (Do) is string 3==, G (Sol) 4.',
      },
      {
        kind: 'check',
        question: 'Which open string sounds the lowest of the four?',
        options: ['C (Do)', 'G (Sol)', 'E (Mi)', 'A (La)'],
        answer: 'C (Do)',
        explain: 'The **C (Do) string** is the lowest. The 4th string, G (Sol), sounds higher: that is re-entrant tuning.',
      },
      {
        kind: 'check',
        question: 'In "Goats Chew Every Apple", which word stands for the E (Mi) string?',
        options: ['Goats', 'Chew', 'Every', 'Apple'],
        answer: 'Every',
        explain: 'The first letters spell the strings from your chin down: **G**oats, **C**hew, ==Every==, **A**pple.',
      },
    ],
  },
  {
    id: 'uke-tuning',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Tune your ukulele',
    goal: 'Tune all four strings with the tuner, and check them against each other by ear.',
    steps: [
      {
        kind: 'explain',
        headline: 'Tighten = higher',
        visual: { kind: 'illustration', name: 'uke-tuning-peg' },
        points: [
          'Strings drift out of tune, new nylon ones most. ==Tune before you play.==',
          'Tighten a string and its note goes **up**. Loosen it and it goes down.',
        ],
        tip: 'Pluck, let it ring, turn a little, pluck again.',
      },
      {
        kind: 'explain',
        headline: 'Read the needle',
        visual: { kind: 'illustration', name: 'tuner-needle' },
        points: [
          'Left of centre: too low. Tighten the peg.',
          'Right of centre: too high. Loosen it.',
          'Dead centre, in green: ==in tune==.',
        ],
        warn: 'Went too high? Drop **below** the note, then tighten up to it.',
      },
      { kind: 'tuner' },
      {
        kind: 'explain',
        headline: 'No tuner? Use frets 4, 5 and 3',
        visual: {
          kind: 'neck',
          fretRange: [0, 5],
          dots: [
            { stringIndex: 1, fret: 4 },
            { stringIndex: 2, fret: 0 },
            { stringIndex: 2, fret: 5 },
            { stringIndex: 3, fret: 0 },
            { stringIndex: 2, fret: 3 },
            { stringIndex: 0, fret: 0 },
          ],
          highlightStrings: [0, 1, 2, 3],
          tapToHear: true,
        },
        points: [
          'C (Do) string, **fret 4**: sounds like the open E (Mi) string.',
          'E (Mi) string: **fret 5** matches open A (La), and fret 3 matches open G (Sol).',
        ],
        tip: 'Tap both dots of a pair. ==Same colour, same note.==',
      },
      {
        kind: 'fretboard',
        caption: 'Each fretted dot sounds like the open string beside it. **Tap both** and listen for the match.',
        fretRange: [0, 5],
        positions: [
          { stringIndex: 1, fret: 4 },
          { stringIndex: 2, fret: 0 },
          { stringIndex: 2, fret: 5 },
          { stringIndex: 3, fret: 0 },
          { stringIndex: 2, fret: 3 },
          { stringIndex: 0, fret: 0 },
        ],
        tapToHear: true,
      },
      {
        kind: 'listen',
        caption: 'Press the C (Do) string at **fret 4** and pluck it. Then pluck the open E (Mi) string: they should match.',
        targets: [{ stringIndex: 1, fret: 4 }],
      },
      {
        kind: 'check',
        question: 'You are tuning the E (Mi) string by ear against the C (Do) string. Where do you press the C (Do)?',
        options: ['4th fret', '5th fret', '7th fret', '12th fret'],
        answer: '4th fret',
        explain: '**Fret 4** of the C (Do) string is E (Mi), the open string next door. Fret 12 is C (Do) again, an octave up.',
      },
      {
        kind: 'check',
        question: 'To tune the open G (Sol) string by ear, where on the E (Mi) string do you press?',
        options: [
          'Fret 3 of the E (Mi) string',
          'Fret 5 of the E (Mi) string',
          'Fret 4 of the E (Mi) string',
          'Fret 7 of the E (Mi) string',
        ],
        answer: 'Fret 3 of the E (Mi) string',
        explain: '**Fret 3** of the E (Mi) string is G (Sol). Fret 5 there is A (La), the open string on the other side.',
      },
      {
        kind: 'check',
        question: 'You turn a peg too far and the string is now too high. What is the best fix?',
        options: [
          'Lower it below the note, then tighten back up to it',
          'Leave it: close is good enough',
          'Pluck it more softly',
          'Loosen it to the note and stop',
        ],
        answer: 'Lower it below the note, then tighten back up to it',
        explain: 'Coming up to the note **from below** keeps the string tight against the peg, so it stays in tune.',
      },
    ],
  },
  {
    id: 'uke-first-strum',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Your first strum',
    goal: 'Strum all four open strings with a steady downward sweep, in time.',
    steps: [
      {
        kind: 'explain',
        headline: 'Brush down, loosely',
        visual: { kind: 'illustration', name: 'uke-strum-hand' },
        points: [
          'Sweep ==down across all four strings== with the nail of your index finger.',
          'Aim where the neck meets the body. Swing from a **loose wrist**.',
        ],
        tip: 'Your thumb works too: use whichever feels easier.',
      },
      {
        kind: 'explain',
        headline: 'Four beats to a bar',
        visual: { kind: 'illustration', name: 'beats-bar' },
        points: [
          'Music has a pulse. Each tap is a **beat**.',
          'Count ==1 2 3 4==, one downstroke on each number.',
        ],
        tip: '**bpm** = beats per minute. At 60 bpm, one beat per second.',
      },
      {
        kind: 'riff',
        riffId: 'uke-open-strum',
        caption: 'Four bars, one downstroke on every beat. **Count 1 2 3 4** out loud and keep your hand moving.',
      },
      {
        kind: 'explain',
        headline: 'Slow beats fast',
        visual: { kind: 'illustration', name: 'slow-loop' },
        points: [
          'Play at the speed where you ==never stop==.',
          'Add **5 bpm** only when it feels clean.',
        ],
        tip: 'Quiet and even beats loud and wobbly.',
      },
      {
        kind: 'check',
        question: 'At 120 bpm, how long is one beat?',
        options: ['Half a second', 'One second', 'Two seconds', 'A quarter of a second'],
        answer: 'Half a second',
        explain: '120 beats a minute is **two beats every second**, so each beat lasts half a second.',
      },
      {
        kind: 'check',
        question: 'Where on the ukulele do you aim your strum?',
        options: [
          'Where the neck meets the body',
          'Right beside the bridge',
          'Up by the headstock',
          'Over the 5th fret',
        ],
        answer: 'Where the neck meets the body',
        explain: 'Near the neck joint the sound is **round and full**. Close to the bridge it turns thin and harsh.',
      },
      {
        kind: 'check',
        question: 'Your strum sounds harsh and clicky. What do you change?',
        options: [
          'Loosen your wrist and aim nearer the neck joint',
          'Strum harder',
          'Move closer to the bridge',
          'Press harder on the frets',
        ],
        answer: 'Loosen your wrist and aim nearer the neck joint',
        explain: 'A **stiff wrist** near the bridge clicks. Relax it and move toward the neck for a warm sound.',
      },
    ],
  },
];
