import { Fragment, type CSSProperties } from 'react';
import { parseRich, type RichToken } from '@/content';
import { noteColor } from '@/render/noteColors';
import { glueSolfege } from './glue';

const ACCENT_INK = '#0b0b0f';

/**
 * A note as a coloured pill: the letter in bold, a hairline, then the
 * solfège lighter ("E | Mi"). Both halves wear the note's own colour, so Mi is
 * yellow here, on the neck and in every picture.
 *
 * It sizes itself in `em`, so it takes whatever type size the sentence around
 * it has, and it never wraps inside itself. The brackets of "E (Mi)" are
 * still in the document, visually hidden, so a screen reader hears the same
 * thing the lesson author wrote and copying the text gives it back.
 */
export function NoteChip({
  name,
  solfege,
  className = '',
  onAccent = false,
}: {
  name: string;
  solfege: string;
  className?: string;
  /** On the amber course card the note colours would vanish; the chip goes dark-on-light instead. */
  onAccent?: boolean;
}) {
  const color = onAccent ? ACCENT_INK : noteColor(name);
  const style: CSSProperties = onAccent
    ? { color, backgroundColor: 'rgba(11,11,15,0.12)', borderColor: 'rgba(11,11,15,0.32)' }
    : {
        color,
        // Hex alpha: 14% tint and a 40% edge, bright enough on the dark ground without shouting.
        backgroundColor: `${color}24`,
        borderColor: `${color}66`,
      };
  return (
    <span
      data-note-chip={name}
      className={`mx-[0.06em] inline-flex items-baseline gap-[0.38em] rounded-full border px-[0.55em] py-[0.16em] align-baseline text-[length:max(12px,0.88em)] leading-none whitespace-nowrap ${className}`}
      style={style}
    >
      <span className="font-black">{name}</span>
      <span className="sr-only"> (</span>
      <span
        className="border-l pl-[0.38em] font-semibold"
        style={{ borderColor: onAccent ? 'rgba(11,11,15,0.3)' : `${color}59` }}
      >
        {solfege}
      </span>
      <span className="sr-only">)</span>
    </span>
  );
}

/**
 * The leading run of non-space characters of the text after a chip ("," or
 * "'s"). Kept in the same no-wrap box as the chip so a comma never starts a line.
 */
const TRAILING_RUN = /^\S+/;

/**
 * Lesson text with its markup rendered (see src/content/rich.ts): **strong**
 * in the accent colour, ==highlighted== words on a marker stroke, and note
 * names as chips. Returns a fragment, so the caller's own element (a `p`, an
 * `h2`, a button) stays the element that holds the text: a plain string still
 * ends up as that element's own text node.
 */
export function RichText({ children, onAccent = false }: { children: string; onAccent?: boolean }) {
  const tokens = parseRich(children);
  const out: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) continue;
    if (token.kind === 'note') {
      let tail = '';
      const next = tokens[i + 1];
      if (next !== undefined && next.kind === 'text') {
        const run = TRAILING_RUN.exec(next.text)?.[0];
        if (run !== undefined) {
          tail = run;
          tokens[i + 1] = { kind: 'text', text: next.text.slice(run.length) };
        }
      }
      out.push(
        tail === '' ? (
          <NoteChip key={i} name={token.name} solfege={token.solfege} onAccent={onAccent} />
        ) : (
          <span key={i} className="whitespace-nowrap">
            <NoteChip name={token.name} solfege={token.solfege} onAccent={onAccent} />
            {tail}
          </span>
        ),
      );
    } else {
      out.push(<Fragment key={i}>{renderToken(token, onAccent)}</Fragment>);
    }
  }
  return <>{out}</>;
}

function renderToken(token: Exclude<RichToken, { kind: 'note' }>, onAccent: boolean): React.ReactNode {
  switch (token.kind) {
    case 'text':
      return token.text === '' ? null : glueSolfege(token.text);
    case 'strong':
      return (
        <strong className="font-extrabold" style={onAccent ? undefined : { color: 'var(--rich-strong, var(--color-accent))' }}>
          {token.text}
        </strong>
      );
    case 'mark':
      return <mark className={onAccent ? 'rich-mark rich-mark-dark' : 'rich-mark'}>{token.text}</mark>;
  }
}

export default RichText;
