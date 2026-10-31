import type { Lesson } from '../../lessons';
import { gripNeck } from '../visuals';

const UNIT = 'The ukulele\'s own tricks';

/** The six notes of the ringing scale: open C, D on fret 2 of the C string, open E, F on fret 1 of the E string, open G, open A. */
const scaleNotes = [
  { stringIndex: 1, fret: 0 },
  { stringIndex: 1, fret: 2 },
  { stringIndex: 2, fret: 0 },
  { stringIndex: 2, fret: 1 },
  { stringIndex: 0, fret: 0 },
  { stringIndex: 3, fret: 0 },
];

/** Lessons 19-21: notes that ring like bells, a first barre, and a short practice plan. */
export const UKE_UNIT_5: readonly Lesson[] = [
  {
    id: 'uke-campanella',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'The ringing scale',
    goal: 'Play a scale across the strings so the notes keep ringing, like bells.',
    steps: [
      {
        kind: 'explain',
        headline: 'Let the notes ring',
        visual: { kind: 'illustration', name: 'uke-bells' },
        points: [
          '**Campanella** means "little bells": notes ring over each other.',
          'On a ukulele it comes free: ==the scale zig-zags across the strings==.',
        ],
        tip: 'Keep your fingers down as long as you can: ==let it ring==.',
      },
      {
        kind: 'explain',
        headline: 'Why it works',
        visual: { kind: 'illustration', name: 'uke-reentrant' },
        points: [
          'Two notes on the **same string** cut each other off: C (Do) then D (Re).',
          'A note on **another string** rings on: ==D (Re) then E (Mi)==.',
        ],
      },
      {
        kind: 'fretboard',
        caption: 'The scale on four strings. **Tap them in order**, Do to La, and listen to them ring together.',
        fretRange: [0, 2],
        positions: scaleNotes,
        tapToHear: true,
      },
      {
        kind: 'riff',
        riffId: 'uke-campanella-scale',
        caption: 'Up to La and back. **Let every note ring** until the next one on its own string cuts it off.',
      },
      {
        kind: 'listen',
        caption: 'Pluck C (Do), E (Mi), G (Sol), A (La) on their open strings and **let them ring together**. No mic? Skip it.',
        targets: [
          { stringIndex: 1, fret: 0 },
          { stringIndex: 2, fret: 0 },
          { stringIndex: 0, fret: 0 },
          { stringIndex: 3, fret: 0 },
        ],
      },
      {
        kind: 'check',
        question: 'In the ringing scale, D (Re) comes after C (Do) on the same string. What happens to C (Do)?',
        options: [
          'It is cut off when D (Re) is played',
          'It keeps ringing under D (Re)',
          'It plays again',
          'It moves to another string',
        ],
        answer: 'It is cut off when D (Re) is played',
        explain: 'One string makes **one note at a time**. Fretting D (Re) on the C (Do) string stops the open C (Do).',
      },
      {
        kind: 'check',
        question: 'The next note, E (Mi), is on the open E (Mi) string. What happens to D (Re)?',
        options: [
          'It keeps ringing under E (Mi)',
          'It is cut off at once',
          'It jumps up an octave',
          'It is muted by your thumb',
        ],
        answer: 'It keeps ringing under E (Mi)',
        explain: 'E (Mi) is on a **different string**, so D (Re) is left to ring: that is the bell sound.',
      },
      {
        kind: 'check',
        question: 'Which scale note is played at fret 1 of the E (Mi) string?',
        options: ['F (Fa)', 'E (Mi)', 'G (Sol)', 'F# (Fa#)'],
        answer: 'F (Fa)',
        explain: 'E (Mi) to F (Fa) is a **half step**: one fret. The scale plays F (Fa) there.',
      },
    ],
  },
  {
    id: 'uke-bb',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Bb (Sib): a first barre',
    goal: 'Play Bb (Sib) with one flat finger across two strings.',
    steps: [
      {
        kind: 'explain',
        headline: 'A barre: one finger, two strings',
        visual: { kind: 'illustration', name: 'uke-barre' },
        points: [
          'A **barre** is one finger lying flat across several strings.',
          'Bb (Sib) uses it on the E (Mi) and A (La) strings at ==fret 1==.',
        ],
        tip: 'Roll onto the bony edge of the finger: it needs less pressure.',
      },
      {
        kind: 'explain',
        headline: 'Bb (Sib): the other two fingers',
        visual: gripNeck('uke-Bb', [0, 4]),
        points: [
          'Middle on the C (Do) string at **fret 2**, ring on the G (Sol) string at fret 3.',
          'Bb (Sib) is Bb (Sib), D (Re) and F (Fa) together.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'uke-Bb',
        caption: 'Index (1) flat across the E (Mi) and A (La) strings, fret 1. Middle (2): C (Do), fret 2. Ring (3): G (Sol), fret 3.',
      },
      {
        kind: 'explain',
        headline: 'F (Fa) to Bb (Sib): stretch the index',
        visual: { kind: 'chords', chordIds: ['uke-F', 'uke-Bb'] },
        points: [
          'In F (Fa) your index is ==already== on fret 1 of the E (Mi) string.',
          'For Bb (Sib) it **lies flat** to cover the A (La) string too.',
        ],
        tip: 'Then the middle and ring fingers join.',
      },
      {
        kind: 'riff',
        riffId: 'uke-f-bb-change',
        caption: 'Two bars of F (Fa), two of Bb (Sib), twice. **Keep the index down**: it never leaves fret 1.',
      },
      {
        kind: 'explain',
        headline: 'The key of F (Fa)',
        visual: { kind: 'chords', chordIds: ['uke-F', 'uke-Bb', 'uke-C'] },
        points: [
          'Notes 1, 4 and 5 of the F (Fa) scale: ==F (Fa), Bb (Sib), C (Do)==.',
          'The same recipe as in C (Do) and G (Sol), in a new key.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-one-four-five-f',
        caption: 'F (Fa), Bb (Sib) and C (Do): I, IV and V in the key of F (Fa). **Slow and steady.**',
      },
      {
        kind: 'check',
        question: 'Which notes are in Bb (Sib)?',
        options: [
          'Bb (Sib), D (Re), F (Fa)',
          'Bb (Sib), Db (Reb), F (Fa)',
          'B (Si), D (Re), F (Fa)',
          'Bb (Sib), D (Re), G (Sol)',
        ],
        answer: 'Bb (Sib), D (Re), F (Fa)',
        explain: 'Bb (Sib) is Bb (Sib), D (Re), F (Fa). **Lower the D (Re)** to Db (Reb) and it turns minor.',
      },
      {
        kind: 'check',
        question: 'In Bb (Sib), which strings does the flat index finger cover?',
        options: [
          'The E (Mi) and A (La) strings',
          'The G (Sol) and C (Do) strings',
          'All four strings',
          'Only the A (La) string',
        ],
        answer: 'The E (Mi) and A (La) strings',
        explain: 'The index lies across **two strings** at fret 1. The middle and ring fingers take the other two.',
      },
      {
        kind: 'check',
        question: 'Which chords are the I, IV and V of the key of F (Fa)?',
        options: [
          'F (Fa), Bb (Sib), C (Do)',
          'F (Fa), C (Do), G (Sol)',
          'F (Fa), Bb (Sib), D (Re)',
          'F (Fa), A (La), C (Do)',
        ],
        answer: 'F (Fa), Bb (Sib), C (Do)',
        explain: 'Notes 1, 4 and 5 of the F (Fa) scale are **F (Fa), Bb (Sib), C (Do)**.',
      },
    ],
  },
  {
    id: 'uke-practice',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Your 15-minute plan',
    goal: 'Plan a 15-minute session that fits a short day and keeps you moving.',
    steps: [
      {
        kind: 'explain',
        headline: 'Fifteen minutes, four parts',
        visual: { kind: 'illustration', name: 'practice-plan' },
        points: [
          '3 minutes warm-up, 5 on something new, 4 on a song, 3 just for fun.',
          '==Every day beats once a week.==',
        ],
        tip: '**Short and daily** wins.',
      },
      {
        kind: 'explain',
        headline: 'Warm up with what you know',
        visual: { kind: 'chords', chordIds: ['uke-C', 'uke-Am', 'uke-F', 'uke-G'] },
        points: [
          'Start with the loop: C (Do), Am (La minor), F (Fa), G (Sol), slowly.',
          'Two minutes of ==clean changes== beat ten of rushed ones.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'uke-island-loop',
        caption: 'Your warm-up: the loop with the island strum. **Slow** until every change is clean.',
      },
      {
        kind: 'explain',
        headline: 'Loop what trips you',
        visual: { kind: 'illustration', name: 'slow-loop' },
        points: [
          'Loop just the ==one bar== that goes wrong.',
          'Add **5 bpm** only when it is clean three times in a row.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Finish with a whole song',
        visual: { kind: 'chords', chordIds: ['uke-G', 'uke-D'] },
        points: [
          'End with a song: ==Tom Dooley== uses only G (Sol) and D (Re).',
          'Play it **start to finish**, then again, a little faster.',
        ],
      },
      {
        kind: 'song',
        songId: 'tom-dooley',
        caption: 'Start to finish, never stopping. Speed up a little each time you get through it.',
      },
      {
        kind: 'check',
        question: 'In the 15-minute plan, how many minutes go to something new?',
        options: ['5 minutes', '3 minutes', '4 minutes', '10 minutes'],
        answer: '5 minutes',
        explain: 'The plan is 3 + **5** + 4 + 3 = 15 minutes. The five are for something new.',
      },
      {
        kind: 'check',
        question: 'Which helps you improve more?',
        options: [
          'A little every day',
          'One long session a week',
          'Only playing when you feel like it',
          'Playing only the songs you know',
        ],
        answer: 'A little every day',
        explain: 'Your fingers learn from **repeating**. Short daily sessions beat one long one.',
      },
      {
        kind: 'check',
        question: 'One bar keeps tripping you up. What do you do?',
        options: [
          'Loop just that bar slowly, then add speed in small steps',
          'Play the whole song faster',
          'Skip it and hope',
          'Stop for the day',
        ],
        answer: 'Loop just that bar slowly, then add speed in small steps',
        explain: 'A **small loop** fixes one thing at a time. Speed comes last.',
      },
    ],
  },
];
