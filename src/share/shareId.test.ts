import { describe, expect, it } from 'vitest';
import { formatShareId, parseShareId, readShareTarget, shareUrl } from './shareId';

describe('share ids', () => {
  it('round-trips a target', () => {
    const target = { kind: 'riff', id: 'blues-shuffle-e' } as const;
    expect(parseShareId(formatShareId(target))).toEqual(target);
  });

  it('keeps the colon unescaped so a link stays readable', () => {
    expect(shareUrl({ kind: 'song', id: 'tom-dooley' })).toBe(
      'https://guitar-rot.vercel.app/?p=song:tom-dooley',
    );
  });

  it('splits on the first colon only, so ids may contain one', () => {
    expect(parseShareId('quiz:note-s0f3')).toEqual({ kind: 'quiz', id: 'note-s0f3' });
  });

  it('rejects an unknown kind', () => {
    expect(parseShareId('lesson:whatever')).toBeNull();
  });

  it('rejects an id that could smuggle characters into a URL', () => {
    expect(parseShareId('riff:../../etc/passwd')).toBeNull();
    expect(parseShareId('riff:a b')).toBeNull();
    expect(parseShareId('riff:')).toBeNull();
    expect(parseShareId('riff')).toBeNull();
  });

  it('reads a target out of a query string', () => {
    expect(readShareTarget('?p=chord:Am-open')).toEqual({ kind: 'chord', id: 'Am-open' });
    expect(readShareTarget('?other=1')).toBeNull();
    expect(readShareTarget('')).toBeNull();
  });
});
