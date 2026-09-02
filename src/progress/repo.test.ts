import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, WebProgressRepo, createDebouncedSaver } from './repo';
import { emptyProgressState } from './types';

describe('WebProgressRepo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty state when nothing is stored', async () => {
    await expect(new WebProgressRepo().load()).resolves.toEqual(emptyProgressState());
  });

  it('round-trips a saved state', async () => {
    const repo = new WebProgressRepo();
    const state = emptyProgressState();
    state.seenContent = ['chromatic-warmup'];
    await repo.save(state);
    await expect(repo.load()).resolves.toEqual(state);
  });

  it('recovers from an unparseable blob instead of throwing', async () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');
    await expect(new WebProgressRepo().load()).resolves.toEqual(emptyProgressState());
  });

  it('discards a state from an unknown version', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    await expect(new WebProgressRepo().load()).resolves.toEqual(emptyProgressState());
  });

  it('exports the current state as JSON', async () => {
    const repo = new WebProgressRepo();
    const state = emptyProgressState();
    state.seenContent = ['a'];
    await repo.save(state);
    expect(JSON.parse(await repo.exportJson()).seenContent).toEqual(['a']);
  });

  it('imports an exported state', async () => {
    const repo = new WebProgressRepo();
    const state = emptyProgressState();
    state.seenContent = ['b'];
    await repo.importJson(JSON.stringify(state));
    await expect(repo.load()).resolves.toEqual(state);
  });

  it('refuses an import that is not a progress state', async () => {
    await expect(new WebProgressRepo().importJson('[]')).rejects.toThrow();
  });
});

describe('createDebouncedSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes once for a burst of saves', async () => {
    const repo = { save: vi.fn(async () => {}) };
    const saver = createDebouncedSaver(repo as never, 500);

    saver.save(emptyProgressState());
    saver.save(emptyProgressState());
    saver.save(emptyProgressState());
    expect(repo.save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('writes the most recent state, not the first', async () => {
    const repo = { save: vi.fn(async () => {}) };
    const saver = createDebouncedSaver(repo as never, 500);

    const first = emptyProgressState();
    const second = emptyProgressState();
    second.seenContent = ['latest'];

    saver.save(first);
    saver.save(second);
    await vi.advanceTimersByTimeAsync(500);

    expect(repo.save).toHaveBeenCalledWith(second);
  });

  it('flushes immediately when asked', async () => {
    const repo = { save: vi.fn(async () => {}) };
    const saver = createDebouncedSaver(repo as never, 500);
    saver.save(emptyProgressState());
    await saver.flush();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('does nothing on flush when there is nothing pending', async () => {
    const repo = { save: vi.fn(async () => {}) };
    await createDebouncedSaver(repo as never, 500).flush();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
