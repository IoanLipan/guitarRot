import { chartBars, type ChartBar, type SongChart } from '@/content';
import { ripple } from '@/ui/motion';

/** Bars per row. Four is what fits a phone and how charts are written. */
const BARS_PER_ROW = 4;

export type ChordChartLoopRange = { start: number; end: number };

export function ChordChart({
  chart,
  activeBar,
  loopRange = null,
  onBarTap,
}: {
  chart: SongChart;
  /** Index into the flattened bar list, or null when nothing is playing. */
  activeBar: number | null;
  /** Bars currently set to repeat, inclusive; ringed rather than filled so it reads apart from the live playhead. */
  loopRange?: ChordChartLoopRange | null;
  /** Tap a bar to loop it — see SongPlayer.handleBarTap for the two-tap gesture. Without it the bars are only a picture. */
  onBarTap?: (index: number) => void;
}) {
  const bars = chartBars(chart);
  const sections = chart.sections.map((section) => section.label);
  let cursor = 0;

  return (
    <div className="flex flex-col gap-4" data-testid="chord-chart">
      {chart.sections.map((section, sectionIndex) => {
        const start = cursor;
        cursor += section.bars.length;
        const rows: (typeof bars)[] = [];
        for (let i = 0; i < section.bars.length; i += BARS_PER_ROW) {
          rows.push(bars.slice(start + i, start + Math.min(i + BARS_PER_ROW, section.bars.length)));
        }

        return (
          <section key={`${section.label}-${sectionIndex}`}>
            <h3 className="label mb-1.5">
              {sections.filter((label) => label === section.label).length > 1
                ? `${section.label} ${sectionIndex + 1}`
                : section.label}
            </h3>
            <div className="flex flex-col gap-1.5">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-1.5">
                  {row.map((bar) => (
                    <BarCell
                      key={bar.index}
                      bar={bar}
                      isActive={bar.index === activeBar}
                      isLooped={loopRange !== null && bar.index >= loopRange.start && bar.index <= loopRange.end}
                      onTap={onBarTap}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * One bar. A bar that holds the chord of the one before it (a repeat) reads at
 * full strength like any other, marked by a dashed edge and the small
 * "repeat the last bar" sign in its corner: dimming it, as this once did, left
 * its chord at 2.3:1.
 */
function BarCell({
  bar,
  isActive,
  isLooped,
  onTap,
}: {
  bar: ChartBar;
  isActive: boolean;
  isLooped: boolean;
  onTap: ((index: number) => void) | undefined;
}) {
  const tone = isActive
    ? 'border-accent bg-accent text-ground'
    : isLooped
      ? 'border-accent bg-surface-2 text-ink'
      : 'border-line bg-surface-2 text-ink';
  const className = `fx-host rounded-2xl border py-3 text-center text-lg font-black ${tone} ${
    bar.isRepeat ? 'border-dashed' : ''
  }`;
  const label = `Bar ${bar.index + 1}, ${bar.chordName}`;
  const shared = {
    'data-testid': `chart-bar-${bar.index}`,
    'data-active': isActive ? 'true' : undefined,
    'data-looped': isLooped ? 'true' : undefined,
    'data-repeat': bar.isRepeat ? 'true' : undefined,
    'aria-label': label,
    'aria-current': isActive ? ('true' as const) : undefined,
  };
  const content = (
    <>
      {bar.chordName}
      {bar.isRepeat && <RepeatSign />}
    </>
  );

  if (onTap === undefined) {
    return (
      <div {...shared} role="group" className={className}>
        {content}
      </div>
    );
  }
  return (
    <button
      {...shared}
      type="button"
      aria-pressed={isLooped}
      onClick={(event) => {
        // A ripple spreads from the finger across the cell.
        ripple(event.currentTarget, { x: event.clientX, y: event.clientY });
        onTap(bar.index);
      }}
      className={`press ${className}`}
    >
      {content}
    </button>
  );
}

/** The "repeat the last bar" sign of a chord chart: a slash between two dots. */
function RepeatSign() {
  return (
    <svg
      data-testid="repeat-sign"
      viewBox="0 0 16 16"
      width={14}
      height={14}
      aria-hidden="true"
      className="absolute top-1.5 right-1.5 opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <path d="M4.5 12.5 11.5 3.5" />
      <circle cx="4" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default ChordChart;
