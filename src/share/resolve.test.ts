import { describe, expect, it } from 'vitest';
import { CHORDS, RIFFS, SONGS } from '@/content';
import { generateFeedPage, mulberry32 } from '@/feed/generator';
import { formatShareId, parseShareId } from './shareId';
import { resolveShareTarget, shareTargetOf } from './resolve';

describe('shareTargetOf', () => {
  it('addresses a card by its content, not its position in the feed', () => {
    // Two runs put the same riff at different indices; the share id must not
    // move with it, or a link would rot the moment the feed regenerated.
    const page = generateFeedPage(20, undefined, mulberry32(7));
    for (const item of page.items) {
      const target = shareTargetOf(item);
      expect(parseShareId(formatShareId(target))).toEqual(target);
      expect(target.id).not.toContain('feed-');
    }
  });
});

describe('resolveShareTarget', () => {
  it('round-trips every card a seeded feed produces', () => {
    const page = generateFeedPage(40, undefined, mulberry32(11));
    for (const item of page.items) {
      const resolved = resolveShareTarget(shareTargetOf(item));
      expect(resolved, `${item.kind} ${item.id} did not resolve`).not.toBeNull();
      expect(resolved?.tab).toBe('feed');
    }
  });

  it('resolves a riff to the same riff', () => {
    const riff = RIFFS[0]!;
    const resolved = resolveShareTarget({ kind: 'riff', id: riff.id });
    expect(resolved).toEqual({ tab: 'feed', item: expect.objectContaining({ kind: 'riff', riff }) });
  });

  it('resolves a chord to the same shape', () => {
    const chord = CHORDS[1]!;
    const resolved = resolveShareTarget({ kind: 'chord', id: chord.id });
    expect(resolved?.tab).toBe('feed');
  });

  it('rebuilds a note quiz from the fret its id names', () => {
    const resolved = resolveShareTarget({ kind: 'quiz', id: 'note-s0f3' });
    expect(resolved).toMatchObject({
      tab: 'feed',
      item: { kind: 'quiz', question: { position: { stringIndex: 0, fret: 3 }, correctAnswer: 'G' } },
    });
  });

  it('sends a song link to the songs tab', () => {
    const song = SONGS[0]!;
    expect(resolveShareTarget({ kind: 'song', id: song.id })).toEqual({ tab: 'songs', song });
  });

  it('returns null rather than inventing content for a dead link', () => {
    expect(resolveShareTarget({ kind: 'riff', id: 'no-such-riff' })).toBeNull();
    expect(resolveShareTarget({ kind: 'song', id: 'no-such-song' })).toBeNull();
    expect(resolveShareTarget({ kind: 'chord', id: 'no-such-chord' })).toBeNull();
    expect(resolveShareTarget({ kind: 'quiz', id: 'note-s9f3' })).toBeNull();
    expect(resolveShareTarget({ kind: 'quiz', id: 'note-s0f99' })).toBeNull();
    expect(resolveShareTarget({ kind: 'quiz', id: 'chord-nope' })).toBeNull();
    expect(resolveShareTarget({ kind: 'quiz', id: 'gibberish' })).toBeNull();
  });
});
