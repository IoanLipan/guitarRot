import { RichText } from './RichText';

export { glueSolfege } from './glue';

/**
 * @deprecated The eyebrow label above a step (LOOK, YOUR TURN, QUICK CHECK) is
 * gone: the step's own heading says what the screen is. This draws nothing and
 * stays only until DrillStep, which another change owns, drops its last use.
 */
export function StepKicker(_props: { children: React.ReactNode }): null {
  return null;
}

/**
 * A step's own heading: the instruction that says what this screen is for.
 * Steps have no label above it (no "LOOK", no "YOUR TURN"); the sentence is
 * the label. Captions are whole sentences, often two, so they read as body
 * text; set as a headline they pushed the step's own buttons below the fold on
 * a phone, and under `tight:` they give a size down for the same reason.
 */
export function StepCaption({ children }: { children: string }) {
  return (
    <p className="text-lesson leading-[1.5] font-medium text-ink tight:text-body tight:leading-[1.45]">
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
      className="rounded-2xl bg-surface-2 px-4 py-3 text-meta text-ink-dim"
    >
      This part of the lesson is missing ({what}). Tap Next to carry on.
    </p>
  );
}
