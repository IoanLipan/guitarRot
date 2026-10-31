import { describe, expect, it } from 'vitest';
import { RIFFS, getSong, songsFor } from '@/content';
import { generateFeedPage, emptyCursor, mulberry32 } from '@/feed/generator';
import { resolveShareTarget, shareTargetOf, sharedInstrument } from './resolve';

function resolved(target: Parameters<typeof resolveShareTarget>[0]) {
  const content = resolveShareTarget(target);
  if (content === null) throw new Error(`did not resolve: ${target.kind}:${target.id}`);
  return content;
}

describe('sharing across instruments', () => {
  it('shares a ukulele chord by its id and opens it as the same chord', () => {
    const content = resolved({ kind: 'chord', id: 'uke-Am' });
    expect(content.tab).toBe('feed');
    if (content.tab === 'feed' && content.item.kind === 'chord') {
      expect(content.item.chord.instrument).toBe('ukulele');
    }
  });

  it('shares a ukulele quiz question by its id, and it opens on the ukulele\'s neck', () => {
    const content = resolved({ kind: 'quiz', id: 'note-uke-s3f3' });
    if (content.tab !== 'feed' || content.item.kind !== 'quiz') throw new Error('not a quiz');
    expect(content.item.question).toMatchObject({ kind: 'note', instrument: 'ukulele', correctAnswer: 'C' });
  });

  it('round-trips every card a ukulele feed produces', () => {
    const page = generateFeedPage(40, emptyCursor(), mulberry32(11), [], 'ukulele');
    for (const item of page.items) {
      const content = resolveShareTarget(shareTargetOf(item));
      expect(content, `${item.kind} ${item.id}`).not.toBeNull();
    }
  });
});

describe('the instrument a link needs', () => {
  it('is the ukulele for a ukulele chord or question, whoever opens it', () => {
    expect(sharedInstrument(resolved({ kind: 'chord', id: 'uke-C' }), 'guitar')).toBe('ukulele');
    expect(sharedInstrument(resolved({ kind: 'quiz', id: 'note-uke-s1f2' }), 'guitar')).toBe('ukulele');
    expect(sharedInstrument(resolved({ kind: 'quiz', id: 'chord-uke-Em' }), 'guitar')).toBe('ukulele');
  });

  it('is the guitar for a guitar chord, riff or question, whoever opens it', () => {
    expect(sharedInstrument(resolved({ kind: 'chord', id: 'E-open' }), 'ukulele')).toBe('guitar');
    expect(sharedInstrument(resolved({ kind: 'riff', id: RIFFS[0]!.id }), 'ukulele')).toBe('guitar');
    expect(sharedInstrument(resolved({ kind: 'quiz', id: 'note-s2f3' }), 'ukulele')).toBe('guitar');
  });

  it('leaves a song both can play on whatever the person already plays', () => {
    const both = songsFor('ukulele')[0];
    if (both === undefined) throw new Error('no shared song');
    expect(sharedInstrument(resolved({ kind: 'song', id: both.id }), 'ukulele')).toBe('ukulele');
    expect(sharedInstrument(resolved({ kind: 'song', id: both.id }), 'guitar')).toBe('guitar');
  });

  it('moves a ukulele player to the guitar for a song only the guitar can play', () => {
    const tab = getSong('ode-to-joy');
    if (tab === undefined) throw new Error('no ode to joy');
    expect(sharedInstrument(resolved({ kind: 'song', id: tab.id }), 'ukulele')).toBe('guitar');
    expect(sharedInstrument(resolved({ kind: 'song', id: tab.id }), 'guitar')).toBe('guitar');
  });
});
