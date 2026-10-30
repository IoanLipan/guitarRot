import { useId, type CSSProperties } from 'react';
import { getAchievement, type AchievementCategory } from '@/progress';
import { PICK_PATH } from '@/app/Logo';
import { glyphForAchievement, GLYPHS, type GlyphName, type GlyphShape } from './glyphs';
import { CATEGORY_COLOR, darken, GOLD, lighten, LOCKED, STEEL, type PickTier } from './materials';

/** The pick's box on the logo's 1024 grid, with room for its rim. */
const VIEW_BOX = '196 166 632 716';
const ASPECT = 716 / 632;

/** Where the glyph sits on the pick: a 100 grid scaled up into the pick's broad shoulders. */
const GLYPH_SCALE = 3.3;
const GLYPH_TRANSFORM = `translate(${512 - 50 * GLYPH_SCALE} ${436 - 50 * GLYPH_SCALE}) scale(${GLYPH_SCALE})`;

/** How far below the engraving the light catches its lower edge, in glyph units. */
const EDGE_DROP = 1.5;
/** Stroke of a glyph drawn as an outline (a pick not earned yet), in glyph units. */
const OUTLINE_WIDTH = 2;

export type PickGlyph = GlyphName | readonly GlyphShape[] | null;

export type PickProps = {
  tier: PickTier;
  /** The colour of a celluloid pick. Ignored for steel and gold. */
  category?: AchievementCategory;
  glyph?: PickGlyph;
  /** Not earned: a smoked, empty pick with only the outline of its glyph. */
  locked?: boolean;
  /** Width in px; the height follows the pick's own proportions. */
  size?: number;
  /**
   * The pick's accessible name. Leave it out when something around the pick
   * (a button, a heading) already says what it is.
   */
  label?: string;
  /** The outline draws itself and the body fades in behind it: the level-up. */
  draw?: boolean;
  className?: string;
  style?: CSSProperties;
};

