import type { LessonStep } from '@/content';
import { RichText } from './RichText';
import { StepKicker } from './StepHeading';

export function TextStep({ step }: { step: Extract<LessonStep, { kind: 'text' }> }) {
  return (
    <article className="flex flex-col gap-5" data-testid="step-text">
      <div className="flex flex-col gap-1.5">
        <StepKicker>Read</StepKicker>
        {step.title !== undefined && (
          <h2 className="text-2xl leading-tight font-black">{step.title}</h2>
        )}
      </div>
      {/* 17px on a 350px column is about 38 characters a line: short enough to
          read without losing your place, with room for the generous leading. */}
      {step.body.map((paragraph, index) => (
        <p key={index} className="text-[17px] leading-[1.7] text-ink">
          <RichText>{paragraph}</RichText>
        </p>
      ))}
    </article>
  );
}

export default TextStep;
