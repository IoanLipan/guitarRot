import type { Lesson } from '../../lessons';
import { gripNeck } from '../visuals';

const UNIT = 'More chords and rhythm';

/** Lessons 10-14: minor chords, seventh chords, the chop, the keys of C and G, and 3/4 time. */
export const UKE_UNIT_3: readonly Lesson[] = [
  {
    id: 'uke-minors',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Dm (Re minor) and Em (Mi minor)',
    goal: 'Play Dm (Re minor) and Em (Mi minor), and hear what makes a chord minor.',
    steps: [
      {
        kind: 'explain',
        headline: 'Dm (Re minor): F (Fa) plus one',
        visual: gripNeck('uke-Dm', [0, 4]),
        points: [
          'Start from F (Fa) and ==add the ring finger== on **fret 2** of the C (Do) string.',
          'Index: E (Mi) string, fret 1. Middle: G (Sol) string, fret 2.',
        ],
        tip: 'Dm (Re minor) is D (Re), F (Fa) and A (La) together.',
      },
      {
        kind: 'chord',
        chordId: 'uke-Dm',
        caption: 'Index (1): E (Mi) string, fret 1. Middle (2): G (Sol) string, fret 2. Ring (3): C (Do) string, fret 2.',
      },
      {
        kind: 'explain',
        headline: 'Dm (Re minor) to Am (La minor)',
        visual: { kind: 'chords', chordIds: ['uke-Dm', 'uke-Am'] },
        points: [
          'The middle finger **stays** on the G (Sol) string, fret 2.',
          'Lift the other two fingers: ==everything else rings open==.',
        ],
        tip: 'Going back, drop the index and ring fingers together.',
      },
      {
        kind: 'riff',
        riffId: 'uke-dm-am-change',
        caption: 'Two bars of Dm (Re minor), two of Am (La minor), twice. The **middle finger never moves**.',
      },
      {
        kind: 'explain',
        headline: 'Em (Mi minor): a staircase',
        visual: gripNeck('uke-Em', [0, 5]),
        points: [
          'Index on the A (La) string at **fret 2**, middle on the E (Mi) string at fret 3.',
          'Ring on the C (Do) string at fret 4: a ==staircase== up the neck.',
        ],
        tip: 'Awkward at first? ==Normal.== Add one finger at a time.',
      },
      {
        kind: 'chord',
        chordId: 'uke-Em',
        caption: 'Fingers 1, 2 and 3 climb the staircase. The G (Sol) string rings open. Strum all four.',
      },
      {
        kind: 'explain',
        headline: 'What makes a chord minor?',
        visual: { kind: 'notes', notes: ['D', 'F', 'A'] },
        points: [
          'Dm (Re minor) is D (Re), F (Fa), A (La).',
          'Raise the F (Fa) **one fret** to F# (Fa#) and it turns ==major==: D (Re) major.',
        ],
        tip: 'Minor is the middle note one fret lower. Softer, darker.',
      },
      {
        kind: 'riff',
        riffId: 'uke-dm-c-change',
        caption: 'Two bars of Dm (Re minor), two of C (Do), twice. **Lift every finger** on the change.',
      },
      {
        kind: 'song',
        songId: 'drunken-sailor',
        caption: 'A sea shanty on just Dm (Re minor) and C (Do). Speed down to 70%: **down, up, down, up** on every beat.',
      },
      {
        kind: 'check',
        question: 'Which notes are in Dm (Re minor)?',
        options: ['D (Re), F (Fa), A (La)', 'D (Re), F# (Fa#), A (La)', 'D (Re), G (Sol), A (La)', 'D (Re), F (Fa), B (Si)'],
        answer: 'D (Re), F (Fa), A (La)',
        explain: 'Dm (Re minor) is D (Re), F (Fa), A (La). **Raise the F (Fa)** to F# (Fa#) and you get D (Re) major.',
      },
      {
        kind: 'check',
        question: 'Which notes are in Em (Mi minor)?',
        options: ['E (Mi), G (Sol), B (Si)', 'E (Mi), G# (Sol#), B (Si)', 'E (Mi), F (Fa), A (La)', 'E (Mi), A (La), D (Re)'],
        answer: 'E (Mi), G (Sol), B (Si)',
        explain: 'Em (Mi minor) is E (Mi), G (Sol), B (Si). **Raise the G (Sol)** to G# (Sol#) and you get E (Mi) major.',
      },
      {
        kind: 'check',
        question: 'Dm (Re minor) is the shape of F (Fa) plus which finger?',
        options: [
          'The ring finger, on fret 2 of the C (Do) string',
          'The index finger, on fret 1 of the A (La) string',
          'The pinky, on fret 3 of the G (Sol) string',
          'No finger: it is the same shape',
        ],
        answer: 'The ring finger, on fret 2 of the C (Do) string',
        explain: 'F (Fa) already has the index and middle fingers. Add the **ring finger** on the C (Do) string and it is Dm (Re minor).',
      },
    ],
  },
  {
    id: 'uke-sevenths',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Seventh chords',
    goal: 'Play two new seventh chords, one finger each, and hear how they pull.',
    steps: [
      {
        kind: 'explain',
        headline: 'Add a seven: one extra note',
        visual: { kind: 'notes', notes: ['C', 'E', 'G', 'Bb'] },
        points: [
          'A seventh chord is a chord plus ==one extra note==, for a bluesy colour.',
          'C7 (Do dominant seventh) is C (Do), E (Mi), G (Sol) and Bb (Sib).',
        ],
        tip: 'Seven chords sound ==unfinished==: they want to move on.',
      },
      {
        kind: 'explain',
        headline: 'Slide one finger down',
        visual: gripNeck('uke-C7', [0, 4]),
        points: [
          'Index finger on **fret 1** of the A (La) string. The rest ring open.',
          'From C (Do) just ==move that one finger== from fret 3 to fret 1.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'uke-C7',
        caption: 'Index (1) on the A (La) string, fret 1. Strum all four strings.',
      },
      {
        kind: 'riff',
        riffId: 'uke-c-c7-change',
        caption: 'C (Do), then C7 (Do dominant seventh), then F (Fa). **Hear the pull** from the seven chord toward F (Fa).',
      },
      {
        kind: 'explain',
        headline: 'One finger on the C (Do) string',
        visual: gripNeck('uke-A7', [0, 4]),
        points: [
          'Index on **fret 1** of the C (Do) string. The rest ring open.',
          'A7 (La dominant seventh) is A (La), C# (Do#), E (Mi), G (Sol).',
        ],
        tip: 'It likes to lead to ==Dm (Re minor)==.',
      },
      {
        kind: 'chord',
        chordId: 'uke-A7',
        caption: 'Index (1) on the C (Do) string, fret 1. Strum all four strings.',
      },
      {
        kind: 'riff',
        riffId: 'uke-dm-a7-change',
        caption: 'Two bars of Dm (Re minor), two of A7 (La dominant seventh), twice. Hear the seven chord **lean back**.',
      },
      {
        kind: 'check',
        question: 'Which notes are in C7 (Do dominant seventh)?',
        options: [
          'C (Do), E (Mi), G (Sol), Bb (Sib)',
          'C (Do), E (Mi), G (Sol), B (Si)',
          'C (Do), E (Mi), G (Sol)',
          'C (Do), Eb (Mib), G (Sol), Bb (Sib)',
        ],
        answer: 'C (Do), E (Mi), G (Sol), Bb (Sib)',
        explain: 'The seven chord is C (Do), E (Mi), G (Sol) plus ==Bb (Sib)==. The extra note makes it a "seven".',
      },
      {
        kind: 'check',
        question: 'Which notes are in A7 (La dominant seventh)?',
        options: [
          'A (La), C# (Do#), E (Mi), G (Sol)',
          'A (La), C# (Do#), E (Mi), G# (Sol#)',
          'A (La), C (Do), E (Mi), G (Sol)',
          'A (La), C# (Do#), E (Mi)',
        ],
        answer: 'A (La), C# (Do#), E (Mi), G (Sol)',
        explain: 'The seven chord is A (La), C# (Do#), E (Mi) plus ==G (Sol)==. With C (Do) instead of C# (Do#) it would be minor.',
      },
      {
        kind: 'check',
        question: 'How many fingers do C7 (Do dominant seventh) and A7 (La dominant seventh) need?',
        options: ['One each', 'Two each', 'Three each', 'Four each'],
        answer: 'One each',
        explain: 'Both press a **single string** at fret 1 and let the other three ring open.',
      },
    ],
  },
  {
    id: 'uke-chunk',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Mute and chop',
    goal: 'Strum and chop in time: a ring on beats 1 and 3, a dry click on 2 and 4.',
    steps: [
      {
        kind: 'explain',
        headline: 'The chop: stop the sound',
        visual: { kind: 'illustration', name: 'uke-chunk' },
        points: [
          'Strum down, then ==press the strings flat== with the heel of your hand at once.',
          'You get a dry **chk** instead of a ring. Do it on beats 2 and 4.',
        ],
        tip: 'Strum, chop, strum, chop: ==ring, click, ring, click==.',
      },
      {
        kind: 'riff',
        riffId: 'uke-chop-c-g7',
        caption: 'C (Do) and G7 (Sol dominant seventh) with a chop on 2 and 4. **Ring on 1 and 3**, click on 2 and 4.',
      },
      {
        kind: 'explain',
        headline: 'Change while it is quiet',
        visual: { kind: 'chords', chordIds: ['uke-C', 'uke-G7'] },
        points: [
          'The chop silences the strings, so it is the ==perfect moment to move== your fingers.',
          'Strum on beat 1, chop on 2 and **change** while it is quiet.',
        ],
        tip: 'Chop, change, strum: the new chord lands on the next ring.',
      },
      {
        kind: 'check',
        question: 'On which beats do you chop in "strum, chop, strum, chop"?',
        options: ['Beats 2 and 4', 'Beats 1 and 3', 'Beat 1 only', 'Every beat'],
        answer: 'Beats 2 and 4',
        explain: 'The pattern alternates: **ring** on 1 and 3, **chop** on 2 and 4.',
      },
      {
        kind: 'check',
        question: 'What does the chop do to the sound?',
        options: [
          'It stops the strings dead and leaves a short click',
          'It makes the strings ring longer',
          'It raises the pitch',
          'It plays the strings twice',
        ],
        answer: 'It stops the strings dead and leaves a short click',
        explain: 'Pressing the strings flat **mutes** them at once. The contrast with the ring is the rhythm.',
      },
      {
        kind: 'check',
        question: 'When is the best moment to change chords in this pattern?',
        options: [
          'During the chop, while the strings are silent',
          'In the middle of a ring',
          'Only at the end of the song',
          'Never: stay on one chord',
        ],
        answer: 'During the chop, while the strings are silent',
        explain: 'A silent chop **hides the change**: your fingers move and nobody hears them travel.',
      },
    ],
  },
  {
    id: 'uke-one-four-five',
    instrument: 'ukulele',
    unit: UNIT,
    title: 'Keys: the I, IV and V',
    goal: 'Find the three chords that belong together in the keys of C (Do) and G (Sol).',
    steps: [
      {
        kind: 'explain',
        headline: 'Three chords that fit',
        visual: { kind: 'illustration', name: 'key-family' },
        points: [
          'Every **key** has a family. The big three are the chords on ==notes 1, 4 and 5==.',
          'In the key of G (Sol): G (Sol), C (Do) and D (Re).',
        ],
      },
      {
        kind: 'explain',
        headline: 'The key of C (Do)',
        visual: { kind: 'notes', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
        points: [
          'Notes 1, 4 and 5 of the C (Do) major scale are C (Do), F (Fa) and G (Sol).',
          'So those chords belong together: the ==I, IV and V== of the key.',
        ],
        tip: 'Your loop C (Do), Am (La minor), F (Fa), G (Sol) is I, vi, IV, V.',
      },
      {
        kind: 'riff',
        riffId: 'uke-one-four-five-c',
        caption: 'C (Do), F (Fa), G7 (Sol dominant seventh): I, IV and V. Hear how they **belong together**.',
      },
      {
        kind: 'explain',
        headline: 'The key of G (Sol): meet D (Re)',
        visual: gripNeck('uke-D', [0, 4]),
        points: [
          'Notes 1, 4 and 5 of the G (Sol) major scale: G (Sol), C (Do), D (Re).',
          'D (Re): one finger flat across the three strings nearest your chin, at **fret 2**.',
        ],
        tip: 'Too flat to press? Try ==three fingers side by side==.',
      },
      {
        kind: 'chord',
        chordId: 'uke-D',
        caption: 'Index finger (1) flat across the three strings nearest your chin, fret 2. The A (La) string rings open.',
      },
      {
        kind: 'riff',
        riffId: 'uke-one-four-five-g',
        caption: 'G (Sol), C (Do) and D (Re): I, IV and V in the key of G (Sol). **Change on the last beat.**',
      },
      {
        kind: 'song',
        songId: 'when-the-saints',
        caption: 'A real song on I, IV and V in G (Sol). Speed down until it flows, then **speed it up**.',
      },
      {
        kind: 'check',
        question: 'Which chords are the I, IV and V of the key of C (Do)?',
        options: [
          'C (Do), F (Fa), G (Sol)',
          'C (Do), D (Re), G (Sol)',
          'C (Do), E (Mi), G (Sol)',
          'C (Do), F (Fa), A (La)',
        ],
        answer: 'C (Do), F (Fa), G (Sol)',
        explain: 'Notes 1, 4 and 5 of the C (Do) scale are **C (Do), F (Fa), G (Sol)**.',
      },
      {
        kind: 'check',
        question: 'Which chords are the I, IV and V of the key of G (Sol)?',
        options: [
          'G (Sol), C (Do), D (Re)',
          'G (Sol), D (Re), A (La)',
          'G (Sol), B (Si), D (Re)',
          'G (Sol), C (Do), E (Mi)',
        ],
        answer: 'G (Sol), C (Do), D (Re)',
        explain: 'Notes 1, 4 and 5 of the G (Sol) scale are **G (Sol), C (Do), D (Re)**.',
      },
      {
        kind: 'check',
        question: 'Which chord is the relative minor (vi) of C (Do) major?',
        options: ['Am (La minor)', 'Dm (Re minor)', 'Em (Mi minor)', 'Gm (Sol minor)'],
        answer: 'Am (La minor)',
        explain: 'The 6th note of the C (Do) scale is A (La), so the vi chord is ==Am (La minor)==: in your four-chord loop.',
      },
    ],
  },
  {
    id: 'uke-waltz',
    instrument: 'ukulele',
    unit: UNIT,
    title: '3/4 time: the waltz',
    goal: 'Count three beats to the bar and play a waltz.',
    steps: [
      {
        kind: 'explain',
        headline: 'Three beats to a bar',
        visual: { kind: 'illustration', name: 'uke-waltz' },
        points: [
          'A bar can have **three** beats: count ==1 2 3==. That is 3/4.',
          'Lean on beat 1 and play 2 and 3 lighter: ==ONE two three==.',
        ],
        tip: 'A waltz feels like swaying, not marching.',
      },
      {
        kind: 'riff',
        riffId: 'uke-waltz-g-c-d',
        caption: 'G (Sol), C (Do), D (Re) in 3/4. **Count 1 2 3**, one downstroke each, a little firmer on 1.',
      },
      {
        kind: 'explain',
        headline: 'Four or three?',
        visual: { kind: 'illustration', name: 'beats-bar' },
        points: [
          'In 4/4 you count to **four**. In 3/4, only to three.',
          'Listen for the count: ==a sway== is three, a march is four.',
        ],
      },
      {
        kind: 'explain',
        headline: 'A hymn in three',
        visual: { kind: 'chords', chordIds: ['uke-G', 'uke-C', 'uke-D'] },
        points: [
          'Amazing Grace is a hymn in 3/4 on ==G (Sol), C (Do) and D (Re)==.',
          'Start moving on beat 3 so the new chord lands on **beat 1**.',
        ],
      },
      {
        kind: 'song',
        songId: 'amazing-grace',
        caption: 'Slow it down to 60%. One downstroke a beat: **ONE** two three.',
      },
      {
        kind: 'check',
        question: 'How many beats are in a bar of 3/4?',
        options: ['Two', 'Three', 'Four', 'Six'],
        answer: 'Three',
        explain: 'The top number counts the **beats in a bar**. 3/4 is 1 2 3, then 1 2 3 again.',
      },
      {
        kind: 'check',
        question: 'Which beat do you lean on in a waltz?',
        options: ['Beat 1', 'Beat 2', 'Beat 3', 'All three equally'],
        answer: 'Beat 1',
        explain: 'The waltz is ==ONE two three==: a strong first beat, then two lighter ones.',
      },
      {
        kind: 'check',
        question: 'Which chords does Amazing Grace use?',
        options: [
          'G (Sol), C (Do) and D (Re)',
          'C (Do), F (Fa) and G (Sol)',
          'Am (La minor) and C (Do)',
          'Dm (Re minor) and C (Do)',
        ],
        answer: 'G (Sol), C (Do) and D (Re)',
        explain: 'It uses the I, IV and V of the key of G (Sol): **G (Sol), C (Do) and D (Re)**.',
      },
    ],
  },
];
