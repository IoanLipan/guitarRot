import type { ReactNode, SVGProps } from 'react';

/**
 * The app's icon set. Every icon is a 24x24 drawing made of 2px round-capped
 * strokes in `currentColor`, so a button's text colour is its icon colour and
 * every button looks cut from the same cloth.
 *
 * Why not text glyphs (← × ▶ ♪ ✓)? They are drawn by whatever font the phone
 * happens to fall back to, so on Android they came out too small, off-centre,
 * or as a coloured emoji. SVG looks the same everywhere.
 *
 * Icons are decorative: they are `aria-hidden`, and the button that holds one
 * carries the accessible name (`aria-label` or visible text). They draw at
 * 24px; size one down with `size` or a `h-5 w-5` class.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> & {
  /** Width and height in px. Defaults to 24; a Tailwind size class also wins over it. */
  size?: number;
};

function Icon({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 5l-7 7 7 7" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.5 12.5 5 5L19.5 7" />
    </Icon>
  );
}

/**
 * The transport trio is solid shapes with rounded corners. The triangle sits
 * a little right of centre in its box because its weight is on the left; a
 * triangle centred by its bounding box looks pushed to the left.
 */
export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.2v13.6a.5.5 0 0 0 .76.43l11-6.8a.5.5 0 0 0 0-.86l-11-6.8A.5.5 0 0 0 8 5.2Z" fill="currentColor" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth={3.6} />
    </Icon>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />
    </Icon>
  );
}

/** An eighth note: filled head, stem, flag. */
export function NoteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="18" r="3" fill="currentColor" />
      <path d="M11 18V4c.4 3.2 3.6 3.6 6.5 6" />
    </Icon>
  );
}

export function MetronomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.2 3h5.6l3.4 17.2a1 1 0 0 1-1 1.2H6.8a1 1 0 0 1-1-1.2Z" />
      <path d="m12 17 4.2-9.5" />
      <path d="M8.2 15.2h2.2" />
    </Icon>
  );
}

/** Two arrows chasing each other round a rectangle: loop. */
export function RepeatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12M12 3 8 7M12 3l4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
    </Icon>
  );
}

/** A cog: eight teeth round a hole. (Rays round a circle read as a brightness toggle.) */
export function GearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.51 5.06 L10.72 2.49 L13.28 2.49 L13.49 5.06 L15.85 6.04 L17.82 4.37 L19.63 6.18 L17.96 8.15 L18.94 10.51 L21.51 10.72 L21.51 13.28 L18.94 13.49 L17.96 15.85 L19.63 17.82 L17.82 19.63 L15.85 17.96 L13.49 18.94 L13.28 21.51 L10.72 21.51 L10.51 18.94 L8.15 17.96 L6.18 19.63 L4.37 17.82 L6.04 15.85 L5.06 13.49 L2.49 13.28 L2.49 10.72 L5.06 10.51 L6.04 8.15 L4.37 6.18 L6.18 4.37 L8.15 6.04 Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </Icon>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 5 6.5 9H3.5v6h3L11 19Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.4 6.2a8.2 8.2 0 0 1 0 11.6" />
    </Icon>
  );
}

/** An arrow leaving a box: this opens somewhere else. */
export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 16 17 7M9 7h8v8" />
    </Icon>
  );
}

export function BulbIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 17.5h5M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2h5c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.3 4.2 2.7 17.6A2 2 0 0 0 4.4 20.6h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0ZM12 9.5v4M12 17h.01" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

/**
 * The two instruments the app teaches, as a button would carry them: an
 * upright body with its neck and a nut. The guitar is tall and narrow in the
 * waist; the ukulele has the shorter neck and the rounder, stubbier body, so
 * the two read apart even at 20px. (The big silhouettes of the first-run
 * choice are in app/InstrumentArt.tsx.)
 */
export function GuitarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 9.5V2.5M10.4 2.5h3.2" />
      <path d="M12 9.5c2.3 0 3.4 1.2 3.4 2.9 0 1.6-1.6 1.8-1.6 3 0 .9 2.2 1.4 2.2 3.4 0 2.1-1.9 3.2-4 3.2s-4-1.1-4-3.2c0-2 2.2-2.5 2.2-3.4 0-1.2-1.6-1.4-1.6-3 0-1.7 1.1-2.9 3.4-2.9Z" />
    </Icon>
  );
}

export function UkuleleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 11V5.5" />
      <rect x="9.6" y="2" width="4.8" height="3.5" rx="1.6" />
      <path d="M12 11c2.9 0 4.6 1.1 4.6 2.7 0 1.4-1.8 1.6-1.8 2.6 0 .8 3.4 1.3 3.4 3.2 0 1.8-2.6 2.5-6.2 2.5s-6.2-.7-6.2-2.5c0-1.9 3.4-2.4 3.4-3.2 0-1-1.8-1.2-1.8-2.6C7.4 12.1 9.1 11 12 11Z" />
      <circle cx="12" cy="17.3" r=".6" />
    </Icon>
  );
}
