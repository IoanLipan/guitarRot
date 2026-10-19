import type { CSSProperties } from 'react';
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
        last ? '' : 'after:absolute after:top-[34px] after:-bottom-[10px] after:left-[13px] after:w-0.5 after:rounded-full after:bg-accent/15'
      }`}
      style={enters(order)}
    >
      <span
        aria-hidden="true"
        className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-black text-accent ring-1 ring-accent/35"
      >
        {alone ? <span className="h-2 w-2 rounded-full bg-accent" /> : number}
      </span>
      <p className="min-w-0 flex-1 text-[18px] leading-[1.45] font-medium text-ink short:text-[17px] short:leading-[1.4]">
        <RichText>{children}</RichText>
      </p>
    </li>
  );
}

const CALLOUTS = {
  tip: {
    icon: '💡',
    label: 'Tip',
    color: 'var(--color-accent)',
    tint: 'rgba(255,176,32,0.09)',
    edge: 'rgba(255,176,32,0.28)',
  },
  warn: {
    icon: '⚠️',
    label: 'Common mistake',
    color: 'var(--color-bad)',
    tint: 'rgba(255,90,95,0.10)',
    edge: 'rgba(255,90,95,0.32)',
  },
} as const;

function Callout({ kind, children, order }: { kind: keyof typeof CALLOUTS; children: string; order: number }) {
  const look = CALLOUTS[kind];
  return (
    <div
      role="note"
      aria-label={look.label}
      data-testid={`explain-${kind}`}
      className="explain-rise flex gap-3 rounded-2xl px-3.5 py-3 short:py-2.5"
      style={
        {
          ...enters(order),
          background: look.tint,
          boxShadow: `inset 0 0 0 1px ${look.edge}`,
          // **strong** inside a callout takes the callout's colour.
          '--rich-strong': look.color,
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="mt-0.5 text-[20px] leading-none">
        {look.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-none font-extrabold tracking-widest uppercase" style={{ color: look.color }}>
          {look.label}
        </p>
        <p className="mt-1.5 text-[16px] leading-[1.45] text-ink short:mt-1 short:text-[15px]">
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
    <article className="flex flex-col gap-4 short:gap-3" data-testid="step-explain">
      <VisualCard visual={step.visual} engine={engine} />

      <h2
        className="explain-rise text-[28px] leading-[1.12] font-black tracking-tight text-balance short:text-[25px]"
        style={enters(1)}
      >
        <RichText>{step.headline}</RichText>
      </h2>

      <ol className="flex flex-col gap-3.5 short:gap-3" aria-label="Key points">
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
