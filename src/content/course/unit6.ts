import type { Lesson } from '../lessons';

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
        kind: 'text',
        title: 'Notes without the pick',
        body: [
          'A hammer-on sounds a note without picking it. Pick one note, then bring another finger down hard on a higher fret: the impact makes the string ring. A pull-off is the reverse: pick a fretted note, then pull the finger away with a little flick, so the lower note, often the open string, sounds.',
          'They make playing smoother, which guitarists call legato, and faster, because your fretting hand does the work and your picking hand gets a rest.',
        ],
      },
      {
        kind: 'text',
        title: 'How to do them well',
        body: [
          'Hammer-on: keep the finger curved and lifted just above the fret, then drop it quickly and firmly right behind the fret wire, like a small hammer.',
          'Pull-off: put the finger down, pick the note, then pull the finger off sideways toward the floor so it plucks the string as it leaves. Do not just lift straight up.',
          'The usual mistake is a second note much quieter than the first. Fix it with a faster, firmer hammer or a more decisive flick.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'legato-drill',
        caption:
          'Only the first note of each pair is picked; the second is hammered on or pulled off. Aim for the same volume on both notes. Bar 3 is a trill on the B (Si) string with a single pick.',
      },
      {
        kind: 'check',
        question: 'How many times do you pick the string for a hammer-on pair?',
        options: [
          'Once: the second note comes from your fretting finger',
          'Twice',
          'Never',
          'Three times',
        ],
        answer: 'Once: the second note comes from your fretting finger',
        explain:
          'You pick the first note only. The second sounds because your finger lands hard enough on the higher fret to set the string ringing again.',
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
        explain:
          'Pulling the finger off with a small sideways flick plucks the string, so the note beneath your finger sounds on its own.',
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
        explain:
          'The hammered note gets all its volume from the finger, so speed and firmness matter. Landing close behind the fret wire also helps.',
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
        kind: 'text',
        title: 'Slides',
        body: [
          'A slide moves a note up or down the neck without lifting your finger. Pick a note, keep pressing the string, and glide your finger along it to the new fret. The pitch rises or falls smoothly through the notes in between.',
          'Press firmly enough to keep the note ringing, but lightly enough to glide. Keep the pressure on until you arrive: if you lift, the sound stops.',
        ],
      },
      {
        kind: 'text',
        title: 'Bends',
        body: [
          'A bend raises a note by pushing the string sideways across the fretboard. A whole-step bend raises the pitch by two frets\' worth: fret a note, push until it sounds like the note two frets higher.',
          'Use your ring finger for the push, with the middle and index fingers on the frets behind it to help. Turn your wrist, like turning a door handle, instead of just pushing with the finger. Bends are easier on the thin strings.',
          'Always check yourself against the target. Play the target note first, then bend the lower note until it sounds the same.',
        ],
      },
      {
        kind: 'fretboard',
        caption:
          'A bend target on the B (Si) string. Tap fret 10 to hear where you are heading, then tap fret 8 to hear where you start.',
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
        caption:
          'Bars 1 and 2: pick the first note, then slide up two frets without lifting. Bars 3 and 4: you hear the target first, then bend the lower note up to match it. Every note comes from E (Mi) minor pentatonic.',
      },
      {
        kind: 'check',
        question: 'A whole-step bend raises the pitch as much as moving up how many frets?',
        options: ['One fret', 'Two frets', 'Three frets', 'Four frets'],
        answer: 'Two frets',
        explain: 'A whole step is two frets. A half-step bend would match the next fret up.',
      },
      {
        kind: 'check',
        question: 'You fret fret 8 of the B (Si) string, which is G (Sol), and bend it a whole step. Which note do you reach?',
        options: ['A (La)', 'G# (Sol#)', 'B (Si)', 'F# (Fa#)'],
        answer: 'A (La)',
        explain:
          'A whole step is two frets, so the bent note sounds like fret 10, which is A (La). G# (Sol#) would be only a half-step bend.',
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
        explain: 'Your ear is the judge. Hearing the target first gives you the pitch to aim for.',
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
        explain: 'Lifting would stop the note. The sound of a slide is the pitch moving while the string keeps ringing.',
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
        kind: 'text',
        title: 'The hard one',
        body: [
          'F (Fa) is the chord most beginners dread, because it needs a barre: your index finger lies flat across the strings at fret 1 and works like a movable nut. It takes weeks, not days. Everyone struggles with it, and that is normal.',
          'Fmaj7 (Fa major seventh) is the stepping stone. On the D (Re), G (Sol) and B (Si) strings it plays the same notes as F (Fa), with no barre: ring on fret 3, middle on fret 2, index on fret 1. The open high E (Mi) string is the extra note.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'Fmaj7-open',
        caption: 'Four strings only. Index on fret 1 of the B (Si) string, middle on fret 2 of the G (Sol) string, ring on fret 3 of the D (Re) string.',
      },
      {
        kind: 'text',
        title: 'Then add the barre',
        body: [
          'Now lay your index finger flat across fret 1 so it also presses the high E (Mi) string. The open E (Mi) turns into F (Fa), and the four thin strings now make a full F (Fa) chord.',
          'For the full six-string barre, roll your index finger slightly onto its bony edge, keep it close to the fret wire, and put your thumb low behind the neck. Squeezing with the whole hand will not help; use the finger, and let the weight of your arm do some of the work.',
          'Check every string one at a time. Pluck, listen, and adjust until all six ring clearly.',
        ],
      },
      {
        kind: 'chord',
        chordId: 'F-barre',
        caption: 'Index across all six strings at fret 1, middle on fret 2 of the G (Sol) string, ring on fret 3 of the A (La) string, pinky on fret 3 of the D (Re) string.',
      },
      {
        kind: 'listen',
        caption: 'Hold the F (Fa) barre and pluck each string one at a time, thickest first. Each should ring clearly, with no buzz.',
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
        kind: 'text',
        title: 'Practise it kindly',
        body: [
          'Work in short bursts: 30 seconds of barre, then shake your hand out. Move slowly between F (Fa) and C (Do), and between F (Fa) and Am (La minor), counting four beats on each.',
        ],
      },
      {
        kind: 'check',
        question: 'What does Fmaj7 (Fa major seventh) add to F (Fa), A (La), C (Do)?',
        options: ['E (Mi)', 'Eb (Mib)', 'G (Sol)', 'D (Re)'],
        answer: 'E (Mi)',
        explain:
          'Fmaj7 (Fa major seventh) is F (Fa), A (La), C (Do) and E (Mi), the note one fret below F (Fa). Eb (Mib) would make it F7 (Fa dominant seventh) instead.',
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
        explain: 'The index finger presses every string at fret 1, while the other three fingers make the shape on frets 2 and 3.',
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
        explain:
          'Buzzing usually comes from the soft part of the finger, or a joint crease, lying over a string. The bony edge presses cleanly, and close to the wire it needs less force.',
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
        kind: 'text',
        title: 'Little and often',
        body: [
          'Fifteen minutes every day beats two hours on Sunday. Your fingers and your memory learn while you rest, and short sessions toughen your fingertips without hurting your hand.',
          'Slow and clean is the whole secret. Play at a speed where you make no mistakes, with the metronome on. When it is easy several times in a row, raise the tempo by about 5 bpm. Speed arrives on its own.',
          'When one bar keeps going wrong, do not replay the whole piece. Loop just that bar, or just that chord change, slowly, until it is clean. Then put it back.',
        ],
      },
      {
        kind: 'text',
        title: 'A 15-minute session',
        body: [
          'Three minutes: warm-up, below. Five minutes: the newest thing you are learning, slow and clean. Four minutes: a song or tune you already half know. Three minutes: play whatever you like, because that is why you picked up the guitar.',
        ],
      },
      {
        kind: 'riff',
        riffId: 'chromatic-warmup',
        caption:
          'Your warm-up: frets 1, 2, 3 and 4 with fingers 1, 2, 3 and 4, on the low E (Mi), A (La), D (Re) and G (Sol) strings in turn. Keep each finger close to the string, and start slow.',
      },
      {
        kind: 'text',
        title: 'Where to go next',
        body: [
          'You have been through the whole course. The Songs tab has more chord songs and melodies to try, the Feed serves up riffs and chords to pick up, and the Quiz keeps your note names sharp. Come back to any lesson here whenever something feels shaky.',
        ],
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
        explain:
          'Skills settle between sessions. Frequent short practice gives your hands and memory more nights to absorb it.',
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
        explain:
          'Replaying the whole song spends most of your time on parts you already know. Looping the hard spot puts the practice where the problem is.',
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
        explain:
          'Small steps keep you playing clean. Speeding up before it is solid just practises the mistakes faster.',
      },
    ],
  },
];
