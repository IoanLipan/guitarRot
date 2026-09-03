import { chartBars, type SongChart } from '@/content';

/** Bars per row. Four is what fits a phone and how charts are written. */
const BARS_PER_ROW = 4;

export function ChordChart({
  chart,
  activeBar,
}: {
  chart: SongChart;
  /** Index into the flattened bar list, or null when nothing is playing. */
  activeBar: number | null;
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
            <h3 className="mb-1.5 text-[11px] font-extrabold tracking-widest text-ink-dim uppercase">
              {sections.filter((label) => label === section.label).length > 1
                ? `${section.label} ${sectionIndex + 1}`
                : section.label}
            </h3>
            <div className="flex flex-col gap-1.5">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-1.5">
                  {row.map((bar) => {
                    const isActive = bar.index === activeBar;
                    return (
                      <div
                        key={bar.index}
                        data-testid={`chart-bar-${bar.index}`}
                        data-active={isActive ? 'true' : undefined}
                        className={`rounded-xl border py-3 text-center text-lg font-black transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-ground'
                            : 'border-[#2b2b36] bg-surface-2'
                        } ${bar.isRepeat && !isActive ? 'text-ink-dim/45' : ''}`}
                      >
                        {bar.chordName}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default ChordChart;
