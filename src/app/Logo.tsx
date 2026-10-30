import { useId } from 'react';

/**
 * The outline of the guitarRot pick on a 1024 grid. The game's picks (src/game)
 * are struck from the same shape, so every badge looks like it belongs to the logo.
 */
export const PICK_PATH =
  'M512 180 C680 180 812 232 812 384 C812 560 646 752 566 838 Q512 892 458 838 C378 752 212 560 212 384 C212 232 344 180 512 180 Z';

/**
 * The guitarRot mark: an amber pick with "play" cut out of it. Same geometry
 * as assets/brand/mark.svg, which the launcher icon, splash and store graphics
 * are rendered from, so the app and its icon can't drift apart.
 */
export function LogoMark({ className }: { className?: string }) {
  // Gradient ids are document-global in SVG; two marks on one screen must not share one.
  const id = useId();
  const pick = `${id}-pick`;
  const shine = `${id}-shine`;
  const shape = PICK_PATH;
  return (
    <svg viewBox="160 150 704 760" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={pick} x1="0.2" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.45" stopColor="#ffb020" />
          <stop offset="1" stopColor="#d9861a" />
        </linearGradient>
        <radialGradient id={shine} cx="0.32" cy="0.22" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={shape} fill={`url(#${pick})`} />
      <path d={shape} fill={`url(#${shine})`} />
      <path
        d="M458 372 L458 568 L628 470 Z"
        fill="var(--color-ground)"
        stroke="var(--color-ground)"
        strokeWidth="44"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The wordmark: "guitar" in ink, "Rot" in the accent. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      guitar<span className="text-accent">Rot</span>
    </span>
  );
}
