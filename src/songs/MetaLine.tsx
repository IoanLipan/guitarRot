import { Fragment, type ReactNode } from 'react';

/**
 * A line of plain facts about a song or a riff, "Blues · Level 2 · 100 bpm":
 * one quiet line of text where there used to be a row of capitalised pills.
 * On a narrow phone it breaks between facts and never inside one, so
 * "Key Am (La minor)" is never cut mid-word. The dots are for the eye only; a
 * screen reader hears the facts one after another.
 */
export function MetaLine({ facts, className = '' }: { facts: readonly ReactNode[]; className?: string }) {
  return (
    <p className={`text-meta text-ink-dim ${className}`}>
      {facts.map((fact, index) => {
        const last = index === facts.length - 1;
        return (
          <Fragment key={index}>
            <span className="whitespace-nowrap">
              {fact}
              {!last && <span aria-hidden="true"> ·</span>}
            </span>
            {!last && ' '}
          </Fragment>
        );
      })}
    </p>
  );
}

export default MetaLine;
