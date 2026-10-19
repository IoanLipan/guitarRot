import type { Lesson } from '../lessons';

const UNIT = 'Start here';

const openStrings = [0, 1, 2, 3, 4, 5].map((stringIndex) => ({ stringIndex, fret: 0 }));

/** Lessons 1-4: from holding the guitar to your first fretted notes. */
export const UNIT_1: readonly Lesson[] = [
  {
    id: 'strings',
    unit: UNIT,
    title: 'Six strings, six names',
    goal: 'Name all six open strings, from the thickest to the thinnest.',
    steps: [
      {
        kind: 'explain',
        headline: 'Meet your guitar',
        visual: { kind: 'illustration', name: 'guitar-parts' },
        points: [
          'A guitar has ==six strings==, each tuned to a different note.',
          'Press a string against a **fret**, a metal bar on the neck, to change its note.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Number them from the thin one',
        visual: { kind: 'illustration', name: 'string-order' },
        points: [
          'String 1 is the **thinnest**. String 6 is the thickest.',
          'Looking down, the thickest string is on top.',
          '==Thick = low sound. Thin = high sound.==',
        ],
      },
      {
        kind: 'explain',
        headline: 'Thick to thin: six notes',
        visual: { kind: 'notes', notes: ['E', 'A', 'D', 'G', 'B', 'E'] },
        points: [
          'Both ends are **E (Mi)**: string 6 and string 1, two octaves apart.',
          'In between: A (La), D (Re), G (Sol), B (Si).',
        ],
        tip: 'Say it out loud: ==Eddie Ate Dynamite, Good Bye Eddie==.',
      },
      {
        kind: 'explain',
        headline: 'Sit so it feels easy',
        visual: { kind: 'illustration', name: 'posture' },
        points: [
          'Guitar on your thigh, neck tilted slightly **up**.',
          'Right-handed? Rest it on your right leg and fret with your left hand.',
          'Left-handed? Mirror everything.',
        ],
        warn: 'Shoulders up by your ears? Let them drop. ==Nothing about guitar should hurt.==',
      },
      {
        kind: 'fretboard',
        caption: 'The six open strings. Tap each dot: **thicker string, lower note.**',
        fretRange: [0, 2],
        positions: openStrings,
        tapToHear: true,
      },
      {
        kind: 'listen',
        caption: 'Pluck each open string, **thickest first**. App can\'t hear you? Skip it: the next lesson fixes your tuning.',
        targets: openStrings,
      },
      {
        kind: 'check',
        question: 'You pluck the thickest string. Which note is it?',
        options: ['E (Mi)', 'A (La)', 'D (Re)', 'B (Si)'],
        answer: 'E (Mi)',
        explain: 'The thickest string, **string 6**, is E (Mi). The thinnest, string 1, is E (Mi) too, two octaves up.',
      },
      {
        kind: 'check',
        question: 'Counting from the thinnest string, which string number is the D (Re) string?',
        options: ['String 2', 'String 3', 'String 4', 'String 5'],
        answer: 'String 4',
        explain: 'Thinnest first: 1 E (Mi), 2 B (Si), 3 G (Sol), then D (Re) is ==string 4==, A (La) 5, E (Mi) 6.',
      },
      {
        kind: 'check',
        question: 'In "Eddie Ate Dynamite, Good Bye Eddie", which word stands for the B (Si) string?',
        options: ['Good', 'Bye', 'Dynamite', 'Ate'],
        answer: 'Bye',
        explain: 'The words run thick to thin: Eddie, Ate, Dynamite, Good, ==Bye==, Eddie. Bye is the second-thinnest string: B (Si).',
      },
    ],
  },
  {
    id: 'tuning',
    unit: UNIT,
    title: 'Tune your guitar',
    goal: 'Tune all six strings with the tuner, and check them against each other by ear.',
    steps: [
      {
        kind: 'explain',
        headline: 'Tighten = higher',
        visual: { kind: 'illustration', name: 'tuning-peg' },
        points: [
          'Strings drift out of tune, new ones most. ==Tune before you play.==',
          'Tighten the string and the note goes **up**. Loosen it and it goes down.',
        ],
        tip: 'Pluck firmly once and let it ring while you turn the peg in small steps.',
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
        warn: 'Went too high? Drop **below** the note, then tighten back up to it. It stays in tune longer.',
      },
      { kind: 'tuner' },
      {
        kind: 'explain',
        headline: 'No tuner? Use fret 5',
        visual: {
          kind: 'neck',
          fretRange: [0, 5],
          dots: [
            { stringIndex: 0, fret: 5 },
            { stringIndex: 1, fret: 0 },
            { stringIndex: 1, fret: 5 },
            { stringIndex: 2, fret: 0 },
            { stringIndex: 2, fret: 5 },
            { stringIndex: 3, fret: 0 },
          ],
          highlightStrings: [0, 1, 2, 3],
          tapToHear: true,
        },
        points: [
          'Press the low E (Mi) string at **fret 5**. It sounds like the open A (La) string.',
          'Same trick: A (La) matches D (Re), and D (Re) matches G (Sol).',
        ],
        tip: 'Tap both dots of a pair. ==Same colour, same note.==',
      },
      {
        kind: 'explain',
        headline: 'G (Sol) to B (Si): fret 4',
        visual: {
          kind: 'neck',
          fretRange: [0, 5],
          dots: [
            { stringIndex: 3, fret: 4 },
            { stringIndex: 4, fret: 0 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 5, fret: 0 },
          ],
          highlightStrings: [3, 4, 5],
          tapToHear: true,
        },
        points: [
          'The G (Sol) string is the odd one out: press it at ==fret 4== to match the open B (Si).',
          'Then press B (Si) at fret 5 to match the open high E (Mi).',
        ],
        tip: 'Two strings almost in tune make a slow wobble. **Turn the peg until the wobble fades.**',
      },
      {
        kind: 'fretboard',
        caption: 'Each fretted dot sounds like the open string beside it. **Tap both** and listen for the match.',
        fretRange: [0, 5],
        positions: [
          { stringIndex: 0, fret: 5 },
          { stringIndex: 1, fret: 0 },
          { stringIndex: 1, fret: 5 },
          { stringIndex: 2, fret: 0 },
          { stringIndex: 2, fret: 5 },
          { stringIndex: 3, fret: 0 },
          { stringIndex: 3, fret: 4 },
          { stringIndex: 4, fret: 0 },
          { stringIndex: 4, fret: 5 },
          { stringIndex: 5, fret: 0 },
        ],
        tapToHear: true,
      },
      {
        kind: 'listen',
        caption: 'Press the low E (Mi) string at **fret 5** and pluck it. Then pluck the open A (La) string: they should match.',
        targets: [{ stringIndex: 0, fret: 5 }],
      },
      {
        kind: 'check',
        question: 'You are tuning the A (La) string by ear against the low E (Mi) string. Where do you press the low E (Mi)?',
        options: ['5th fret', '4th fret', '7th fret', '12th fret'],
        answer: '5th fret',
        explain: '**Fret 5** of the low E (Mi) string is A (La), the open string next door. Fret 12 is E (Mi) again, an octave up.',
      },
      {
        kind: 'check',
        question: 'Which string uses the 4th fret instead of the 5th for this method?',
        options: ['The G (Sol) string', 'The D (Re) string', 'The B (Si) string', 'The A (La) string'],
        answer: 'The G (Sol) string',
        explain: 'The gap from G (Sol) up to B (Si) is **one fret smaller** than the other string gaps, so G (Sol) uses fret 4.',
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
    id: 'tab',
    unit: UNIT,
    title: 'Read tab in two minutes',
    goal: 'Read a line of tab and play it, one string at a time.',
    steps: [
      {
        kind: 'explain',
        headline: 'Tab: six lines, six strings',
        visual: { kind: 'illustration', name: 'tab-map' },
        points: [
          'One line per string. The **top line** is the thinnest string, string 1.',
          'Higher line, higher sound. Lower line, lower sound.',
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
            { stringIndex: 0, fret: 0, label: '0' },
            { stringIndex: 0, fret: 3, label: '3' },
          ],
          highlightStrings: [0],
        },
        points: [
          'The number on a line is the **fret** to press on that string.',
          '==0 = open string==: no finger down.',
        ],
        tip: 'Numbers stacked in one column are played together.',
      },
      {
        kind: 'explain',
        headline: 'Hold the pick',
        visual: { kind: 'illustration', name: 'pick-grip' },
        points: [
          'Pick between your **thumb pad** and the side of your index finger.',
          'Only the **tip** shows. Firm enough not to fall out, loose enough not to rattle.',
          'Pick down, with a small move from the wrist.',
        ],
        tip: 'Aim for ==one clean note per pick==.',
      },
      {
        kind: 'riff',
        riffId: 'open-strings-walk',
        caption: 'All zeros: nothing to fret. **Thick to thin**, the thin one twice, then back down. Follow the tab as it plays.',
      },
      {
        kind: 'check',
        question: 'In tab, which line is the thinnest string (string 1)?',
        options: ['The top line', 'The bottom line', 'The middle', 'The second line from the bottom'],
        answer: 'The top line',
        explain: '**Top line** = thinnest and highest sound. Bottom line = thickest and lowest.',
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
        question: 'Two numbers stacked in the same column of a tab mean…',
        options: [
          'Play both strings at the same moment',
          'Play them one after the other, top first',
          'Choose whichever you prefer',
          'Play the bigger number twice',
        ],
        answer: 'Play both strings at the same moment',
        explain: 'Left to right is time. Notes in the **same column** happen together: that is how chords look in tab.',
      },
    ],
  },
  {
    id: 'first-notes',
    unit: UNIT,
    title: 'Your first fretted notes',
    goal: 'Fret E (Mi), F (Fa) and G (Sol) on the thinnest string and play a tiny melody.',
    steps: [
      {
        kind: 'explain',
        headline: 'Press just behind the fret',
        visual: { kind: 'illustration', name: 'fret-finger' },
        points: [
          'Fingertip goes ==just behind the fret wire==, the metal bar.',
          'Not on top of it. Not in the middle of the gap.',
          'Close to the wire, **light pressure** is enough.',
        ],
      },
      {
        kind: 'explain',
        headline: 'One finger per fret',
        visual: { kind: 'illustration', name: 'finger-numbers' },
        points: [
          'Index = fret 1, middle = 2, ring = 3, pinky = 4.',
          'Curve your fingers so only the **tips** touch the strings.',
          'Thumb stays behind the neck. Don\'t squeeze.',
        ],
        tip: '==One finger per fret== keeps your hand in one place.',
      },
      {
        kind: 'fretboard',
        caption: 'Thinnest string: open **E (Mi)**, fret 1 **F (Fa)**, fret 3 **G (Sol)**. Fret 2 waits for later. Tap to hear.',
        fretRange: [0, 4],
        positions: [
          { stringIndex: 5, fret: 0 },
          { stringIndex: 5, fret: 1 },
          { stringIndex: 5, fret: 3 },
        ],
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'mi-fa-sol',
        caption: 'E (Mi), F (Fa), G (Sol) and back. **Say the names as you play**: Mi Fa Sol Fa Mi.',
      },
      {
        kind: 'listen',
        caption: 'Now play the three notes in order, slowly. **One clean note at a time.**',
        targets: [
          { stringIndex: 5, fret: 0 },
          { stringIndex: 5, fret: 1 },
          { stringIndex: 5, fret: 3 },
        ],
      },
      {
        kind: 'explain',
        headline: 'Buzz or a dead note?',
        visual: { kind: 'illustration', name: 'fret-finger' },
        points: [
          '**Buzz**: your finger is too far from the wire. Slide closer, press a bit firmer.',
          '**Dull thud**: another finger is touching the string. Curve it more.',
        ],
        tip: 'Sore fingertips are normal for 1–2 weeks. ==Short bursts== toughen the skin.',
      },
      {
        kind: 'check',
        question: 'Which fret of the thinnest string gives you F (Fa)?',
        options: ['Fret 1', 'Fret 2', 'Fret 3', 'Fret 5'],
        answer: 'Fret 1',
        explain: 'F (Fa) is **one fret** above the open E (Mi). Fret 2 is F# (Fa#), fret 3 is G (Sol).',
      },
      {
        kind: 'check',
        question: 'Where does your fingertip go to play fret 3?',
        options: [
          'Right behind the 3rd fret wire, on the headstock side',
          'On top of the 3rd fret wire',
          'In the middle of the gap between fret 2 and fret 3',
          'Just past the 3rd fret wire, on the body side',
        ],
        answer: 'Right behind the 3rd fret wire, on the headstock side',
        explain: 'The string sounds from the wire your finger presses against. **Right behind it** needs the least force.',
      },
      {
        kind: 'check',
        question: 'Your fretted note buzzes. What do you try first?',
        options: [
          'Move your fingertip closer to the fret wire and press a little firmer',
          'Squeeze the neck as hard as you can',
          'Move your finger to the middle of the fret',
          'Pick the string more gently',
        ],
        answer: 'Move your fingertip closer to the fret wire and press a little firmer',
        explain: 'Buzz is the string touching a fret wire past your finger. **Close to the wire** it needs very little force.',
      },
    ],
  },
];
