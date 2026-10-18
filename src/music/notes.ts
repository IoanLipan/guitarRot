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

/** Fixed-do: the syllable belongs to the letter, whatever the key. */
const SOLFEGE_BY_LETTER: Record<string, string> = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};

/**
 * Derived from the letter tables rather than typed out twice, so a solfège
 * name can never disagree with the letter name it sits next to.
 */
function toSolfege(letterName: string): string {
  const syllable = SOLFEGE_BY_LETTER[letterName.charAt(0)];
  if (syllable === undefined) throw new Error(`No solfège for ${letterName}`);
  return `${syllable}${letterName.slice(1)}`;
}

export const SOLFEGE_SHARP_NAMES: readonly string[] = SHARP_NAMES.map(toSolfege);

export const SOLFEGE_FLAT_NAMES: readonly string[] = FLAT_NAMES.map(toSolfege);

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

/** The one place a spelling is read; `flat` records whether it was written with a flat. */
function parseSpelling(s: string): { midi: Midi; flat: boolean } {
  const match = NOTE_PATTERN.exec(s.trim());
  if (match === null) throw new Error(`Unparseable note name: ${s}`);

  const [, letter = '', accidentals = '', octaveText] = match;

  const base = LETTER_OFFSET[letter.toUpperCase()];
  if (base === undefined) throw new Error(`Unparseable note letter: ${s}`);

  let offset = 0;
  let flat = false;
  for (const ch of accidentals) {
    if (ch === '#' || ch === '♯') offset += 1;
    else if (ch === 'b' || ch === '♭') {
      offset -= 1;
      flat = true;
    } else if (ch === 'x') offset += 2;
  }

  const octave = octaveText === undefined ? 4 : Number.parseInt(octaveText, 10);
  return { midi: (octave + 1) * 12 + base + offset, flat };
}

/** Parses "C", "C#4", "Bb3", "C♯4". Octave defaults to 4 when omitted. */
export function parseNoteName(s: string): Midi {
  return parseSpelling(s).midi;
}

/** Fixed-do syllable of a pitch class: "Do", "Fa#", or with `preferFlat`, "Reb". */
export function solfegeName(
  pc: PitchClass,
  opts: { preferFlat?: boolean } = {},
): string {
  const table = opts.preferFlat ? SOLFEGE_FLAT_NAMES : SOLFEGE_SHARP_NAMES;
  const name = table[midiToPitchClass(pc)];
  if (name === undefined) throw new Error(`Unnameable pitch class: ${pc}`);
  return name;
}

/**
 * The bare syllable for a letter spelling as the app prints it: "E2" ->
 * "Mi", "Bb" -> "Sib". The octave is ignored and a flat spelling gets the
 * flat name; throws on anything `parseNoteName` would reject.
 */
export function spellingSolfege(spelling: string): string {
  const { midi, flat } = parseSpelling(spelling);
  return solfegeName(midi, { preferFlat: flat });
}

/**
 * A letter spelling with its solfège in brackets: "F#" -> "F# (Fa#)",
 * "E2" -> "E2 (Mi)". Only for display — compare and store the plain
 * spelling, never this.
 */
export function withSolfege(spelling: string): string {
  return `${spelling.trim()} (${spellingSolfege(spelling)})`;
}

/** `noteName` with its solfège, e.g. 40 -> "E (Mi)", or "E2 (Mi)" with an octave. */
export function noteLabel(
  m: Midi,
  opts: { preferFlat?: boolean; withOctave?: boolean } = {},
): string {
  return withSolfege(noteName(m, opts));
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
