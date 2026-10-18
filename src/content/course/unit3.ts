import type { Lesson } from '../lessons';

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
        kind: 'text',
        title: 'Notes together',
        body: [
          'A chord is several notes played at once. You press a shape with your fretting hand and brush the pick across the strings in one smooth sweep, thickest to thinnest.',
          'Em (Mi minor) is the friendliest chord on the guitar: two fingers, and all six strings ring. Minor chords sound darker and sadder than major ones.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'Em-open',
        caption:
          'Middle finger on fret 2 of the A (La) string, ring finger on fret 2 of the D (Re) string. The other four strings ring open. Strum all six.',
      },
      {
        kind: 'text',
        title: 'Make it ring',
        body: [
          'Arch your fingers so only the tips touch the strings; a flat finger mutes its neighbour. Keep your thumb behind the neck.',
          'Check it: pluck the strings one at a time, thickest first. Each should ring clearly. If one buzzes or sounds dead, find the finger touching it and fix the arch.',
          'Then strum with a relaxed wrist and let the pick fall through all six strings. A clean sweep beats a hard hit.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'em-four-downs',
        caption:
          'Four bars of Em (Mi minor), one downstroke on every beat. Count 1 2 3 4 out loud and keep your hand moving at a steady pulse.',
      },
      {
        kind: 'check',
        question: 'Which notes are in Em (Mi minor)?',
        options: [
          'E (Mi), G (Sol), B (Si)',
          'E (Mi), G# (Sol#), B (Si)',
          'E (Mi), F (Fa), A (La)',
          'E (Mi), A (La), D (Re)',
        ],
        answer: 'E (Mi), G (Sol), B (Si)',
        explain:
          'Em (Mi minor) is E (Mi), G (Sol) and B (Si). Raise the G (Sol) one fret to G# (Sol#) and you would have E (Mi) major instead.',
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
        explain:
          'Those two fingers sit side by side on fret 2 of strings 5 and 4. The remaining four strings are open.',
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
        explain:
          'A dead string almost always means a finger is lying against it. Playing the strings one at a time shows you which, and arching that finger frees the string.',
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
        kind: 'text',
        title: 'Em (Mi minor)\'s cousin',
        body: [
          'Am (La minor) is Em (Mi minor)\'s two-finger shape moved one string toward the floor, plus your index finger on fret 1 of the B (Si) string.',
          'Skip the thickest string. The lowest note of Am (La minor) should be the open A (La) string, so start your strum there and let the pick miss the low E (Mi). Letting it ring makes the chord muddy.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'Am-open',
        caption:
          'Index on fret 1 of the B (Si) string, middle on fret 2 of the D (Re) string, ring on fret 2 of the G (Sol) string. Start the strum on the open A (La) string.',
      },
      {
        kind: 'text',
        title: 'Changing chords',
        body: [
          'Move from Em (Mi minor) to Am (La minor) as one block. Your middle and ring fingers keep their shape and slide over one string together, and the index finger drops onto fret 1 of the B (Si) string. Do not move finger by finger.',
          'Practise the change silently first: make the shape, count to four, change, count to four. Keep your fingers close to the strings as they travel. Speed comes from never stopping, not from rushing.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'em-am-change',
        caption:
          'Two bars of Em (Mi minor), two of Am (La minor), twice. Start moving the moment you strum the last beat of a bar.',
      },
      {
        kind: 'check',
        question: 'Which notes are in Am (La minor)?',
        options: [
          'A (La), C (Do), E (Mi)',
          'A (La), C# (Do#), E (Mi)',
          'A (La), B (Si), D (Re)',
          'A (La), C (Do), G (Sol)',
        ],
        answer: 'A (La), C (Do), E (Mi)',
        explain:
          'Am (La minor) is A (La), C (Do) and E (Mi). Raise the C (Do) one fret to C# (Do#) and you get A (La) major.',
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
        explain:
          'The open A (La) string is the root of the chord and should be its lowest note. The low E (Mi) string is not part of the shape.',
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
        explain:
          'The two fingers already have the right shape for Am (La minor); they only need to move one string over. Moving them together keeps the change fast and in time.',
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
        kind: 'text',
        title: 'D (Re): a small triangle',
        body: [
          'D (Re) is a triangle of three fingers on the three thinnest strings: index on fret 2 of the G (Sol) string, middle on fret 2 of the high E (Mi) string, ring on fret 3 of the B (Si) string.',
          'Only the four thinnest strings belong to D (Re): the open D (Re) string plus the three you are fretting. Start your strum on the D (Re) string and miss the two thickest. Major chords like this sound bright and open.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'D-open',
        caption: 'Strum from the open D (Re) string down: four strings only.',
      },
      {
        kind: 'text',
        title: 'A (La): three fingers side by side',
        body: [
          'A (La) squeezes three fingers onto fret 2: index on the D (Re) string, middle on the G (Sol) string, ring on the B (Si) string. The open A (La) string is the root, so start your strum there and skip the low E (Mi).',
          'The usual problem is the ring finger leaning on the high E (Mi) string and muting it. Arch that finger until the thin string rings free.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'A-open',
        caption: 'Five strings: from the open A (La) string down.',
      },
      {
        kind: 'riff',
        riffId: 'd-a-change',
        caption:
          'Two bars of D (Re), two of A (La), twice. Same idea as before: move the whole shape, and keep the strum on time.',
      },
      {
        kind: 'check',
        question: 'How many strings do you strum for D (Re)?',
        options: [
          'Four: the D (Re) string and the three thinner ones',
          'All six',
          'Five',
          'Three',
        ],
        answer: 'Four: the D (Re) string and the three thinner ones',
        explain:
          'The two thickest strings are not in the chord, so the strum starts on the D (Re) string and goes down.',
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
        explain:
          'Am (La minor) is A (La), C (Do), E (Mi). A (La) major is A (La), C# (Do#), E (Mi). That one note, a fret higher, is the whole difference between a sad chord and a bright one.',
      },
      {
        kind: 'check',
        question: 'Which notes make D (Re) major?',
        options: [
          'D (Re), F# (Fa#), A (La)',
          'D (Re), F (Fa), A (La)',
          'D (Re), G (Sol), A (La)',
          'D (Re), E (Mi), A (La)',
        ],
        answer: 'D (Re), F# (Fa#), A (La)',
        explain:
          'D (Re) major is D (Re), F# (Fa#) and A (La). With F (Fa) instead of F# (Fa#) it would be D (Re) minor.',
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
        kind: 'text',
        title: 'G (Sol): the big stretch',
        body: [
          'G (Sol) is the first chord that makes your hand stretch. Ring finger on fret 3 of the low E (Mi) string, middle finger on fret 2 of the A (La) string, pinky on fret 3 of the high E (Mi) string. Strum all six strings; the three in the middle ring open.',
          'It feels awkward at first, and that is normal. Build it one finger at a time, thickest string first, and pluck each string to check it rings.',
        ],
      },
      { kind: 'chord', chordId: 'G-open', caption: 'All six strings. Check the open G (Sol) and B (Si) strings are not touched by a finger.' },
      {
        kind: 'text',
        title: 'C (Do): a staircase',
        body: [
          'C (Do) steps down the fretboard: ring finger on fret 3 of the A (La) string, middle on fret 2 of the D (Re) string, index on fret 1 of the B (Si) string. Strum from the A (La) string and skip the low E (Mi).',
          'Two of these fingers are already in Am (La minor): the index and the middle finger stay put, and only the ring finger moves. That makes Am (La minor) to C (Do) the easiest change you will learn.',
        ],
      },
      { kind: 'chord', chordId: 'C-open', caption: 'Five strings, from the A (La) string. Let the open G (Sol) and high E (Mi) strings ring.' },
      {
        kind: 'text',
        title: 'From G (Sol) to C (Do)',
        body: [
          'Your ring and middle fingers each hop one string toward the floor and keep their frets. The ring finger goes from the low E (Mi) string to the A (La) string at fret 3. The middle goes from the A (La) string to the D (Re) string at fret 2.',
          'The index lands on fret 1 of the B (Si) string and the pinky lifts away. Think of the fingers walking over together, and the change gets quicker each day.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'g-c-change',
        caption:
          'Two bars of G (Sol), two of C (Do), twice. This is the change most beginners struggle with. Go slow and keep your hand moving.',
      },
      {
        kind: 'check',
        question: 'Which notes are in G (Sol) major?',
        options: [
          'G (Sol), B (Si), D (Re)',
          'G (Sol), Bb (Sib), D (Re)',
          'G (Sol), C (Do), D (Re)',
          'G (Sol), B (Si), E (Mi)',
        ],
        answer: 'G (Sol), B (Si), D (Re)',
        explain:
          'G (Sol) major is G (Sol), B (Si) and D (Re). Lowering the B (Si) one fret to Bb (Sib) would make it G (Sol) minor.',
      },
      {
        kind: 'check',
        question: 'Which notes are in C (Do) major?',
        options: [
          'C (Do), E (Mi), G (Sol)',
          'C (Do), Eb (Mib), G (Sol)',
          'C (Do), F (Fa), G (Sol)',
          'C (Do), E (Mi), A (La)',
        ],
        answer: 'C (Do), E (Mi), G (Sol)',
        explain: 'C (Do) major is C (Do), E (Mi) and G (Sol). With Eb (Mib) instead of E (Mi) it would be C (Do) minor.',
      },
      {
        kind: 'check',
        question: 'Which string do you skip when you strum C (Do)?',
        options: [
          'The low E (Mi) string',
          'The A (La) string',
          'The high E (Mi) string',
          'None: strum all six',
        ],
        answer: 'The low E (Mi) string',
        explain: 'C (Do) starts on the A (La) string, with the root on fret 3. The low E (Mi) string is not in the chord.',
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
        explain:
          'Both chords have the index on fret 1 of the B (Si) string and the middle on fret 2 of the D (Re) string. Only the ring finger moves, from fret 2 of the G (Sol) string to fret 3 of the A (La) string.',
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
        kind: 'text',
        title: 'The pulse',
        body: [
          'Music has a pulse, like a foot tapping. Each tap is a beat. Beats are grouped into bars (also called measures), and most songs count four beats to a bar: 1 2 3 4, 1 2 3 4. That is called 4/4 time.',
          'Speed is measured in bpm, beats per minute. At 60 bpm there is one beat every second; at 120 bpm there are two beats every second.',
          'A quarter note is one beat long. When you strum down once per beat, you are playing quarter notes.',
        ],
      },
      {
        kind: 'text',
        title: 'Play with the click',
        body: [
          'A metronome is a click that keeps the beat for you. Switch on the metronome in the player below and strum along; it will tell you honestly when you drift.',
          'Rule one of rhythm is never stop. If you fumble a chord, keep your hand moving and land the next chord on time. A steady wrong chord beats a stop-start right one.',
          'Count out loud, "1 2 3 4". Your voice keeps the time when your hands are busy.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'g-c-d-quarters',
        caption:
          'G (Sol), C (Do), D (Re), G (Sol): a new chord every bar, one downstroke on each beat. Turn the metronome on and the speed down until it is calm.',
      },
      {
        kind: 'check',
        question: 'At 60 bpm, how long is one beat?',
        options: ['One second', 'Half a second', 'Two seconds', 'Four seconds'],
        answer: 'One second',
        explain: '60 beats per minute is one beat per second. At 120 bpm each beat would be half a second.',
      },
      {
        kind: 'check',
        question: 'What does 4/4 time mean for your counting?',
        options: [
          'Four beats in every bar',
          'Four bars in every song',
          'Four chords in every bar',
          'Four seconds per bar',
        ],
        answer: 'Four beats in every bar',
        explain: 'The top 4 counts the beats in a bar, and the bottom 4 says each beat is a quarter note. You count 1 2 3 4 and start again.',
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
        explain:
          'The pulse is what holds music together. A listener forgives a wrong note, but not a stopped beat, so keep the hand moving.',
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
        kind: 'text',
        title: 'Eighth notes',
        body: [
          'Strumming is not only down. Count in eighth notes, two to a beat: "1 & 2 & 3 & 4 &". Strum down on the numbers and up on the "&"s.',
          'Your hand never stops. It swings down-up-down-up like a pendulum, all the way through, and on some counts it swings without touching the strings. That is what keeps the rhythm steady.',
          'On the upstroke, brush only the thinner strings, lightly. Do not try to hit all six.',
        ],
      },
      {
        kind: 'text',
        title: 'The folk strum',
        body: [
          'The most useful pattern in folk and pop is Down, Down-Up, Up, Down-Up. Under the count it goes: 1 Down, "&" miss, 2 Down, "&" Up, 3 miss, "&" Up, 4 Down, "&" Up.',
          'The misses are not rests for your hand. It still swings; it just does not touch the strings. That makes six strums per bar: three down, three up.',
          'Learn it in two steps. First swing down-up-down-up on a muted chord, counting "1 & 2 & 3 & 4 &". Then add the pattern by touching the strings only on the counts that matter.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'folk-pattern-g-c',
        caption:
          'G (Sol), C (Do) and D (Re) with the folk strum. Turn the speed down until your hand never stops, then bring it up. A wrong chord is better than a stopped hand.',
      },
      {
        kind: 'check',
        question: 'In the folk strum (Down, Down-Up, Up, Down-Up), how many strums touch the strings in one bar?',
        options: [
          'Six: three down, three up',
          'Eight: four down, four up',
          'Four: all down',
          'Three: all up',
        ],
        answer: 'Six: three down, three up',
        explain:
          'Eight eighth-note counts pass in a bar, but two of them are misses where your hand swings through without touching the strings. That leaves six strums.',
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
        explain:
          'A hand that keeps swinging keeps the beat inside your arm. If it stops on the misses, the next strum comes in late.',
      },
      {
        kind: 'check',
        question: 'Which strings does an upstroke usually brush?',
        options: [
          'The thinner strings, lightly',
          'All six, as hard as a downstroke',
          'Only the thickest string',
          'Only the open strings',
        ],
        answer: 'The thinner strings, lightly',
        explain:
          'On the way up the pick meets the thin strings first. A light brush across just those gives the bright, quick sound of the folk strum.',
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
        kind: 'text',
        title: 'Tom Dooley',
        body: [
          'You know enough chords to play a whole song. Tom Dooley is an Appalachian ballad well over a century old, and it uses just two chords: G (Sol) and D (Re).',
          'The form is eight bars: G (Sol) for two bars, D (Re) for four, then G (Sol) for two. Say "two, four, two" and you have memorised it. The song plays that eight-bar form twice.',
        ],
      },
      {
        kind: 'song',
        songId: 'tom-dooley',
        caption:
          'Turn the speed down to about 60% and strum a single downstroke on each beat if the folk pattern is too much. Speed up only when you get through without stopping.',
      },
      {
        kind: 'text',
        title: 'Change early',
        body: [
          'Look ahead. As you strum the last beat of a bar, your fingers are already travelling to the next chord, so the new one lands exactly on beat 1. If you wait for the bar line, you will always be late.',
          'Slow beats fast. Play at the speed where you never stop, then add speed in small steps. Singing along makes the time easier to keep.',
          'When this feels easy, try Oh! Susanna, When the Saints Go Marching In and Aura Lee in the Songs tab: all three use G (Sol), C (Do) and D (Re).',
        ],
      },
      {
        kind: 'check',
        question: 'How many bars of D (Re) come in a row in Tom Dooley?',
        options: ['One', 'Two', 'Three', 'Four'],
        answer: 'Four',
        explain: 'The form is two bars of G (Sol), four of D (Re), then two more of G (Sol).',
      },
      {
        kind: 'check',
        question: 'Which chords does Tom Dooley use?',
        options: [
          'G (Sol) and D (Re)',
          'G (Sol), C (Do) and D (Re)',
          'Em (Mi minor) and Am (La minor)',
          'D (Re) and A (La)',
        ],
        answer: 'G (Sol) and D (Re)',
        explain: 'Just two chords, which is why it is a good first song.',
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
        explain:
          'Your hand needs a moment to travel. Leaving on the last beat means the new chord sounds right on time instead of a beat late.',
      },
    ],
  },
];
