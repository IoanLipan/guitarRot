import type { Lesson } from '../lessons';
import { gripNeck } from './visuals';

const UNIT = 'First chords and rhythm';

/** Lessons 10-16: chords, a steady beat, and your first whole song. */
export const UNIT_3: readonly Lesson[] = [
  {
    id: 'em-chord',
    unit: UNIT,
    title: 'Em (Mi minor): your first chord',
    goal: 'Play a clean Em (Mi minor) chord and strum it in time.',
    steps: [
      {
        kind: 'explain',
        headline: 'Notes together make a chord',
        visual: { kind: 'illustration', name: 'chord-notes' },
        points: [
          'A **chord** is several notes played at once.',
          'Strum ==thickest to thinnest in one sweep==.',
          'Em (Mi minor) is E (Mi) + G (Sol) + B (Si): darker and sadder than major.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'Em-open',
        caption: 'Middle finger on **fret 2, A (La) string**. Ring finger on **fret 2, D (Re) string**. Strum all six.',
      },
      {
        kind: 'explain',
        headline: 'Make it ring',
        visual: { kind: 'illustration', name: 'finger-numbers' },
        points: [
          'Arch your fingers: only the **tips** touch. Thumb behind the neck.',
          'Strum with a loose wrist: ==a clean sweep beats a hard hit==.',
        ],
        warn: 'Dead string? Pluck one at a time to find the finger touching it.',
      },
      {
        kind: 'riff',
        riffId: 'em-four-downs',
        caption: 'Four bars of Em (Mi minor), one downstroke on every beat. **Count 1 2 3 4** out loud and keep your hand moving.',
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
        question: 'Where do your two fingers go for Em (Mi minor)?',
        options: [
          'Fret 2 of the A (La) string and fret 2 of the D (Re) string',
          'Fret 2 of the low E (Mi) string and fret 2 of the A (La) string',
          'Fret 1 of the A (La) string and fret 2 of the D (Re) string',
          'Fret 2 of the D (Re) string and fret 2 of the G (Sol) string',
        ],
        answer: 'Fret 2 of the A (La) string and fret 2 of the D (Re) string',
        explain: 'The two fingers sit **side by side on fret 2** of strings 5 and 4. The other four strings ring open.',
      },
      {
        kind: 'check',
        question: 'One string sounds dead when you strum Em (Mi minor). What do you do?',
        options: [
          'Pluck the strings one at a time and fix the finger that touches the dead one',
          'Press harder with the whole hand',
          'Strum harder',
          'Move the shape up a fret',
        ],
        answer: 'Pluck the strings one at a time and fix the finger that touches the dead one',
        explain: 'A dead string usually means a finger **lies against it**. Plucking one at a time shows which; arch that finger.',
      },
    ],
  },
  {
    id: 'am-em',
    unit: UNIT,
    title: 'Am (La minor) and your first chord change',
    goal: 'Play Am (La minor) and change between Em (Mi minor) and Am (La minor) in time.',
    steps: [
      {
        kind: 'explain',
        headline: 'Em (Mi minor) to Am (La minor)',
        visual: { kind: 'chords', chordIds: ['Em-open', 'Am-open'] },
        points: [
          'Am (La minor) is the Em (Mi minor) shape moved ==one string toward the floor==.',
          'Then add your **index finger** on fret 1 of the B (Si) string.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Start the strum on string 5',
        visual: { kind: 'illustration', name: 'chord-symbols' },
        points: [
          'The lowest note of Am (La minor) is the open A (La) string.',
          '==Start your strum there.== The low E (Mi) would make it muddy.',
          'On a diagram: X = skip it, O = ring it open, numbers = fingers.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'Am-open',
        caption: 'Index **B (Si) string, fret 1**. Middle **D (Re), fret 2**. Ring **G (Sol), fret 2**. Strum from the open A (La) string.',
      },
      {
        kind: 'explain',
        headline: 'Change as one block',
        visual: { kind: 'illustration', name: 'shape-move' },
        points: [
          'Middle and ring fingers keep their shape and ==slide over together==.',
          'The index finger drops onto fret 1 of the B (Si) string.',
        ],
        tip: 'Practise silently: shape, count four, change, count four.',
      },
      {
        kind: 'riff',
        riffId: 'em-am-change',
        caption: 'Two bars of Em (Mi minor), two of Am (La minor), twice. **Start moving on the last beat** of the bar.',
      },
      {
        kind: 'check',
        question: 'Which notes are in Am (La minor)?',
        options: ['A (La), C (Do), E (Mi)', 'A (La), C# (Do#), E (Mi)', 'A (La), B (Si), D (Re)', 'A (La), C (Do), G (Sol)'],
        answer: 'A (La), C (Do), E (Mi)',
        explain: 'Am (La minor) is A (La), C (Do), E (Mi). **Raise the C (Do)** to C# (Do#) and you get A (La) major.',
      },
      {
        kind: 'check',
        question: 'Where does your strum start for Am (La minor)?',
        options: [
          'On the open A (La) string, skipping the low E (Mi)',
          'On the low E (Mi) string',
          'On the D (Re) string',
          'On the B (Si) string',
        ],
        answer: 'On the open A (La) string, skipping the low E (Mi)',
        explain: 'The open A (La) string is the **root**, so it should be the lowest note. The low E (Mi) is not in the shape.',
      },
      {
        kind: 'check',
        question: 'What is the best way to change from Em (Mi minor) to Am (La minor)?',
        options: [
          'Move both fingers together as one shape and add the index finger',
          'Lift everything off, then place the fingers one by one',
          'Move the ring finger first, then the middle',
          'Stop strumming until you are ready',
        ],
        answer: 'Move both fingers together as one shape and add the index finger',
        explain: 'The two fingers already fit Am (La minor). They **move one string over, together**: fast and in time.',
      },
    ],
  },
  {
    id: 'd-and-a',
    unit: UNIT,
    title: 'D (Re) and A (La)',
    goal: 'Play D (Re) and A (La), and change between them.',
    steps: [
      {
        kind: 'explain',
        headline: 'D (Re): a small triangle',
        visual: gripNeck('D-open', [0, 4]),
        points: [
          'Three fingers make a ==triangle== on the three thinnest strings.',
          'Index: fret 2, G (Sol). Middle: fret 2, high E (Mi). Ring: fret 3, B (Si).',
        ],
        tip: 'Major chords like this sound **bright and open**.',
      },
      {
        kind: 'chord',
        chordId: 'D-open',
        caption: 'Strum from the open D (Re) string down: **four strings only**. Skip the two thickest.',
      },
      {
        kind: 'explain',
        headline: 'A (La): three side by side',
        visual: gripNeck('A-open', [0, 3]),
        points: [
          'Three fingers side by side on **fret 2**: D (Re), G (Sol), B (Si) strings.',
          'Start the strum on the open A (La) string. Skip the low E (Mi).',
        ],
        warn: 'Ring finger muting the high E (Mi) string? ==Arch it==.',
      },
      {
        kind: 'chord',
        chordId: 'A-open',
        caption: 'Five strings: from the open A (La) string down.',
      },
      {
        kind: 'explain',
        headline: 'Am (La minor) vs A (La)',
        visual: { kind: 'chords', chordIds: ['Am-open', 'A-open'] },
        points: [
          'Am (La minor) has C (Do). A (La) has **C# (Do#)**, one fret higher.',
          '==One fret== turns a sad chord into a bright one.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'd-a-change',
        caption: 'Two bars of D (Re), two of A (La), twice. **Move the whole shape** and keep the strum on time.',
      },
      {
        kind: 'check',
        question: 'How many strings do you strum for D (Re)?',
        options: ['Four: the D (Re) string and the three thinner ones', 'All six', 'Five', 'Three'],
        answer: 'Four: the D (Re) string and the three thinner ones',
        explain: 'The two thickest strings aren\'t in the chord, so the strum **starts on the D (Re) string**.',
      },
      {
        kind: 'check',
        question: 'What is the difference between Am (La minor) and A (La)?',
        options: [
          'One note: C (Do) becomes C# (Do#)',
          'One note: E (Mi) becomes F (Fa)',
          'Nothing: they are the same chord',
          'A (La) has one extra note, B (Si)',
        ],
        answer: 'One note: C (Do) becomes C# (Do#)',
        explain: 'Am (La minor) is A (La), C (Do), E (Mi). A (La) is A (La), C# (Do#), E (Mi). ==One fret== changes the mood.',
      },
      {
        kind: 'check',
        question: 'Which notes make D (Re) major?',
        options: ['D (Re), F# (Fa#), A (La)', 'D (Re), F (Fa), A (La)', 'D (Re), G (Sol), A (La)', 'D (Re), E (Mi), A (La)'],
        answer: 'D (Re), F# (Fa#), A (La)',
        explain: 'D (Re) major is D (Re), **F# (Fa#)**, A (La). With F (Fa) instead, it would be D (Re) minor.',
      },
    ],
  },
  {
    id: 'g-and-c',
    unit: UNIT,
    title: 'G (Sol) and C (Do)',
    goal: 'Play G (Sol) and C (Do), and change between them.',
    steps: [
      {
        kind: 'explain',
        headline: 'G (Sol): the big stretch',
        visual: gripNeck('G-open', [0, 4]),
        points: [
          'Ring finger: **fret 3**, low E (Mi) string.',
          'Middle finger: fret 2, A (La) string.',
          'Pinky: fret 3, high E (Mi) string. The rest ring open.',
        ],
        tip: 'Awkward at first? ==Normal.== Add one finger at a time.',
      },
      {
        kind: 'chord',
        chordId: 'G-open',
        caption: 'All six strings. Check that no finger touches the open **G (Sol)** and **B (Si)** strings.',
      },
      {
        kind: 'explain',
        headline: 'C (Do): a staircase',
        visual: gripNeck('C-open', [0, 4]),
        points: [
          'Ring finger on **fret 3** of the A (La) string.',
          'Middle: fret 2, D (Re) string. Index: fret 1, B (Si) string.',
          'Coming from Am (La minor)? ==Only the ring finger moves.==',
        ],
      },
      {
        kind: 'chord',
        chordId: 'C-open',
        caption: 'Five strings, from the A (La) string. Let the open G (Sol) and high E (Mi) strings ring.',
      },
      {
        kind: 'explain',
        headline: 'G (Sol) to C (Do): walk over',
        visual: { kind: 'chords', chordIds: ['G-open', 'C-open'] },
        points: [
          'Ring and middle each hop ==one string toward the floor== and keep their frets.',
          'Index lands on fret 1 of the B (Si) string. Pinky lifts away.',
        ],
        tip: 'Think of your fingers walking over together.',
      },
      {
        kind: 'riff',
        riffId: 'g-c-change',
        caption: 'Two bars of G (Sol), two of C (Do), twice. Most beginners struggle here: **go slow, keep your hand moving**.',
      },
      {
        kind: 'check',
        question: 'Which notes are in G (Sol) major?',
        options: ['G (Sol), B (Si), D (Re)', 'G (Sol), Bb (Sib), D (Re)', 'G (Sol), C (Do), D (Re)', 'G (Sol), B (Si), E (Mi)'],
        answer: 'G (Sol), B (Si), D (Re)',
        explain: 'G (Sol) major is G (Sol), B (Si), D (Re). **Lower the B (Si)** to Bb (Sib) and it becomes G (Sol) minor.',
      },
      {
        kind: 'check',
        question: 'Which notes are in C (Do) major?',
        options: ['C (Do), E (Mi), G (Sol)', 'C (Do), Eb (Mib), G (Sol)', 'C (Do), F (Fa), G (Sol)', 'C (Do), E (Mi), A (La)'],
        answer: 'C (Do), E (Mi), G (Sol)',
        explain: 'C (Do) major is C (Do), E (Mi), G (Sol). With **Eb (Mib)** instead of E (Mi) it would be C (Do) minor.',
      },
      {
        kind: 'check',
        question: 'Which string do you skip when you strum C (Do)?',
        options: ['The low E (Mi) string', 'The A (La) string', 'The high E (Mi) string', 'None: strum all six'],
        answer: 'The low E (Mi) string',
        explain: 'C (Do) starts on the A (La) string, with its **root** at fret 3. The low E (Mi) string isn\'t in the chord.',
      },
      {
        kind: 'check',
        question: 'Changing from Am (La minor) to C (Do), what moves?',
        options: [
          'Only the ring finger: the index and middle stay put',
          'All three fingers',
          'Only the index finger',
          'Nothing: it is the same shape',
        ],
        answer: 'Only the ring finger: the index and middle stay put',
        explain: 'Both chords have the index on fret 1 of the B (Si) string and the middle on fret 2 of the D (Re) string. Only the ==ring finger== moves.',
      },
    ],
  },
  {
    id: 'counting',
    unit: UNIT,
    title: 'Counting: beats and bars',
    goal: 'Count four beats to the bar and strum along with the metronome.',
    steps: [
      {
        kind: 'explain',
        headline: 'Four beats to a bar',
        visual: { kind: 'illustration', name: 'beats-bar' },
        points: [
          'Music has a pulse. Each tap is a **beat**.',
          'Four beats make a bar: ==1 2 3 4==. That is 4/4.',
          '**bpm** = beats per minute. At 60 bpm, one beat per second.',
        ],
        tip: 'One downstroke per beat = quarter notes.',
      },
      {
        kind: 'explain',
        headline: 'Play with the click',
        visual: { kind: 'chords', chordIds: ['G-open', 'C-open', 'D-open'] },
        points: [
          'Switch on the **metronome** in the player. It shows when you drift.',
          'Count out loud: 1 2 3 4.',
        ],
        warn: 'Fumbled a chord? ==Never stop.== Keep moving and land the next one on time.',
      },
      {
        kind: 'riff',
        riffId: 'g-c-d-quarters',
        caption: 'G (Sol), C (Do), D (Re), G (Sol): a new chord every bar. **Metronome on, speed down** until it feels calm.',
      },
      {
        kind: 'check',
        question: 'At 60 bpm, how long is one beat?',
        options: ['One second', 'Half a second', 'Two seconds', 'Four seconds'],
        answer: 'One second',
        explain: '60 beats per minute is **one beat per second**. At 120 bpm each beat is half a second.',
      },
      {
        kind: 'check',
        question: 'What does 4/4 time mean for your counting?',
        options: ['Four beats in every bar', 'Four bars in every song', 'Four chords in every bar', 'Four seconds per bar'],
        answer: 'Four beats in every bar',
        explain: 'The top 4 counts **beats in a bar**. The bottom 4 says each beat is a quarter note. Count 1 2 3 4, repeat.',
      },
      {
        kind: 'check',
        question: 'You miss a chord change in the middle of a bar. What do you do?',
        options: [
          'Keep strumming in time and join in at the next chord',
          'Stop and restart the bar',
          'Pause until you are ready',
          'Speed up to catch up',
        ],
        answer: 'Keep strumming in time and join in at the next chord',
        explain: 'A listener forgives a wrong note, but ==not a stopped beat==. Keep the hand moving.',
      },
    ],
  },
  {
    id: 'down-up',
    unit: UNIT,
    title: 'Down and up strums',
    goal: 'Strum down on the beats and up on the "ands" without ever stopping your hand.',
    steps: [
      {
        kind: 'explain',
        headline: 'Two strums per beat',
        visual: { kind: 'illustration', name: 'note-lengths' },
        points: [
          'Count eighth notes, two to a beat: ==1 & 2 & 3 & 4 &==.',
          'Strum **down** on the numbers and **up** on the "&"s.',
          'On the upstroke, brush only the thin strings, lightly.',
        ],
      },
      {
        kind: 'explain',
        headline: 'The folk strum',
        visual: { kind: 'illustration', name: 'strum-pattern' },
        points: [
          'Down, Down-Up, Up, Down-Up: the go-to pattern in folk and pop.',
          'The hand swings on every "&". On a miss, ==it touches nothing==.',
          'Six strums per bar: **three down, three up**.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'folk-pattern-g-c',
        caption: 'G (Sol), C (Do) and D (Re) with the folk strum. **Slow until your hand never stops**, then speed up.',
      },
      {
        kind: 'check',
        question: 'In the folk strum (Down, Down-Up, Up, Down-Up), how many strums touch the strings in one bar?',
        options: ['Six: three down, three up', 'Eight: four down, four up', 'Four: all down', 'Three: all up'],
        answer: 'Six: three down, three up',
        explain: 'Eight counts pass, but two are **misses**: the hand swings without touching. That leaves six strums.',
      },
      {
        kind: 'check',
        question: 'In a strum pattern, what does a miss mean?',
        options: [
          'The hand swings past without touching the strings',
          'The hand stops and waits',
          'Mute the strings with your palm',
          'Strum twice as hard',
        ],
        answer: 'The hand swings past without touching the strings',
        explain: 'A hand that keeps swinging **keeps the beat in your arm**. If it stops on a miss, the next strum is late.',
      },
      {
        kind: 'check',
        question: 'Which strings does an upstroke usually brush?',
        options: ['The thinner strings, lightly', 'All six, as hard as a downstroke', 'Only the thickest string', 'Only the open strings'],
        answer: 'The thinner strings, lightly',
        explain: 'On the way up the pick meets the thin strings first. A **light brush** of just those gives the bright folk sound.',
      },
    ],
  },
  {
    id: 'first-song',
    unit: UNIT,
    title: 'Your first song',
    goal: 'Play a whole song from start to finish with two chords.',
    steps: [
      {
        kind: 'explain',
        headline: 'Your first song: Tom Dooley',
        visual: { kind: 'chords', chordIds: ['G-open', 'D-open'] },
        points: [
          'An Appalachian ballad well over a century old.',
          'It uses just ==two chords==: G (Sol) and D (Re). You know both already.',
        ],
      },
      {
        kind: 'explain',
        headline: 'The form: two, four, two',
        visual: { kind: 'notes', notes: ['G', 'D', 'G'] },
        points: [
          'Eight bars: G (Sol) for 2, D (Re) for 4, G (Sol) for 2.',
          'Say ==two, four, two== and you have memorised it.',
          'The song plays the eight bars twice.',
        ],
      },
      {
        kind: 'song',
        songId: 'tom-dooley',
        caption: 'Speed down to about 60%. Play **one downstroke per beat** if the folk pattern is too much. Speed up when you get through.',
      },
      {
        kind: 'explain',
        headline: 'Change early',
        visual: { kind: 'illustration', name: 'change-early' },
        points: [
          'On the **last beat** of a bar, your fingers are already travelling.',
          'The new chord lands exactly on ==beat 1==.',
        ],
        warn: 'Waiting for the bar line makes you late every time.',
      },
      {
        kind: 'explain',
        headline: 'Slow beats fast',
        visual: { kind: 'illustration', name: 'slow-loop' },
        points: [
          'Play at the speed where you ==never stop==.',
          'Then add speed in small steps.',
          'Singing along makes the time easier to keep.',
        ],
      },
      {
        kind: 'explain',
        headline: 'Next: three more songs',
        visual: { kind: 'chords', chordIds: ['G-open', 'C-open', 'D-open'] },
        points: [
          'Try Oh! Susanna, When the Saints Go Marching In and Aura Lee.',
          'All use only G (Sol), C (Do) and D (Re). Find them in the ==Songs tab==.',
        ],
      },
      {
        kind: 'check',
        question: 'How many bars of D (Re) come in a row in Tom Dooley?',
        options: ['One', 'Two', 'Three', 'Four'],
        answer: 'Four',
        explain: 'The form is two bars of G (Sol), **four of D (Re)**, then two more of G (Sol).',
      },
      {
        kind: 'check',
        question: 'Which chords does Tom Dooley use?',
        options: ['G (Sol) and D (Re)', 'G (Sol), C (Do) and D (Re)', 'Em (Mi minor) and Am (La minor)', 'D (Re) and A (La)'],
        answer: 'G (Sol) and D (Re)',
        explain: 'Just **two chords**, which makes it a good first song.',
      },
      {
        kind: 'check',
        question: 'When should you start moving to the next chord?',
        options: [
          'During the last beat of the bar, so it lands on beat 1',
          'On beat 1 of the new bar, after you hear the click',
          'After you finish the bar and stop',
          'Two bars before the change',
        ],
        answer: 'During the last beat of the bar, so it lands on beat 1',
        explain: 'Your hand needs time to travel. Leaving on the **last beat** makes the new chord land on time.',
      },
    ],
  },
];
