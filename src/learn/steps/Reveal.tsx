import { useEffect, useRef } from 'react';

/**
 * Feedback that appears under a tall step (a miss, with its explanation and the
 * button that moves on) can land below the Next bar. Scrolling it into view the
 * moment it appears means the learner never has to go looking for it.
 */
export function Reveal({
  children,
  ...rest
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Not every environment (jsdom, for one) can scroll.
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, []);
  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
}

export default Reveal;
