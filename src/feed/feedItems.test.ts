import { describe, expect, it } from 'vitest';
import { buildFeedItems } from './feedItems';

describe('buildFeedItems', () => {
  it('interleaves riff, chord, and quiz cards in the design handoff order', () => {
    const items = buildFeedItems({ random: () => 0.4 });
    expect(items.map((i) => i.kind)).toEqual([
      'riff', 'chord', 'quiz',
      'chord', 'riff', 'quiz',
      'riff', 'chord', 'quiz',
    ]);
  });

  it('alternates note and chord quiz questions', () => {
    const items = buildFeedItems({ random: () => 0.4 });
    const quizzes = items.filter((i) => i.kind === 'quiz');
    expect(quizzes.map((q) => q.question.kind)).toEqual(['note', 'chord', 'note']);
  });

  it('gives every card a unique id', () => {
    const items = buildFeedItems({ random: () => 0.4 });
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('cycles through content rather than repeating the first item every slot', () => {
    const items = buildFeedItems({ random: () => 0.4 });
    const riffIds = items.filter((i) => i.kind === 'riff').map((i) => i.riff.id);
    expect(new Set(riffIds).size).toBe(riffIds.length);
  });
});
