import type { CSSProperties } from 'react';
import { BulbIcon, WarningIcon } from '@/ui/icons';
import type { AudioEngine } from '@/audio';
import type { LessonStep } from '@/content';
import { RichText } from './RichText';
import { VisualCard } from './VisualView';

/** Gap between one element's entrance and the next, in ms. */
const STAGGER_MS = 80;

function enters(order: number): CSSProperties {
  return { '--delay': `${order * STAGGER_MS}ms` } as CSSProperties;
}

/**
 * One point of the card: a numbered badge and a sentence, joined to the next
 * point by a thin line so three points read as three steps in order. A lone
 * point gets a dot instead of a lonely "1".
 */
function Point({
  children,
  number,
  last,
  alone,
  order,
}: {
  children: string;
  number: number;
  last: boolean;
  alone: boolean;
  order: number;
}) {
  return (
    <li
      data-testid="explain-point"
      className={`explain-rise relative flex gap-3.5 ${
        last ? '' : 'after:absolute after:top-[34px] after:-bottom-[10px] after:left-[13px] after:w-0.5 after:rounded-full after:bg-line'
      }`}
      style={enters(order)}
    >
      <span
        aria-hidden="true"
        className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-meta font-black text-ink"
      >
        {alone ? <span className="h-2 w-2 rounded-full bg-ink" /> : number}
      </span>
      <p className="min-w-0 flex-1 text-lesson leading-[1.45] font-medium text-ink tight:text-body tight:leading-[1.4]">
        <RichText>{children}</RichText>
      </p>
    </li>
  );
}

const CALLOUTS = {
  // A tip is a quiet aside, so it gets a step up in tone, not a colour: amber is kept for the one thing to tap.
  tip: {
    Icon: BulbIcon,
    label: 'Tip',
    box: 'bg-surface-2',
    ink: 'text-ink',
    strong: '[--rich-strong:var(--color-ink)]',
  },
  warn: {
    Icon: WarningIcon,
    label: 'Common mistake',
    box: 'bg-bad/10',
    ink: 'text-bad',
    // **strong** inside a callout takes the callout's colour.
    strong: '[--rich-strong:var(--color-bad)]',
  },
} as const;

function Callout({ kind, children, order }: { kind: keyof typeof CALLOUTS; children: string; order: number }) {
  const look = CALLOUTS[kind];
  return (
    <div
      role="note"
      aria-label={look.label}
      data-testid={`explain-${kind}`}
      className={`explain-rise flex gap-3 rounded-2xl px-3.5 py-3 tight:py-2.5 ${look.box} ${look.strong}`}
      style={enters(order)}
    >
      <span aria-hidden="true" className={`mt-px shrink-0 ${look.ink}`}>
        <look.Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-label leading-none font-bold ${look.ink}`}>{look.label}</p>
        <p className="mt-1.5 text-body leading-[1.45] text-ink tight:mt-1 tight:leading-[1.4]">
          <RichText>{children}</RichText>
        </p>
      </div>
    </div>
  );
}

/**
 * The teaching card. A picture, a big headline, one to three short points and
 * maybe a tip or a common mistake: the whole thing is meant to fit a phone
 * screen without scrolling, and to be understood in a glance rather than read.
 * The picture pops in, then the words rise one after another; with reduced
 * motion everything is simply there.
 */
export function ExplainStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'explain' }>;
  engine: AudioEngine;
}) {
  const points = step.points;
  // Entrance order: picture (0), headline, each point, then the callouts.
  const callouts = [
    step.tip === undefined ? null : ('tip' as const),
    step.warn === undefined ? null : ('warn' as const),
  ].filter((kind): kind is 'tip' | 'warn' => kind !== null);

  return (
    <article className="flex flex-col gap-4 tight:gap-3" data-testid="step-explain">
      <VisualCard visual={step.visual} engine={engine} />

      <h2
        className="explain-rise text-headline font-black tracking-tight text-balance tight:text-[24px] tight:leading-[1.15]"
        style={enters(1)}
      >
        <RichText>{step.headline}</RichText>
      </h2>

      <ol className="flex flex-col gap-3.5 tight:gap-3" aria-label="Key points">
        {points.map((point, index) => (
          <Point
            key={index}
            number={index + 1}
            last={index === points.length - 1}
            alone={points.length === 1}
            order={2 + index}
          >
            {point}
          </Point>
        ))}
      </ol>

      {callouts.map((kind, index) => (
        <Callout key={kind} kind={kind} order={2 + points.length + index}>
          {(kind === 'tip' ? step.tip : step.warn) ?? ''}
        </Callout>
      ))}
    </article>
  );
}

export default ExplainStep;
