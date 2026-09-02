import { forwardRef } from 'react';
import type { Riff, TabEvent, Technique } from '@/content';
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

/** Display letters for the six strings, low to high. */
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

const TECHNIQUE_GLYPH: Record<Technique, string> = {
  hammer: 'h',
  pull: 'p',
  slide: '/',
  bend: 'b',
  palmMute: 'P.M.',
};

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
      {STRING_LABELS.map((label, stringIndex) => {
        const line = geometry.staffLine(stringIndex);
        return (
          <g key={`staff-${stringIndex}`}>
            <line
              data-testid={`staff-line-${stringIndex}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--color-surface-2)"
              strokeWidth={1.2}
            />
            <text
              data-testid={`string-label-${stringIndex}`}
              x={line.x1 - 14}
              y={line.y1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="var(--color-ink-dim)"
            >
              {label}
            </text>
          </g>
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
          stroke="var(--color-ink-dim)"
          strokeWidth={i === 0 ? 2.4 : 1.2}
          opacity={0.6}
        />
      ))}

      {riff.events.map((event, i) => (
        <TabNote key={`note-${i}`} index={i} event={event} geometry={geometry} />
      ))}

      {showPlayhead && (
        <g ref={playheadRef} data-testid="playhead" style={{ willChange: 'transform' }}>
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
  const boxWidth = 9 + text.length * 5;

  return (
    <g>
      {/* Knock a hole in the staff line so the number stays readable. */}
      <rect
        x={x - boxWidth / 2}
        y={y - 8}
        width={boxWidth}
        height={16}
        fill="var(--color-ground)"
      />
      <text
        data-testid={`tab-note-${index}`}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        fill="var(--color-ink)"
      >
        {text}
      </text>
      {event.technique !== undefined && (
        <text
          data-testid={`technique-${index}`}
          x={x}
          y={geometry.staffTop - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill="var(--color-ink-dim)"
        >
          {TECHNIQUE_GLYPH[event.technique]}
        </text>
      )}
    </g>
  );
}

export default TabStaff;
