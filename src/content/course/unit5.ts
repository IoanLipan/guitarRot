import type { Lesson } from '../lessons';

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
        kind: 'text',
        title: 'Two notes, lots of punch',
        body: [
          'A power chord has just two different notes: the root, which names the chord, and the fifth above it. For E (Mi) the fifth is B (Si). It leaves out the third, the note that makes a chord major or minor, so a power chord is neither: it sounds strong and open.',
          'Rock guitarists love them because with distortion fewer notes sound clearer, and you can slide the same shape anywhere on the neck.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'E5-power',
        caption:
          'Index finger on fret 2 of the A (La) string, middle finger on fret 2 of the D (Re) string. Strum only the three thickest strings; the low E (Mi) string rings open.',
      },
      {
        kind: 'chord',
        chordId: 'G5-power',
        caption:
          'The same shape slid up three frets: index on fret 3 of the low E (Mi) string, ring on fret 5 of the A (La) string, pinky on fret 5 of the D (Re) string.',
      },
      {
        kind: 'text',
        title: 'Name it by its lowest note',
        body: [
          'The lowest note names the chord. With the shape on the low E (Mi) string, the fret tells you the name: fret 3 is G5 (Sol power chord), fret 5 is A5 (La power chord). The landmarks from "The low E (Mi) string" name your power chords. Put the root on the A (La) string and the same shape works from there: fret 3 is C5 (Do power chord).',
          'Palm muting gives the tight, chunky rock sound: rest the edge of your picking hand lightly on the strings right beside the bridge as you pick.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'power-chord-drive',
        caption:
          'E5 (Mi power chord), G5 (Sol power chord), A5 (La power chord), then E5 (Mi power chord): frets 0, 3, 5, 0 on the low E (Mi) string. The tab shows just the two lowest notes of each shape. Downstrokes only, with palm muting.',
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
        explain:
          'A power chord is built from just two notes, the root and the fifth above it. The third is left out.',
      },
      {
        kind: 'check',
        question:
          'Your index finger is on fret 5 of the low E (Mi) string and you play the power chord shape. Which chord is it?',
        options: [
          'A5 (La power chord)',
          'G5 (Sol power chord)',
          'E5 (Mi power chord)',
          'D5 (Re power chord)',
        ],
        answer: 'A5 (La power chord)',
        explain:
          'The lowest note names the chord, and fret 5 of the low E (Mi) string is A (La). Fret 3 would give G5 (Sol power chord) and the open string E5 (Mi power chord).',
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
        explain: 'The third decides whether a chord is major or minor. Without it, a power chord fits with either.',
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
        kind: 'text',
        title: 'What a key is',
        body: [
          'A key is a home note and the scale built on it. A song in the key of G (Sol) feels at home on G (Sol), and almost everything else in it comes from the G (Sol) major scale.',
          'The chords come from the scale too. The strongest three are the major chords on the 1st, 4th and 5th notes of the scale, called I, IV and V (one, four, five). In the key of G (Sol) they are G (Sol), C (Do) and D (Re).',
        ],
      },
      {
        kind: 'text',
        title: 'The same recipe in other keys',
        body: [
          'Key of C (Do): C (Do), F (Fa), G (Sol). Key of D (Re): D (Re), G (Sol), A (La). Key of A (La): A (La), D (Re), E (Mi).',
          'A shortcut: the IV is five frets above the I, and the V is two frets above the IV. There is also a fourth friend, vi, the minor chord on the 6th note of the scale: in G (Sol) it is Em (Mi minor), in C (Do) it is Am (La minor). It belongs to the same family with a darker mood.',
          'Knowing a song\'s key lets you guess its chords: try the I, IV and V first.',
        ],
      },
      {
        kind: 'song',
        songId: 'aura-lee',
        caption:
          'Every chord in this song comes from the key of G (Sol): G (Sol), C (Do) and D (Re). Listen to how they belong together.',
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
        explain:
          'The G (Sol) major scale runs G (Sol), A (La), B (Si), C (Do), D (Re), E (Mi), F# (Fa#). The 1st, 4th and 5th notes are G (Sol), C (Do) and D (Re).',
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
        explain:
          'From D (Re) the IV is five frets up, which is G (Sol), and the V is seven frets up, which is A (La).',
      },
      {
        kind: 'check',
        question: 'In the key of C (Do), the relative minor chord (vi) sits on the 6th note of the scale. Which chord is it?',
        options: [
          'Am (La minor)',
          'Em (Mi minor)',
          'Dm (Re minor)',
          'Gm (Sol minor)',
        ],
        answer: 'Am (La minor)',
        explain: 'Counting up the C (Do) major scale, the 6th note is A (La), so the vi chord is Am (La minor).',
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
        kind: 'text',
        title: 'Five notes',
        body: [
          'Penta means five: a pentatonic scale has five notes. E (Mi) minor pentatonic is made of E (Mi), G (Sol), A (La), B (Si) and D (Re). It is the scale behind a huge share of rock and blues solos.',
          'It is forgiving. Played over an Em (Mi minor) backing, every one of its notes sounds good, so you can improvise without fear.',
          'Box 1 is the first shape to learn: two notes on every string, in the open position, frets 0 to 3.',
        ],
      },
      {
        kind: 'fretboard',
        caption:
          'Box 1: two notes on every string. Use your middle finger for fret 2 and your ring finger for fret 3. Tap from the low string up.',
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
        caption:
          'Up through the box, two notes on each string, in eighth notes. Listen: nothing in it sounds wrong, whichever order you play it.',
      },
      {
        kind: 'text',
        title: 'Make it music',
        body: [
          'Improvising is playing notes in an order you make up. Start with a rule: pick just three notes from the box, play them in a rhythm you like, and repeat it. Then change one note.',
          'Three things make a phrase sound like music: leave gaps (silence counts), repeat a short idea, and finish on E (Mi), the root of the scale, so it sounds finished.',
          'Ask a friend to strum Em (Mi minor), or record yourself strumming it on your phone, and play along.',
        ],
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
        explain:
          'The second option is E (Mi) major pentatonic, which sounds brighter and happier. Minor pentatonic has the darker G (Sol) and D (Re).',
      },
      {
        kind: 'check',
        question: 'How many notes does a pentatonic scale have?',
        options: ['3', '5', '7', '12'],
        answer: '5',
        explain: 'Penta means five, as in pentagon.',
      },
      {
        kind: 'check',
        question: 'Which fret of the low E (Mi) string is G (Sol) in box 1?',
        options: ['Fret 3', 'Fret 2', 'Fret 5', 'Fret 0'],
        answer: 'Fret 3',
        explain: 'Fret 0 is E (Mi), fret 1 is F (Fa), fret 3 is G (Sol). Box 1 skips F (Fa) because it is not in the scale.',
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
        kind: 'text',
        title: 'Twelve bars, three chords',
        body: [
          'The twelve-bar blues is one of the most used chord patterns in popular music. Twelve bars, three chords, and then it loops. Blues, rock and roll and a great deal of rock are built on it.',
          'It uses the I, IV and V chords from "Keys and the 1-4-5": I I I I, IV IV I I, V IV I V.',
          'In the key of E (Mi), I is E (Mi), IV is A (La) and V is B (Si). So the twelve bars are E E E E, A A E E, B A E B.',
        ],
      },
      {
        kind: 'text',
        title: 'The shuffle pattern',
        body: [
          'The riff below is a blues shuffle. Pick the open low E (Mi) string together with the A (La) string at fret 2, which is B (Si), then at fret 4, which is C# (Do#). Keep alternating in steady eighth notes.',
          'The riff plays four bars: two on E (Mi), one on A (La), and back to E (Mi). For the A (La) bar the same pattern moves over: the open A (La) string with the D (Re) string at fret 2, E (Mi), and fret 4, F# (Fa#).',
          'For B (Si), slide the pattern up two frets: B (Si) is fret 2 of the A (La) string, with the partner notes at fret 4, F# (Fa#), and fret 6, G# (Sol#), on the D (Re) string.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'blues-shuffle-e',
        caption: 'Four bars: E (Mi), E (Mi), A (La), E (Mi). Once it loops comfortably, say the twelve-bar form in your head as you play.',
      },
      {
        kind: 'text',
        title: 'Count the twelve',
        body: [
          'Bars 1 to 4: E (Mi). Bars 5 and 6: A (La). Bars 7 and 8: E (Mi). Bar 9: B (Si). Bar 10: A (La). Bar 11: E (Mi). Bar 12: B (Si), which leads back to the top.',
          'Try it with the shuffle: stretch the pattern over twelve bars, changing chords on the bar line.',
        ],
      },
      {
        kind: 'check',
        question: 'How many bars of the I chord open a twelve-bar blues?',
        options: ['One', 'Two', 'Four', 'Eight'],
        answer: 'Four',
        explain: 'The form starts with four bars of I, then moves to IV for two bars.',
      },
      {
        kind: 'check',
        question: 'In the key of E (Mi), which chord is the IV?',
        options: ['A (La)', 'B (Si)', 'D (Re)', 'C# (Do#)'],
        answer: 'A (La)',
        explain: 'The IV is five frets above the I. Five frets above E (Mi) is A (La). B (Si) is the V.',
      },
      {
        kind: 'check',
        question: 'Which chord comes in bar 9 of a twelve-bar blues in E (Mi)?',
        options: [
          'B (Si), the V chord',
          'A (La), the IV chord',
          'E (Mi), the I chord',
          'C# (Do#), the vi chord',
        ],
        answer: 'B (Si), the V chord',
        explain: 'Bars 9 to 12 go V IV I V, which in E (Mi) is B A E B. Bar 9 is the V: B (Si).',
      },
    ],
  },
];
