import type { SVGProps } from 'react';

/**
 * Small marks the game surfaces need that the app's icon set does not have.
 * Same rules as `ui/icons`: drawn, never typed, `currentColor`, decorative
 * (the control that holds one carries the name).
 */
type MarkProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> & { size?: number };

/** The day streak: a flame, filled so it reads at 16px beside a number. */
export function StreakMark({ size = 20, ...rest }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M12.4 2.6c.5 3.4 5.6 5.6 5.6 10.8A6 6 0 0 1 6 13.6c0-2.2 1-3.7 2.3-5 .1 1.6.8 2.5 1.7 2.9C9.8 8.7 10.6 5 12.4 2.6Z" />
    </svg>
  );
}

/** The cross of a multiplier, drawn so it matches the numerals beside it in every font. */
export function TimesMark({ size = 12, ...rest }: MarkProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M2.4 2.4l7.2 7.2M9.6 2.4l-7.2 7.2" />
    </svg>
  );
}

/** A small peak with a flag: a new best. */
export function BestMark({ size = 16, ...rest }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M4 20 12 6l8 14" />
      <path d="M12 6V2.5" />
    </svg>
  );
}