function Engraving({
  shapes,
  ink,
  outline,
}: {
  shapes: readonly GlyphShape[];
  ink: string;
  outline: boolean;
}) {
  return (
    <>
      {shapes.map((shape, index) => {
        if (shape.kind === 'text') {
          return (
            <text
              key={index}
              x={shape.x}
              y={shape.y}
              fontSize={shape.size}
              textAnchor="middle"
              className="font-display font-black"
              fill={outline ? 'none' : ink}
              stroke={outline ? ink : undefined}
              strokeWidth={outline ? OUTLINE_WIDTH : undefined}
              strokeLinejoin="round"
            >
              {shape.text}
            </text>
          );
        }
        if (shape.kind === 'line') {
          return (
            <path
              key={index}
              d={shape.d}
              fill="none"
              stroke={ink}
              strokeWidth={outline ? OUTLINE_WIDTH : (shape.width ?? 9)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        // A solid shape gets a thin stroke of its own colour so its corners come out soft.
        return outline ? (
          <path
            key={index}
            d={shape.d}
            fill="none"
            stroke={ink}
            strokeWidth={OUTLINE_WIDTH}
            strokeLinejoin="round"
            fillRule={shape.evenodd === true ? 'evenodd' : 'nonzero'}
          />
        ) : (
          <path
            key={index}
            d={shape.d}
            fill={ink}
            stroke={ink}
            strokeWidth={3}
            strokeLinejoin="round"
            fillRule={shape.evenodd === true ? 'evenodd' : 'nonzero'}
          />
        );
      })}
    </>
  );
}

/** The glyph twice: a pale copy a hair lower, and the dark engraving over it. */
function Glyph({
  glyph,
  ink,
  edge,
  outline = false,
  punch = false,
}: {
  glyph: PickGlyph;
  ink: string;
  edge?: string;
  outline?: boolean;
  /** The engraving lands with a punch (the level-up). It animates an inner group: a CSS transform would replace the placement above. */
  punch?: boolean;
}) {
  if (glyph === null) return null;
  const shapes = typeof glyph === 'string' ? GLYPHS[glyph] : glyph;
  return (
    <g transform={GLYPH_TRANSFORM}>
      <g className={punch ? 'level-punch' : undefined}>
        {edge !== undefined && (
          <g transform={`translate(0 ${EDGE_DROP})`}>
            <Engraving shapes={shapes} ink={edge} outline={false} />
          </g>
        )}
        <Engraving shapes={shapes} ink={ink} outline={outline} />
      </g>
    </g>
  );
}

/**
 * A guitar pick, the app's one badge shape: the logo's own outline, struck in
 * a material. Celluloid is glossy plastic in the colour of its category;
 * steel and gold are brushed metal; a pick not earned yet is smoked glass
 * with only the outline of its symbol.
 *
 * Gradient ids come from `useId`: SVG ids are document-wide, so two picks on
 * one screen must not share one. No CSS filters; the soft blotches in the
 * plastic are radial gradients, which an old Android WebView draws cheaply.
 */
export function Pick({
  tier,
  category = 'streak',
  glyph = null,
  locked = false,
  size = 56,
  label,
  draw = false,
  className,
  style,
}: PickProps) {
  const id = useId();
  const base = `${id}-base`;
  const blot = `${id}-blot`;
  const sheen = `${id}-sheen`;
  const clip = `${id}-clip`;

  const color = CATEGORY_COLOR[category];
  const metal = tier === 'gold' ? GOLD : STEEL;

  const accessible =
    label === undefined ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': label };

  return (
    <svg
      viewBox={VIEW_BOX}
      width={size}
      height={Math.round(size * ASPECT * 10) / 10}
      focusable="false"
      className={className}
      style={style}
      data-tier={locked ? 'locked' : tier}
      {...accessible}
    >
      <defs>
        <clipPath id={clip}>
          <path d={PICK_PATH} />
        </clipPath>
        {tier === 'celluloid' ? (
          <>
            <radialGradient id={base} cx="0.3" cy="0.2" r="1">
              <stop offset="0" stopColor={lighten(color, 0.5)} />
              <stop offset="0.45" stopColor={color} />
              <stop offset="1" stopColor={darken(color, 0.4)} />
            </radialGradient>
            <radialGradient id={blot}>
              <stop offset="0" stopColor={darken(color, 0.55)} stopOpacity="0.6" />
              <stop offset="1" stopColor={darken(color, 0.55)} stopOpacity="0" />
            </radialGradient>
          </>
        ) : (
          <>
            <linearGradient id={base} x1="0.12" y1="0" x2="0.88" y2="1">
              <stop offset="0" stopColor={metal.stops[0]} />
              <stop offset="0.36" stopColor={metal.stops[1]} />
              <stop offset="0.62" stopColor={metal.stops[2]} />
              <stop offset="1" stopColor={metal.stops[3]} />
            </linearGradient>
            <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0.7">
              <stop offset="0.3" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.34" />
              <stop offset="0.66" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </>
        )}
      </defs>

      {locked ? (
        <>
          <path d={PICK_PATH} fill={LOCKED.fill} />
          {/* The rim stays 1.5px at every size. */}
          <path
            d={PICK_PATH}
            fill="none"
            stroke={LOCKED.rim}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          <Glyph glyph={glyph} ink={LOCKED.glyph} outline />
        </>
      ) : (
        <g className={draw ? 'level-fade' : undefined}>
          <path d={PICK_PATH} fill={`url(#${base})`} />
          {tier === 'celluloid' ? (
            <g clipPath={`url(#${clip})`}>
              {/* Tortoiseshell: a few darker clouds in the plastic. */}
              <ellipse cx="610" cy="520" rx="170" ry="120" transform="rotate(-28 610 520)" fill={`url(#${blot})`} />
              <ellipse cx="410" cy="650" rx="100" ry="160" transform="rotate(14 410 650)" fill={`url(#${blot})`} />
              <ellipse cx="655" cy="290" rx="95" ry="70" transform="rotate(-20 655 290)" fill={`url(#${blot})`} />
              {/* The light on its upper-left shoulder. */}
              <path
                d="M286 380C284 296 350 244 446 232"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.5"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <circle cx="300" cy="438" r="11" fill="#ffffff" fillOpacity="0.45" />
            </g>
          ) : (
            <g clipPath={`url(#${clip})`}>
              <path d={PICK_PATH} fill={`url(#${sheen})`} />
              {/* A bevel just inside the edge. */}
              <path
                d={PICK_PATH}
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.5"
                strokeWidth="4"
                transform="translate(512 520) scale(0.93) translate(-512 -520)"
              />
            </g>
          )}
          <path
            d={PICK_PATH}
            fill="none"
            stroke={tier === 'celluloid' ? darken(color, 0.55) : metal.rim}
            strokeOpacity={tier === 'celluloid' ? 0.5 : 0.9}
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <Glyph
            glyph={glyph}
            ink={tier === 'celluloid' ? darken(color, 0.62) : metal.engrave}
            edge={tier === 'celluloid' ? 'rgba(255,255,255,0.4)' : metal.edge}
            punch={draw}
          />
        </g>
      )}

      {draw && (
        <path
          d={PICK_PATH}
          pathLength={1}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="9"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="level-draw"
        />
      )}
    </svg>
  );
}

/** The pick for one achievement, struck as the catalogue says: its tier, its category, its glyph. */
export function AchievementPick({
  id,
  earned,
  size,
  label,
  className,
  style,
}: {
  id: string;
  earned: boolean;
  size?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const achievement = getAchievement(id);
  const props: PickProps = {
    tier: achievement?.tier ?? 'celluloid',
    category: achievement?.category ?? 'streak',
    glyph: glyphForAchievement(id),
    locked: !earned,
  };
  if (size !== undefined) props.size = size;
  if (label !== undefined) props.label = label;
  if (className !== undefined) props.className = className;
  if (style !== undefined) props.style = style;
  return <Pick {...props} />;
}
