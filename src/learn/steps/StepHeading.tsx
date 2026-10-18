/** The small amber label that tells the learner what kind of screen this is. */
export function StepKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold tracking-widest text-accent uppercase">{children}</p>
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
