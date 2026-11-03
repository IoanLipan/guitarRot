import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIDDEN_KEY, MAX_HIDDEN, parseHidden, useHiddenPlayers, withHidden } from './hidden';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('parseHidden', () => {
  it('reads a stored list of ids', () => {
    expect(parseHidden('["a","b"]')).toEqual(['a', 'b']);
  });

  it('is an empty list for nothing, for damaged text and for anything that is not a list of ids', () => {
    for (const raw of [null, '', 'not json', '{"a":1}', '"a"', '42', 'null']) expect(parseHidden(raw), String(raw)).toEqual([]);
  });

  it('keeps only the strings, once each', () => {
    expect(parseHidden('["a",1,null,"","b","a",{"x":1}]')).toEqual(['a', 'b']);
  });

  it('keeps the newest when the list is longer than the limit', () => {
    const many = Array.from({ length: MAX_HIDDEN + 5 }, (_, i) => `u${i}`);
    const kept = parseHidden(JSON.stringify(many));
    expect(kept).toHaveLength(MAX_HIDDEN);
    expect(kept[kept.length - 1]).toBe(`u${MAX_HIDDEN + 4}`);
  });
});

describe('withHidden', () => {
  it('puts the id on the end and leaves the first list alone', () => {
    const before = ['a'];
    expect(withHidden(before, 'b')).toEqual(['a', 'b']);
    expect(before).toEqual(['a']);
  });

  it('does not add an id twice', () => {
    expect(withHidden(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });

  it('forgets the oldest past the limit', () => {
    const full = Array.from({ length: MAX_HIDDEN }, (_, i) => `u${i}`);
    const next = withHidden(full, 'new');
    expect(next).toHaveLength(MAX_HIDDEN);
    expect(next[0]).toBe('u1');
    expect(next[next.length - 1]).toBe('new');
  });
});

describe('useHiddenPlayers', () => {
  it('starts with nobody hidden', () => {
    const { result } = renderHook(() => useHiddenPlayers());
    expect(result.current.count).toBe(0);
    expect(result.current.isHidden('a')).toBe(false);
  });

  it('hides a player and remembers it on the phone', () => {
    const { result } = renderHook(() => useHiddenPlayers());
    act(() => result.current.hide('a'));
    expect(result.current.isHidden('a')).toBe(true);
    expect(result.current.isHidden('b')).toBe(false);
    expect(result.current.count).toBe(1);
    expect(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? 'null')).toEqual(['a']);
  });

  it('counts a player once however often they are hidden', () => {
    const { result } = renderHook(() => useHiddenPlayers());
    act(() => result.current.hide('a'));
    act(() => result.current.hide('a'));
    expect(result.current.count).toBe(1);
  });

  it('is still hidden after the app restarts', () => {
    const first = renderHook(() => useHiddenPlayers());
    act(() => first.result.current.hide('a'));
    first.unmount();

    const second = renderHook(() => useHiddenPlayers());
    expect(second.result.current.isHidden('a')).toBe(true);
    expect(second.result.current.count).toBe(1);
  });

  it('brings everyone back, and clears the stored list', () => {
    const { result } = renderHook(() => useHiddenPlayers());
    act(() => result.current.hide('a'));
    act(() => result.current.hide('b'));
    act(() => result.current.showAll());
    expect(result.current.count).toBe(0);
    expect(result.current.isHidden('a')).toBe(false);
    expect(localStorage.getItem(HIDDEN_KEY)).toBeNull();
  });

  it('ignores damaged storage', () => {
    localStorage.setItem(HIDDEN_KEY, '{{{');
    const { result } = renderHook(() => useHiddenPlayers());
    expect(result.current.count).toBe(0);
    act(() => result.current.hide('a'));
    expect(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? 'null')).toEqual(['a']);
  });

  it('still works for this visit when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useHiddenPlayers());
    act(() => result.current.hide('a'));
    expect(result.current.isHidden('a')).toBe(true);
    act(() => result.current.showAll());
    expect(result.current.count).toBe(0);
  });
});
