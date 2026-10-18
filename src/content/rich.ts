/**
 * The tiny markup lesson text is written in. Lessons are read by people who
 * skim, so the words that matter are marked and the screen renders them so
 * they jump out:
 *
 * - `**fret 3**`        → strong: bold, in the accent colour
 * - `==just behind==`   → mark: a highlighter stroke behind the words
 * - `E (Mi)`, `F# (Fa#)`, `Am (La minor)` → note: a coloured note chip.
 *   Written exactly the way the rest of the app prints a note, so authors
 *   don't learn a second syntax; the renderer finds them on its own.
 *
 * Markers don't nest, and a note inside `**…**` stays plain strong text.
 * Anything unbalanced is left as literal text rather than swallowing the rest
 * of the sentence; `richProblems` reports it so the course tests catch it.
 */

export type RichToken =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'mark'; text: string }
  /** `name` is the spelling as written ("F#", "Am"); `solfege` the bracketed part ("Fa#", "La minor"). */
  | { kind: 'note'; name: string; solfege: string };

const SYLLABLE = '(?:Do|Re|Mi|Fa|Sol|La|Si)[#b]?';
const QUALITY = '(?: (?:major|minor|power chord|dominant seventh|major seventh|minor seventh|suspended second|suspended fourth))?';
/** A letter spelling (optionally a chord: "Am", "G7", "F#m", "E5") followed by its solfège in brackets. */
const NOTE = new RegExp(`\\b([A-G][#b]?(?:m|maj7|m7|7|5|sus2|sus4)?)\\u00a0?\\s?\\((${SYLLABLE}${QUALITY})\\)`, 'g');
const MARKER = /\*\*(.+?)\*\*|==(.+?)==/g;

function splitNotes(text: string): RichToken[] {
  const tokens: RichToken[] = [];
  let last = 0;
  for (const match of text.matchAll(NOTE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: 'text', text: text.slice(last, index) });
    tokens.push({ kind: 'note', name: match[1] ?? '', solfege: match[2] ?? '' });
    last = index + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
  return tokens;
}

export function parseRich(source: string): RichToken[] {
  const tokens: RichToken[] = [];
  let last = 0;
  for (const match of source.matchAll(MARKER)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push(...splitNotes(source.slice(last, index)));
    if (match[1] !== undefined) tokens.push({ kind: 'strong', text: match[1] });
    else tokens.push({ kind: 'mark', text: match[2] ?? '' });
    last = index + match[0].length;
  }
  if (last < source.length) tokens.push(...splitNotes(source.slice(last)));
  return tokens;
}

/** What the reader actually sees, markers removed: use it for length limits. */
export function plainText(source: string): string {
  return parseRich(source)
    .map((token) => (token.kind === 'note' ? `${token.name} (${token.solfege})` : token.text))
    .join('');
}

/** Markup mistakes: a stray `**` or `==` left over after parsing. */
export function richProblems(source: string): string[] {
  const leftovers = parseRich(source)
    .filter((token): token is { kind: 'text'; text: string } => token.kind === 'text')
    .map((token) => token.text)
    .join('');
  const problems: string[] = [];
  if (leftovers.includes('**')) problems.push(`unbalanced ** in "${source}"`);
  if (leftovers.includes('==')) problems.push(`unbalanced == in "${source}"`);
  return problems;
}
