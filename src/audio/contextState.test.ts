import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  state: 'running' as AudioContextState,
  suspend: vi.fn(),
  resume: vi.fn(),
  start: vi.fn(),
}));

vi.mock('tone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tone')>();
  return {
    ...actual,
    start: fake.start,
    getContext: () => ({
      state: fake.state,
      rawContext: { state: fake.state, suspend: fake.suspend },
      resume: fake.resume,
    }),
  };
});

const { resumeAudio, suspendAudio, wakeAudio } = await import('./contextState');

describe('suspendAudio / resumeAudio', () => {
  beforeEach(() => {
    fake.state = 'running';
    fake.suspend.mockReset().mockResolvedValue(undefined);
    fake.resume.mockReset().mockResolvedValue(undefined);
  });

  it('suspends a running context', async () => {
    await suspendAudio();
    expect(fake.suspend).toHaveBeenCalledTimes(1);
  });

  it('leaves a context that is not running alone', async () => {
    fake.state = 'suspended';
    await suspendAudio();
    expect(fake.suspend).not.toHaveBeenCalled();
  });

  it('resumes a suspended context', async () => {
    fake.state = 'suspended';
    await resumeAudio();
    expect(fake.resume).toHaveBeenCalledTimes(1);
  });

  it('resumes one the system interrupted too', async () => {
    fake.state = 'interrupted' as AudioContextState;
    await resumeAudio();
    expect(fake.resume).toHaveBeenCalledTimes(1);
  });

  it('does not resume a context that is already running', async () => {
    await resumeAudio();
    expect(fake.resume).not.toHaveBeenCalled();
  });

  it('never throws, because a failed suspend must not break the app', async () => {
    fake.suspend.mockRejectedValue(new Error('closed'));
    fake.resume.mockRejectedValue(new Error('closed'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(suspendAudio()).resolves.toBeUndefined();
    fake.state = 'suspended';
    await expect(resumeAudio()).resolves.toBeUndefined();
  });
});

describe('wakeAudio', () => {
  beforeEach(() => {
    fake.state = 'running';
    fake.start.mockReset().mockResolvedValue(undefined);
  });

  it('starts a context something else suspended, in the same turn as the gesture', () => {
    fake.state = 'suspended';
    wakeAudio();
    // Called synchronously: a resume after an await would no longer count as the user's.
    expect(fake.start).toHaveBeenCalledTimes(1);
  });

  it('starts an interrupted context too', () => {
    fake.state = 'interrupted' as AudioContextState;
    wakeAudio();
    expect(fake.start).toHaveBeenCalledTimes(1);
  });

  it('leaves a running context alone, so a touch costs nothing', () => {
    wakeAudio();
    expect(fake.start).not.toHaveBeenCalled();
  });

  it('never throws, whether Tone throws or rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fake.state = 'suspended';
    fake.start.mockRejectedValue(new Error('closed'));
    expect(() => wakeAudio()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();

    fake.start.mockImplementation(() => {
      throw new Error('no context');
    });
    expect(() => wakeAudio()).not.toThrow();
  });
});
