import type { Lesson, LessonStep } from '@/content';

/**
 * Cards written only to be looked at in the dev gallery. They follow the same
 * rules as the real course (the gallery's test runs `validateLesson` over
 * them), so what looks right here has the length and markup real cards have.
 */
type Explain = Extract<LessonStep, { kind: 'explain' }>;

export const SAMPLES: readonly { label: string; step: Explain }[] = [
  {
    label: 'Illustration, 3 points, tip',
    step: {
      kind: 'explain',
      headline: 'Six strings, ==thick to thin==',
      visual: { kind: 'illustration', name: 'string-order' },
      points: [
        'String **6** is the thickest and lowest.',
        'String **1** is the thinnest and highest.',
        'Top down: E (Mi), A (La), D (Re), G (Sol), B (Si), E (Mi).',
      ],
      tip: 'Remember: **E**ddie **A**te **D**ynamite **G**ood **B**ye **E**ddie.',
    },
  },
  {
    label: 'Neck, tap to hear, highlighted string',
    step: {
      kind: 'explain',
      headline: 'One fret is ==one step== up',
      visual: {
        kind: 'neck',
        fretRange: [0, 5],
        dots: [
          { stringIndex: 0, fret: 0 },
          { stringIndex: 0, fret: 1 },
          { stringIndex: 0, fret: 3 },
          { stringIndex: 0, fret: 5 },
        ],
        highlightStrings: [0],
        tapToHear: true,
      },
      points: [
        'The open low string is E (Mi). Fret **1** is F (Fa).',
        'Fret **3** is G (Sol) and fret **5** is A (La).',
        'Every fret you move up makes the note a little **higher**.',
      ],
      tip: 'Tap anywhere on the neck to hear that fret.',
    },
  },
  {
    label: 'Neck, finger numbers, mistake',
    step: {
      kind: 'explain',
      headline: 'Two fingers make Em (Mi minor)',
      visual: {
        kind: 'neck',
        fretRange: [0, 4],
        dots: [
          { stringIndex: 1, fret: 2, label: '2' },
          { stringIndex: 2, fret: 2, label: '3' },
        ],
      },
      points: [
        'Finger **2** goes on string 5, fret 2.',
        'Finger **3** goes on string 4, fret 2.',
        'Strum all six strings.',
      ],
      warn: 'A flat finger mutes the string next to it. Press with your ==fingertips==.',
    },
  },
  {
    label: 'Neck, solfège labels',
    step: {
      kind: 'explain',
      headline: 'The same notes, by their **solfège** names',
      visual: {
        kind: 'neck',
        fretRange: [0, 5],
        dots: [
          { stringIndex: 1, fret: 0, label: 'solfege' },
          { stringIndex: 1, fret: 2, label: 'solfege' },
          { stringIndex: 1, fret: 3, label: 'solfege' },
          { stringIndex: 1, fret: 5, label: 'solfege' },
        ],
        highlightStrings: [1],
      },
      points: ['String 5 starts on La and climbs: **La**, **Si**, **Do**, **Re**.'],
    },
  },
  {
    label: 'Two chords side by side',
    step: {
      kind: 'explain',
      headline: 'Same root, different ==mood==',
      visual: { kind: 'chords', chordIds: ['A-open', 'Am-open'] },
      points: [
        'A (La) sounds **bright** and open.',
        'Am (La minor) sounds **darker** and more serious.',
      ],
      tip: 'Tap each one and listen to the difference.',
    },
  },
  {
    label: 'Three chords',
    step: {
      kind: 'explain',
      headline: 'Three chords, ==a lot== of songs',
      visual: { kind: 'chords', chordIds: ['G-open', 'C-open', 'D-open'] },
      points: ['G (Sol), C (Do) and D (Re) get along really well.', 'Learn these three and you can already play along.'],
    },
  },
  {
    label: 'Notes: the alphabet',
    step: {
      kind: 'explain',
      headline: 'Seven letters, then ==again==',
      visual: { kind: 'notes', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
      points: [
        'The musical alphabet is only **A** to **G**.',
        'After G it starts again from A, one octave higher.',
      ],
      tip: 'Tap a bubble to hear it.',
    },
  },
  {
    label: 'Notes: chord tones, one point',
    step: {
      kind: 'explain',
      headline: 'Em (Mi minor) is three notes',
      visual: { kind: 'notes', notes: ['E', 'G', 'B'] },
      points: ['Play them together and you hear **one** sound: the chord.'],
      warn: 'Do not strum the notes one by one: they should ring ==together==.',
    },
  },
  {
    label: 'Densest case: 3 points and a tip',
    step: {
      kind: 'explain',
      headline: 'Press ==just behind== the fret',
      visual: { kind: 'illustration', name: 'fret-finger' },
      points: [
        'Fingertip on the string, right **behind** the fret wire, on the headstock side.',
        'Press firmly, with your thumb behind the neck.',
        'Pick it and listen: it should ring **clearly**.',
      ],
      tip: 'Short nails help.',
    },
  },
  {
    label: 'One point, wide illustration',
    step: {
      kind: 'explain',
      headline: 'Where the picture will be',
      visual: { kind: 'illustration', name: 'guitar-parts' },
      points: ['If a drawing is missing, this card holds its place.'],
    },
  },
];

export const SAMPLE_CHECKS: readonly LessonStep[] = [
  {
    kind: 'check',
    question: 'Which string is the **thickest**?',
    options: ['String 6', 'String 1', 'String 3'],
    answer: 'String 6',
    explain: 'The thickest string is the **low** one, string 6.',
  },
  {
    kind: 'check',
    question: 'What is the open note on the thick low string?',
    options: ['E (Mi)', 'A (La)', 'G (Sol)'],
    answer: 'E (Mi)',
    explain: 'The low string is E (Mi). String 5, the next one, is A (La).',
  },
];

/** A short lesson in the real shell, for `?gallery=lesson`. */
export const DEMO_LESSON: Lesson = {
  id: 'gallery-demo',
  unit: 'Gallery',
  title: 'Gallery demo lesson',
  goal: 'Name the strings from thick to thin, starting with E (Mi).',
  steps: [...SAMPLES.map((sample) => sample.step), ...SAMPLE_CHECKS],
};
