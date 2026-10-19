import type { Lesson } from '../lessons';
import { gripNeck } from './visuals';

const UNIT = 'Level up';

/** Lessons 25-28: technique that makes playing smoother, the F chord, and how to keep improving. */
export const UNIT_6: readonly Lesson[] = [
  {
    id: 'hammer-pull',
    unit: UNIT,
    title: 'Hammer-ons and pull-offs',
    goal: 'Sound a second note with your fretting hand alone, going up with a hammer-on and down with a pull-off.',
    steps: [
      {
        kind: 'explain',
        headline: 'Notes without the pick',
        visual: { kind: 'illustration', name: 'hammer-pull' },
        points: [
          '**Hammer-on**: pick once, then drop a finger on a higher fret.',
          '**Pull-off**: pick, then flick the finger away. The lower note rings.',
        ],
        tip: 'Both are legato: ==smooth and fast==.',
      },
      {
        kind: 'explain',
        headline: 'Land right behind the wire',
        visual: { kind: 'illustration', name: 'fret-finger' },
        points: [
          'Hammer-on: drop the curved finger ==fast and firm==, right behind the wire.',
          'Pull-off: pull **sideways, toward the floor**. It plucks the string.',
        ],
        warn: 'Second note too quiet? Hammer faster and firmer.',
      },
      {
        kind: 'riff',
        riffId: 'legato-drill',
        caption: 'Only the first note of each pair is picked. Aim for **the same volume on both**. Bar 3 is a trill on the B (Si) string.',
      },
      {
        kind: 'check',
        question: 'How many times do you pick the string for a hammer-on pair?',
        options: ['Once: the second note comes from your fretting finger', 'Twice', 'Never', 'Three times'],
        answer: 'Once: the second note comes from your fretting finger',
        explain: 'You pick the first note only. The second sounds because your finger **lands hard** and sets the string ringing.',
      },
      {
        kind: 'check',
        question: 'In a pull-off to an open string, why does the open string sound?',
        options: [
          'Your finger flicks the string as it leaves',
          'The pick plays it again',
          'An open string always sounds',
          'The string vibrates by itself',
        ],
        answer: 'Your finger flicks the string as it leaves',
        explain: 'A small sideways flick **plucks the string**, so the note beneath your finger sounds on its own.',
      },
      {
        kind: 'check',
        question: 'Your hammered note is much quieter than the picked note. What helps?',
        options: [
          'Bring the finger down faster and more firmly',
          'Pick the first note harder',
          'Hammer more gently',
          'Land farther behind the fret wire',
        ],
        answer: 'Bring the finger down faster and more firmly',
        explain: 'The hammered note gets all its volume from the finger, so **speed and firmness** matter. Landing close behind the wire helps too.',
      },
    ],
  },
  {
    id: 'slides-bends',
    unit: UNIT,
    title: 'Slides and bends',
    goal: 'Slide between notes, and bend a note up a whole step to match its target.',
    steps: [
      {
        kind: 'explain',
        headline: 'Slide: keep pressing',
        visual: { kind: 'illustration', name: 'slide-bend' },
        points: [
          'Pick a note, keep pressing, and ==glide== to the new fret.',
        ],
        tip: 'Press firmly enough to ring, lightly enough to glide.',
        warn: 'Lift your finger and the sound stops. **Stay pressed until you arrive.**',
      },
      {
        kind: 'explain',
        headline: 'A bend raises the pitch',
        visual: { kind: 'notes', notes: ['G', 'A'] },
        points: [
          'A bend pushes the string sideways to raise the note.',
          'A **whole-step** bend sounds like the note ==two frets higher==.',
          'Fret 8 of the B (Si) string is G (Sol). Bend it up to A (La).',
        ],
      },
      {
        kind: 'explain',
        headline: 'Ring finger bends, friends help',
        visual: { kind: 'illustration', name: 'finger-numbers' },
        points: [
          'Push with your **ring finger**; middle and index help from behind.',
          'Turn your wrist like a door handle, not just the finger.',
        ],
        tip: 'Play the target first, then bend until ==it matches==.',
      },
      {
        kind: 'fretboard',
        caption: 'A bend target on the B (Si) string. Tap **fret 10** to hear where you are heading, then **fret 8** for the start.',
        fretRange: [7, 11],
        positions: [
          { stringIndex: 4, fret: 8 },
          { stringIndex: 4, fret: 10 },
        ],
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'slide-and-bend',
        caption: 'Bars 1-2: slide up two frets without lifting. Bars 3-4: hear the target, then **bend up to match it**. All E (Mi) minor pentatonic.',
      },
      {
        kind: 'check',
        question: 'A whole-step bend raises the pitch as much as moving up how many frets?',
        options: ['One fret', 'Two frets', 'Three frets', 'Four frets'],
        answer: 'Two frets',
        explain: 'A whole step is **two frets**. A half-step bend would match the next fret up.',
      },
      {
        kind: 'check',
        question: 'You fret fret 8 of the B (Si) string, which is G (Sol), and bend it a whole step. Which note do you reach?',
        options: ['A (La)', 'G# (Sol#)', 'B (Si)', 'F# (Fa#)'],
        answer: 'A (La)',
        explain: 'A whole step is **two frets**, so the bent note sounds like fret 10: A (La). G# (Sol#) would be a half-step bend.',
      },
      {
        kind: 'check',
        question: 'How do you know your bend is in tune?',
        options: [
          'Play the target note first, then bend until it sounds the same',
          'Bend as far as the string allows',
          'Bend until it hurts',
          'Bend and then check the tuner',
        ],
        answer: 'Play the target note first, then bend until it sounds the same',
        explain: 'Your ear is the judge. **Hearing the target first** gives you the pitch to aim for.',
      },
      {
        kind: 'check',
        question: 'While you slide, your finger…',
        options: [
          'Stays pressed on the string all the way',
          'Lifts off and lands again',
          'Mutes the string',
          'Presses only at the end',
        ],
        answer: 'Stays pressed on the string all the way',
        explain: 'Lifting would stop the note. A slide is the pitch moving while the string **keeps ringing**.',
      },
    ],
  },
  {
    id: 'f-barre',
    unit: UNIT,
    title: 'The F (Fa) barre chord',
    goal: 'Play Fmaj7 (Fa major seventh) and work up to the full F (Fa) barre chord.',
    steps: [
      {
        kind: 'explain',
        headline: 'F (Fa) needs a barre',
        visual: { kind: 'illustration', name: 'barre' },
        points: [
          'A **barre**: your index lies flat across the strings, like a movable nut.',
          'Roll it onto its ==bony edge==, close to the wire. Thumb low behind the neck.',
          'It takes weeks, not days.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Warm up with Fmaj7 (Fa major seventh)',
        visual: gripNeck('Fmaj7-open', [0, 4]),
        points: [
          'On the D (Re), G (Sol) and B (Si) strings it plays the same notes as F (Fa): no barre.',
          'Ring on fret 3, middle on fret 2, index on fret 1.',
          'The open high E (Mi) string is the ==extra note==.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'Fmaj7-open',
        caption: 'Four strings only. Index **B (Si) string, fret 1**. Middle **G (Sol), fret 2**. Ring **D (Re), fret 3**.',
      },
      {
        kind: 'explain',
        headline: 'The barre turns E (Mi) into F (Fa)',
        visual: { kind: 'notes', notes: ['E', 'F'] },
        points: [
          'Index flat across fret 1 also presses the high E (Mi) string.',
          'Open E (Mi) becomes F (Fa): a full F (Fa) chord on the thin strings.',
        ],
        warn: 'Don\'t squeeze your whole hand. ==Use the finger.==',
      },
      {
        kind: 'chord',
        chordId: 'F-barre',
        caption: 'Index across all six strings at fret 1. Middle **fret 2, G (Sol)**. Ring **fret 3, A (La)**. Pinky **fret 3, D (Re)**.',
      },
      {
        kind: 'listen',
        caption: 'Hold the F (Fa) barre and pluck each string, thickest first. **Each should ring clearly**, with no buzz.',
        targets: [
          { stringIndex: 0, fret: 1 },
          { stringIndex: 1, fret: 3 },
          { stringIndex: 2, fret: 3 },
          { stringIndex: 3, fret: 2 },
          { stringIndex: 4, fret: 1 },
          { stringIndex: 5, fret: 1 },
        ],
      },
      {
        kind: 'explain',
        headline: 'Practise it kindly',
        visual: { kind: 'chords', chordIds: ['F-barre', 'C-open', 'Am-open'] },
        points: [
          'Short bursts: ==30 seconds of barre==, then shake your hand out.',
          'Move slowly between F (Fa) and C (Do), and F (Fa) and Am (La minor).',
          'Count four beats on each.',
        ],
      },
      {
        kind: 'check',
        question: 'What does Fmaj7 (Fa major seventh) add to F (Fa), A (La), C (Do)?',
        options: ['E (Mi)', 'Eb (Mib)', 'G (Sol)', 'D (Re)'],
        answer: 'E (Mi)',
        explain: 'Fmaj7 (Fa major seventh) adds E (Mi), the note **one fret below** F (Fa). Eb (Mib) would make F7 (Fa dominant seventh).',
      },
      {
        kind: 'check',
        question: 'Where does the barre go in the full F (Fa) chord?',
        options: [
          'Across all six strings at fret 1',
          'Across all six strings at fret 2',
          'Across the three thickest strings at fret 1',
          'Across the two thinnest strings at fret 3',
        ],
        answer: 'Across all six strings at fret 1',
        explain: 'The index presses **every string at fret 1**. The other three fingers make the shape on frets 2 and 3.',
      },
      {
        kind: 'check',
        question: 'Some strings buzz in your barre. What do you try first?',
        options: [
          'Roll the index finger slightly onto its bony edge and keep it close to the fret wire',
          'Squeeze the neck much harder',
          'Move the barre to fret 2',
          'Barre only the thickest string',
        ],
        answer: 'Roll the index finger slightly onto its bony edge and keep it close to the fret wire',
        explain: 'Buzz comes from the soft part of the finger lying over a string. The **bony edge** presses cleanly, with less force.',
      },
    ],
  },
  {
    id: 'practice-plan',
    unit: UNIT,
    title: 'A practice plan that works',
    goal: 'Set up a 15-minute daily routine that keeps you getting better.',
    steps: [
      {
        kind: 'explain',
        headline: 'Your 15-minute session',
        visual: { kind: 'illustration', name: 'practice-plan' },
        points: [
          '3 min warm-up. 5 min on your newest thing, slow and clean.',
          '4 min on a song you half know.',
          '3 min of ==whatever you like==.',
        ],
        tip: '**Every day beats once a week.** You learn while you rest.',
      },
      {
        kind: 'explain',
        headline: 'Slow and clean wins',
        visual: { kind: 'illustration', name: 'slow-loop' },
        points: [
          'Play at a speed with **no mistakes**, metronome on.',
          'Easy several times in a row? Add ==5 bpm==.',
          'One bar keeps going wrong? Loop just that bar, slowly, until it is clean.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'chromatic-warmup',
        caption: 'Your warm-up: frets 1-2-3-4, fingers 1-2-3-4, on the low E (Mi), A (La), D (Re), G (Sol) strings. **Stay close to the strings.**',
      },
      {
        kind: 'explain',
        headline: 'Where to go next',
        visual: { kind: 'notes', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
        points: [
          'The **Songs** tab: more chord songs and melodies.',
          'The Feed: riffs and chords to pick up.',
          'The Quiz keeps your ==note names== sharp.',
        ],
        tip: 'Course done. Come back to any lesson when it feels shaky.',
      },
      {
        kind: 'check',
        question: 'Which practice routine helps most?',
        options: [
          'Fifteen minutes every day',
          'Two hours once a week',
          'One long session when you have a free weekend',
          'Only when you learn a new song',
        ],
        answer: 'Fifteen minutes every day',
        explain: 'Skills settle between sessions. **Short and often** gives your hands and memory more nights to absorb it.',
      },
      {
        kind: 'check',
        question: 'You keep fumbling the chord change in bar 6. What is best?',
        options: [
          'Loop just that change, slowly, until it is clean',
          'Play the whole song faster',
          'Skip the bar',
          'Play from the beginning every time',
        ],
        answer: 'Loop just that change, slowly, until it is clean',
        explain: 'Replaying the whole song wastes time on parts you know. **Loop the hard spot** and practise where the problem is.',
      },
      {
        kind: 'check',
        question: 'When do you raise the metronome speed?',
        options: [
          'When it is clean and easy several times in a row, by about 5 bpm',
          'As soon as you get through it once',
          'When you feel bored',
          'Never: stay at one speed',
        ],
        answer: 'When it is clean and easy several times in a row, by about 5 bpm',
        explain: 'Small steps keep you clean. Speeding up too soon just ==practises the mistakes faster==.',
      },
    ],
  },
];
