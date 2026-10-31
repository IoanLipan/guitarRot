import { forwardRef } from 'react';
import type { Riff, TabEvent, Technique } from '@/content';
import { STRING_NAMES } from './stringNames';
import type { TabGeometry } from './tabGeometry';

export type TabStaffProps = {
  riff: Riff;
  geometry: TabGeometry;
  showPlayhead?: boolean;
  /**
   * Attaches to the playhead group so a requestAnimationFrame loop can move
   * it with a CSS transform. Driving it through React state would re-render
   * the whole staff every frame.
   */
  playheadRef?: React.Ref<SVGGElement>;
  className?: string;
};

/** Width of the column of string names that stands beside the staff. */
export const TAB_NAMES_WIDTH = 28;

const TECHNIQUE_GLYPH: Record<Technique, string> = {
  hammer: 'h',
  pull: 'p',
  slide: '/',
  bend: 'b',
  palmMute: 'P.M.',
};

/**
 * The staff itself: lines, bar lines, fret numbers, technique marks and the
 * playhead. The string names are not part of it (see TabStringNames): this is
 * what scrolls sideways with the song, and names that scroll away are no use.
 * It draws on `--color-surface`, the panel it sits in; the knock-out behind
 * each number is that colour.
 */
export const TabStaff = forwardRef<SVGSVGElement, TabStaffProps>(function TabStaff(
  { riff, geometry, showPlayhead = false, playheadRef, className },
  ref,
) {
  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={geometry.width}
      height={geometry.height}
      role="img"
      aria-label={`Tab for ${riff.title}`}
      data-testid="tab-staff"
    >
      {STRING_NAMES.map((_, stringIndex) => {
        const line = geometry.staffLine(stringIndex);
        return (
          <line
            key={`staff-${stringIndex}`}
            data-testid={`staff-line-${stringIndex}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--color-fret)"
            strokeOpacity={0.4}
            strokeWidth={1.2}
          />
        );
      })}

      {geometry.barLineXs().map((x, i) => (
        <line
          key={`bar-${i}`}
          data-testid={`bar-line-${i}`}
          x1={x}
          y1={geometry.staffTop}
          x2={x}
          y2={geometry.staffBottom}
          stroke="var(--color-fret)"
          strokeWidth={i === 0 ? 2.4 : 1.2}
          opacity={0.7}
        />
      ))}

      {riff.events.map((event, i) => (
        <TabNote key={`note-${i}`} index={i} event={event} geometry={geometry} />
      ))}

      {showPlayhead && (
        <g ref={playheadRef} data-testid="playhead" style={{ willChange: 'transform' }}>
          {/* A soft glow: two wider, fainter strokes under the line. Cheaper than
              an SVG blur filter, which would be re-rendered every frame the head moves. */}
          <line
            className="playhead-glow"
            x1={geometry.xForBeat(0)}
            y1={geometry.staffTop - 8}
            x2={geometry.xForBeat(0)}
            y2={geometry.staffBottom + 8}
            stroke="var(--color-accent)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeOpacity={0.16}
          />
          <line
            className="playhead-glow"
            x1={geometry.xForBeat(0)}
            y1={geometry.staffTop - 8}
            x2={geometry.xForBeat(0)}
            y2={geometry.staffBottom + 8}
            stroke="var(--color-accent)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeOpacity={0.32}
          />
          <line
            x1={geometry.xForBeat(0)}
            y1={geometry.staffTop - 8}
            x2={geometry.xForBeat(0)}
            y2={geometry.staffBottom + 8}
            stroke="var(--color-accent)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
});

/**
 * E A D G B e, one name per staff line, in a column that stays where it is
 * while the staff scrolls. Its lines are the staff's own (same height, same
 * spacing), so each name sits level with its line.
 */
export function TabStringNames({ geometry, className }: { geometry: TabGeometry; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${TAB_NAMES_WIDTH} ${geometry.height}`}
      width={TAB_NAMES_WIDTH}
      height={geometry.height}
      aria-hidden="true"
      data-testid="tab-string-names"
    >
      {STRING_NAMES.map((name, stringIndex) => (
        <text
          key={name + stringIndex}
          data-testid={`string-label-${stringIndex}`}
          x={TAB_NAMES_WIDTH / 2 + 2}
          y={geometry.yForString(stringIndex)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={600}
          fill="var(--color-ink-dim)"
        >
          {name}
        </text>
      ))}
    </svg>
  );
}

function TabNote({
  index,
  event,
  geometry,
}: {
  index: number;
  event: TabEvent;
  geometry: TabGeometry;
}) {
  const x = geometry.xForBeat(event.beat);
  const y = geometry.yForString(event.stringIndex);
  const text = String(event.fret);
  const size = geometry.fretFontSize;
  // Digits are about 0.6 of the type size wide; the box adds a little air.
  const boxWidth = text.length * size * 0.62 + 8;
  const boxHeight = size + 4;

  return (
    <g>
      {/* Knock a hole in the staff line so the number stays readable. */}
      <rect
        x={x - boxWidth / 2}
        y={y - boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        fill="var(--color-surface)"
      />
      <text
        data-testid={`tab-note-${index}`}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size}
        fontWeight={600}
        fill="var(--color-ink)"
      >
        {text}
      </text>
      {event.technique !== undefined && (
        <text
          data-testid={`technique-${index}`}
          x={x}
          y={geometry.staffTop - 13}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={geometry.techniqueFontSize}
          fontWeight={600}
          fill="var(--color-ink-dim)"
        >
          {TECHNIQUE_GLYPH[event.technique]}
        </text>
      )}
    </g>
  );
}

export default TabStaff;
