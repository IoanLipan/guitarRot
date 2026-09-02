/** A MIDI note number. 60 is C4; 40 is the open low E string (E2). */
export type Midi = number;

/** 0-11, where 0 is C. */
export type PitchClass = number;

export const SHARP_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export const FLAT_NAMES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

/** Semitone offset of each natural letter above C. */
const LETTER_OFFSET: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

export function midiToPitchClass(m: Midi): PitchClass {
  return ((m % 12) + 12) % 12;
}

export function midiToOctave(m: Midi): number {
  return Math.floor(m / 12) - 1;
}

export function pitchClassName(
  pc: PitchClass,
  opts: { preferFlat?: boolean } = {},
): string {
  const table = opts.preferFlat ? FLAT_NAMES : SHARP_NAMES;
  const name = table[midiToPitchClass(pc)];
  if (name === undefined) throw new Error(`Unnameable pitch class: ${pc}`);
  return name;
}

export function noteName(
  m: Midi,
  opts: { preferFlat?: boolean; withOctave?: boolean } = {},
): string {
  const base = pitchClassName(midiToPitchClass(m), opts);
  return opts.withOctave ? `${base}${midiToOctave(m)}` : base;
}

const NOTE_PATTERN = /^([A-Ga-g])([#b♯♭x]*)(-?\d+)?$/;

/** Parses "C", "C#4", "Bb3", "C♯4". Octave defaults to 4 when omitted. */
export function parseNoteName(s: string): Midi {
  const match = NOTE_PATTERN.exec(s.trim());
  if (match === null) throw new Error(`Unparseable note name: ${s}`);

  const [, letter = '', accidentals = '', octaveText] = match;

  const base = LETTER_OFFSET[letter.toUpperCase()];
  if (base === undefined) throw new Error(`Unparseable note letter: ${s}`);

  let offset = 0;
  for (const ch of accidentals) {
    if (ch === '#' || ch === '♯') offset += 1;
    else if (ch === 'b' || ch === '♭') offset -= 1;
    else if (ch === 'x') offset += 2;
  }

  const octave = octaveText === undefined ? 4 : Number.parseInt(octaveText, 10);
  return (octave + 1) * 12 + base + offset;
}

export function transpose(m: Midi, semitones: number): Midi {
  return m + semitones;
}

/** Common spellings of a pitch class: one entry for naturals, two for accidentals. */
export function enharmonics(pc: PitchClass): string[] {
  const sharp = pitchClassName(pc);
  const flat = pitchClassName(pc, { preferFlat: true });
  return sharp === flat ? [sharp] : [sharp, flat];
}
