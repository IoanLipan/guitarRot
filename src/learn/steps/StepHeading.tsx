import { RichText } from './RichText';

/** The small amber label that tells the learner what kind of screen this is. */
export function StepKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold tracking-widest text-accent uppercase">{children}</p>
  );
}

export { glueSolfege } from './glue';

/**
 * A step's instruction. Captions are whole sentences, often two, so they read
 * as body text; set as a heading they pushed the step's own buttons below the
 * fold on a phone.
 */
export function StepCaption({ children }: { children: string }) {
  return (
    <p className="text-[17px] leading-[1.6] font-medium text-ink">
      <RichText>{children}</RichText>
    </p>
  );
}

/** Shown if a step names content that no longer exists; the course tests should make this unreachable. */
export function MissingContent({ what }: { what: string }) {
  return (
    <p
      role="status"
      data-testid="step-missing"
      className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-dim"
    >
      This part of the lesson is missing ({what}). Tap Next to carry on.
    </p>
  );
}
