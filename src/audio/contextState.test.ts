import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  state: 'running' as AudioContextState,
  suspend: vi.fn(),
  resume: vi.fn(),
}));

vi.mock('tone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tone')>();
  return {
    ...actual,
    getContext: () => ({
      state: fake.state,
      rawContext: { state: fake.state, suspend: fake.suspend },
      resume: fake.resume,
    }),
  };
});

const { resumeAudio, suspendAudio } = await import('./contextState');

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
