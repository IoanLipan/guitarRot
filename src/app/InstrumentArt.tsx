import type { InstrumentId } from '@/music';

/**
 * The two instruments, drawn standing upright for the first-run choice. Flat
 * fills from the app's own tones: the wood of the fretboards for the neck and
 * the bridge, a tone step for the body, the fret grey for the outline and the
 * wire. Nothing glows and nothing fades; amber is not used, it belongs to the
 * thing you tap.
 *
 * They share one 100 x 200 box and stand on the same line, so the choice also
 * shows what is true: the ukulele is the smaller instrument, with the shorter
 * neck and the rounder body, and four strings to the guitar's six.
 */
const OUTLINE = 'var(--color-ink-dim)';
const BODY = 'var(--color-surface-3)';
const WOOD = 'var(--color-wood-light)';
const WIRE = 'var(--color-fret)';

/** `count` strings from the nut to the bridge, spread over `nutSpread` and `bridgeSpread`. */
function strings(count: number, nutY: number, bridgeY: number, nutSpread: number, bridgeSpread: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return {
      x1: 50 - nutSpread / 2 + t * nutSpread,
      x2: 50 - bridgeSpread / 2 + t * bridgeSpread,
      y1: nutY,
      y2: bridgeY,
    };
  });
}

function Frets({ ys, x1, x2 }: { ys: readonly number[]; x1: number; x2: number }) {
  return (
    <>
      {ys.map((y) => (
        <line key={y} x1={x1} x2={x2} y1={y} y2={y} stroke={WIRE} strokeWidth={1} opacity={0.75} />
      ))}
    </>
  );
}

export function GuitarArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden="true" focusable="false" data-testid="guitar-art">
      {/* The headstock, with a tuner either side of each of its three pairs. */}
      <rect x="41" y="3" width="18" height="27" rx="3.5" fill={WOOD} stroke={OUTLINE} strokeWidth="1.5" />
      {[9, 17, 25].flatMap((y) => [37.5, 62.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" fill={OUTLINE} />))}

      {/* The body: a wide lower bout, a waist, a narrower upper bout. */}
      <path
        d="M50 98C64 98 76 102 76 120C76 132 70 136 70 144C70 152 88 156 87 176C86 192 68 198 50 198C32 198 14 192 13 176C12 156 30 152 30 144C30 136 24 132 24 120C24 102 36 98 50 98Z"
        fill={BODY}
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="128" r="9.5" fill="var(--color-ground)" stroke={OUTLINE} strokeWidth="1.5" />

      {/* The neck, which runs on over the body, with its frets and the nut. */}
      <rect x="44" y="30" width="12" height="82" fill={WOOD} />
      <Frets ys={[40, 51, 61, 70, 78, 86, 93, 99, 105]} x1={44} x2={56} />
      <line x1="43" x2="57" y1="30" y2="30" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />

      {/* The bridge and the six strings. */}
      <rect x="35" y="168" width="30" height="6" rx="2" fill={WOOD} stroke={OUTLINE} strokeWidth="1" />
      {strings(6, 30, 171, 9, 22).map((s, i) => (
        <line key={i} {...s} stroke={WIRE} strokeWidth={1.3 - i * 0.1} />
      ))}
    </svg>
  );
}

export function UkuleleArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden="true" focusable="false" data-testid="ukulele-art">
      {/* A wider, rounder headstock, two tuners a side. */}
      <rect x="39" y="52" width="22" height="26" rx="9" fill={WOOD} stroke={OUTLINE} strokeWidth="1.5" />
      {[61, 70].flatMap((y) => [35.5, 64.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill={OUTLINE} />))}

      {/* The body: small, round, with hardly a waist. */}
      <path
        d="M50 112C64 112 76 116 76 130C76 140 71 143 71 150C71 157 86 161 86 177C86 191 70 198 50 198C30 198 14 191 14 177C14 161 29 157 29 150C29 143 24 140 24 130C24 116 36 112 50 112Z"
        fill={BODY}
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="150" r="11" fill="var(--color-ground)" stroke={OUTLINE} strokeWidth="1.5" />

      {/* A short neck, on into the body. */}
      <rect x="43" y="78" width="14" height="46" fill={WOOD} />
      <Frets ys={[89, 99, 108, 116]} x1={43} x2={57} />
      <line x1="42" x2="58" y1="78" y2="78" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />

      {/* The bridge and the four strings. */}
      <rect x="35" y="177" width="30" height="6" rx="2.5" fill={WOOD} stroke={OUTLINE} strokeWidth="1" />
      {strings(4, 78, 180, 9, 20).map((s, i) => (
        <line key={i} {...s} stroke={WIRE} strokeWidth={1.5 - i * 0.1} />
      ))}
    </svg>
  );
}

export function InstrumentArt({ id, className }: { id: InstrumentId; className?: string }) {
  return id === 'ukulele' ? <UkuleleArt className={className} /> : <GuitarArt className={className} />;
}
