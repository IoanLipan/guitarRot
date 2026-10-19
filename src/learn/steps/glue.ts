/**
 * Keeps a note and its solfège on one line: "E (Mi)" must never wrap into
 * "E" at the end of one line and "(Mi)" at the start of the next. Note chips
 * are one unbreakable box already; this is for any that slip through as plain
 * text, and it swaps the space before the bracket for a non-breaking one.
 */
export function glueSolfege(text: string): string {
  return text.replace(/ \((Do|Re|Mi|Fa|Sol|La|Si)\b/g, ' ($1');
}
