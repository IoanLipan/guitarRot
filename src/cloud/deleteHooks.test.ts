import { describe, expect, it, vi } from 'vitest';
import { onBeforeAccountDelete, runBeforeDeleteHooks } from './deleteHooks';
import type { AccountUser } from './types';

const USER: AccountUser = { uid: 'u1', email: null, displayName: null, providers: [], emailVerified: false };

describe('the clean-ups that run before an account is deleted', () => {
  it('runs them in the order they were added', async () => {
    const calls: string[] = [];
    const offs = [
      onBeforeAccountDelete(() => void calls.push('a')),
      onBeforeAccountDelete(async () => void calls.push('b')),
    ];
    await runBeforeDeleteHooks(USER);
    offs.forEach((off) => off());
    expect(calls).toEqual(['a', 'b']);
  });

  it('runs a last clean-up after all the others, whenever it was added', async () => {
    const calls: string[] = [];
    const offs = [
      onBeforeAccountDelete(() => void calls.push('last'), { last: true }),
      onBeforeAccountDelete(() => void calls.push('first')),
      onBeforeAccountDelete(() => void calls.push('second')),
    ];
    await runBeforeDeleteHooks(USER);
    offs.forEach((off) => off());
    expect(calls).toEqual(['first', 'second', 'last']);
  });

  it('never gets to a last clean-up when another one fails, so a kept account keeps its name', async () => {
    const last = vi.fn();
    const offs = [
      onBeforeAccountDelete(last, { last: true }),
      onBeforeAccountDelete(() => {
        throw new Error('offline');
      }),
    ];
    await expect(runBeforeDeleteHooks(USER)).rejects.toMatchObject({ code: 'cleanup-failed' });
    offs.forEach((off) => off());
    expect(last).not.toHaveBeenCalled();
  });

  it('forgets a clean-up once it is removed, last ones included', async () => {
    const hook = vi.fn();
    const lastHook = vi.fn();
    onBeforeAccountDelete(hook)();
    onBeforeAccountDelete(lastHook, { last: true })();
    await runBeforeDeleteHooks(USER);
    expect(hook).not.toHaveBeenCalled();
    expect(lastHook).not.toHaveBeenCalled();
  });

  it('hands each one the person being deleted', async () => {
    const hook = vi.fn();
    const off = onBeforeAccountDelete(hook, { last: true });
    await runBeforeDeleteHooks(USER);
    off();
    expect(hook).toHaveBeenCalledWith(USER);
  });
});
