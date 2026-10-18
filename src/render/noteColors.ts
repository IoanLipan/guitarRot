/**
 * One colour per note letter, the same everywhere a note is shown: chips in
 * lesson text, note bubbles, illustration labels. Seeing Mi in yellow every
 * time is a second hook for the memory besides the name.
 *
 * Coloured by letter, not pitch class, to match fixed-do: F# (Fa#) is a kind
 * of Fa, so it wears Fa's green. A rainbow from Do upwards, tuned to stay
 * bright on the app's #0b0b0f ground and distinct from the amber accent.
 */
export const NOTE_COLORS = {
  C: '#ff6b6b',
  D: '#ff9f43',
  E: '#ffd84d',
  F: '#3ddc84',
  G: '#2ec4d6',
  A: '#5b8cff',
  B: '#b17cff',
} as const;

export type NoteLetter = keyof typeof NOTE_COLORS;

/** The colour for a spelling or chord name: "F#" → Fa's green, "Am" → La's blue. Neutral for anything else. */
export function noteColor(spelling: string): string {
  const letter = spelling.trim().charAt(0).toUpperCase();
  return letter in NOTE_COLORS ? NOTE_COLORS[letter as NoteLetter] : '#c7c7d1';
}
