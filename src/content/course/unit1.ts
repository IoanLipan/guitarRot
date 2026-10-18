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
        kind: 'text',
        title: 'Meet the strings',
        body: [
          'A guitar has six strings, and each one is tuned to a different note. Number them from the thinnest: string 1 is the thinnest, string 6 is the thickest.',
          'From thickest to thinnest the notes are E (Mi), A (La), D (Re), G (Sol), B (Si), E (Mi). The thick, low string 6 and the thin, high string 1 are both E (Mi), two octaves apart.',
          'To remember the order, say it out loud: Eddie Ate Dynamite, Good Bye Eddie.',
        ],
      },
      {
        kind: 'text',
        title: 'Hold it comfortably',
        body: [
          'Sit tall with the body of the guitar resting on your thigh and the neck pointing slightly upward. If you are right-handed, rest it on your right leg and fret with your left hand; left-handed players mirror everything.',
          'Look down at the strings: the thickest is nearest your chin and the thinnest is nearest the floor. Keep your shoulders loose. Nothing about playing guitar should hurt.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'The six open strings. Tap a dot to hear it: the thicker the string, the lower the note.',
        fretRange: [0, 2],
        positions: openStrings,
        tapToHear: true,
      },
      {
        kind: 'listen',
        caption:
          'Pluck each open string, thickest first. If the app cannot hear you, your guitar may be out of tune. Skip this for now: the next lesson fixes that.',
        targets: openStrings,
      },
      {
        kind: 'check',
        question: 'You pluck the thickest string. Which note is it?',
        options: ['E (Mi)', 'A (La)', 'D (Re)', 'B (Si)'],
        answer: 'E (Mi)',
        explain:
          'The thickest string, string 6, is E (Mi). The thinnest string, string 1, is also E (Mi), just two octaves higher.',
      },
      {
        kind: 'check',
        question: 'Counting from the thinnest string, which string number is the D (Re) string?',
        options: ['String 2', 'String 3', 'String 4', 'String 5'],
        answer: 'String 4',
        explain:
          'From the thinnest: string 1 is E (Mi), 2 is B (Si), 3 is G (Sol), 4 is D (Re), 5 is A (La) and 6 is E (Mi).',
      },
      {
        kind: 'check',
        question: 'In "Eddie Ate Dynamite, Good Bye Eddie", which word stands for the B (Si) string?',
        options: ['Good', 'Bye', 'Dynamite', 'Ate'],
        answer: 'Bye',
        explain:
          'The words follow the strings from thickest to thinnest: Eddie is E (Mi), Ate is A (La), Dynamite is D (Re), Good is G (Sol), Bye is B (Si), and the last Eddie is the thin E (Mi).',
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
        kind: 'text',
        title: 'Why tune first',
        body: [
          'Strings drift out of tune all the time, new strings most of all. An out-of-tune guitar makes every right note sound wrong, so tune before you play.',
          'Each string winds onto a tuning peg at the headstock. Tightening a string raises its pitch; loosening it lowers the pitch. Turn the peg in small steps and pluck the string firmly once, letting it ring while you turn.',
          'Always finish by coming up to the note from below. If you overshoot, drop the string under the note and tighten back up: it settles in and stays in tune longer.',
        ],
      },
      { kind: 'tuner' },
      {
        kind: 'text',
        title: 'No tuner? Use your ear',
        body: [
          'You can also tune the strings against each other. Press the low E (Mi) string at the 5th fret: it sounds the same as the open A (La) string. Do the same on A (La) to match D (Re), and on D (Re) to match G (Sol).',
          'The G (Sol) string is the odd one out: press it at the 4th fret to match the open B (Si). Then press B (Si) at the 5th fret to match the open high E (Mi).',
          'Two strings that are nearly in tune make a slow wobble. Adjust the peg until the wobble slows and disappears.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'Each fretted dot sounds the same note as the open string beside it. Tap both and listen for the match.',
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
        caption:
          'Press the low E (Mi) string at the 5th fret and pluck it. Then pluck the open A (La) string and listen: the two should sound the same.',
        targets: [{ stringIndex: 0, fret: 5 }],
      },
      {
        kind: 'check',
        question: 'You are tuning the A (La) string by ear against the low E (Mi) string. Where do you press the low E (Mi)?',
        options: ['5th fret', '4th fret', '7th fret', '12th fret'],
        answer: '5th fret',
        explain:
          'Fret 5 of the low E (Mi) string is A (La), the same note as the open A (La) string. Fret 12 would give you E (Mi) again, an octave up.',
      },
      {
        kind: 'check',
        question: 'Which string uses the 4th fret instead of the 5th for this method?',
        options: ['The G (Sol) string', 'The D (Re) string', 'The B (Si) string', 'The A (La) string'],
        answer: 'The G (Sol) string',
        explain:
          'The gap from G (Sol) up to B (Si) is one fret smaller than the other gaps between neighbouring strings, so you press the G (Sol) string at fret 4 to reach B (Si).',
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
        explain:
          'Coming up to the note from below leaves the string under tension against the peg, so it holds its pitch instead of slipping flat a minute later.',
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
        kind: 'text',
        title: 'What tab shows',
        body: [
          'Tab tells you which string and which fret to play. It has six lines, one per string. The top line is the thinnest string (string 1) and the bottom line is the thickest (string 6): higher line, higher sound.',
          'A number on a line is the fret to press on that string. A 0 means play the string open, with no finger down.',
          'Read left to right, like a sentence. Numbers stacked in one column are played together.',
        ],
      },
      {
        kind: 'text',
        title: 'Hold the pick',
        body: [
          'Hold the pick between the pad of your thumb and the side of your index finger, with just the tip showing. Grip it firmly enough that it does not fall out and loosely enough that it does not rattle.',
          'Pick downward, toward the floor, with a small movement from the wrist rather than the whole arm. Aim for one clean note per pick.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'open-strings-walk',
        caption:
          'All zeros, so there is nothing to fret. It climbs from the thickest string to the thinnest, plays the thin one twice at the top, then comes back down. Follow the tab as it plays.',
      },
      {
        kind: 'check',
        question: 'In tab, which line is the thinnest string (string 1)?',
        options: ['The top line', 'The bottom line', 'The middle', 'The second line from the bottom'],
        answer: 'The top line',
        explain: 'Top line means thinnest and highest-sounding; bottom line means thickest and lowest-sounding.',
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
        explain: 'The number is the fret you press. Fret 0 is no fret at all: the open string.',
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
        explain:
          'Left to right is time. Notes in the same column happen at the same time, which is how chords are written in tab.',
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
        kind: 'text',
        title: 'How to fret a note',
        body: [
          'Press the string with the tip of a finger, just behind the fret wire (the metal bar), not on top of it and not in the middle of the gap. Close to the wire, light pressure is enough.',
          'Curve your fingers so only the tips touch the strings. Keep your thumb behind the neck, roughly opposite your first and second fingers, and do not squeeze.',
          'Use one finger per fret: index on fret 1, middle on fret 2, ring on fret 3, pinky on fret 4.',
        ],
      },
      {
        kind: 'fretboard',
        caption:
          'Three notes on the thinnest string: open, fret 1 (index finger) and fret 3 (ring finger). Fret 2 is skipped on purpose; it holds F# (Fa#), a note you will meet soon.',
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
        caption:
          'E (Mi), F (Fa), G (Sol) and back. Say the names out loud as you play: Mi Fa Sol Fa Mi.',
      },
      {
        kind: 'listen',
        caption: 'Now play the three notes in order, slowly. One clean note at a time.',
        targets: [
          { stringIndex: 5, fret: 0 },
          { stringIndex: 5, fret: 1 },
          { stringIndex: 5, fret: 3 },
        ],
      },
      {
        kind: 'text',
        title: 'If it buzzes or goes dead',
        body: [
          'A buzz means your finger is too far from the fret wire or pressing too lightly. Slide closer to the wire and press a little firmer. A dull thud usually means another finger is touching the string: curve it more.',
          'Sore fingertips are normal for the first couple of weeks. Practise in short bursts and the skin toughens up.',
        ],
      },
      {
        kind: 'check',
        question: 'Which fret of the thinnest string gives you F (Fa)?',
        options: ['Fret 1', 'Fret 2', 'Fret 3', 'Fret 5'],
        answer: 'Fret 1',
        explain:
          'F (Fa) is one fret above the open E (Mi). Fret 2 is F# (Fa#) and fret 3 is G (Sol).',
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
        explain:
          'The string sounds from the fret wire your finger presses it against. Right behind the wire needs the least pressure; pressing past it would sound fret 4 instead.',
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
        explain:
          'Buzz is the string touching the fret wire beyond your finger. Close to the wire the string is held down cleanly with very little force.',
      },
    ],
  },
];
