import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AccountContext } from './AccountProvider';
import { needsUsername, ProfileProvider, useProfile } from './ProfileProvider';
import type { AccountApi, ProfileState } from './types';

const world = vi.hoisted(() => ({
  cloud: true,
  watchProfile: vi.fn(),
}));

vi.mock('./config', () => ({
  get cloudEnabled() {
    return world.cloud;
  },
}));
vi.mock('./usernames', () => ({ watchProfile: world.watchProfile }));

const actions = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  setUsername: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};

const ADA = { uid: 'ada', email: 'ada@example.com', displayName: null, providers: ['google.com'], emailVerified: true };
const GRACE = { ...ADA, uid: 'grace' };

function Probe() {
  const profile = useProfile();
  return <p data-testid="probe">{profile.status}:{profile.username ?? 'none'}</p>;
}

function tree(account: Partial<AccountApi>): ReactNode {
  return (
    <AccountContext.Provider value={{ status: 'signed-out', user: null, ...actions, ...account } as AccountApi}>
      <ProfileProvider>
        <Probe />
      </ProfileProvider>
    </AccountContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  world.watchProfile.mockReset();
  world.cloud = true;
});

describe('the profile of the signed-in person', () => {
  it('is unknown, and asks Firestore for nothing, while nobody is signed in', async () => {
    render(tree({ status: 'signed-out', user: null }));
    await act(async () => undefined);
    expect(screen.getByTestId('probe')).toHaveTextContent('unknown:none');
    expect(world.watchProfile).not.toHaveBeenCalled();
  });

  it('follows the profile of the person who signs in', async () => {
    let push: (state: ProfileState) => void = () => undefined;
    world.watchProfile.mockImplementation((_uid: string, onChange: (state: ProfileState) => void) => {
      push = onChange;
      return vi.fn();
    });
    render(tree({ status: 'signed-in', user: ADA }));
    await vi.waitFor(() => expect(world.watchProfile).toHaveBeenCalledWith('ada', expect.any(Function)));
    expect(screen.getByTestId('probe')).toHaveTextContent('unknown:none');

    act(() => push({ status: 'ready', username: null }));
    expect(screen.getByTestId('probe')).toHaveTextContent('ready:none');
    act(() => push({ status: 'ready', username: 'ada_l' }));
    expect(screen.getByTestId('probe')).toHaveTextContent('ready:ada_l');
  });

  it('stops following when the person signs out, and lets go of what it knew at once', async () => {
    const stop = vi.fn();
    let push: (state: ProfileState) => void = () => undefined;
    world.watchProfile.mockImplementation((_uid: string, onChange: (state: ProfileState) => void) => {
      push = onChange;
      return stop;
    });
    const { rerender } = render(tree({ status: 'signed-in', user: ADA }));
    await vi.waitFor(() => expect(world.watchProfile).toHaveBeenCalled());
    act(() => push({ status: 'ready', username: 'ada_l' }));

    rerender(tree({ status: 'signed-out', user: null }));
    expect(screen.getByTestId('probe')).toHaveTextContent('unknown:none');
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('never shows one person the previous person’s username', async () => {
    const pushes = new Map<string, (state: ProfileState) => void>();
    world.watchProfile.mockImplementation((uid: string, onChange: (state: ProfileState) => void) => {
      pushes.set(uid, onChange);
      return vi.fn();
    });
    const { rerender } = render(tree({ status: 'signed-in', user: ADA }));
    await vi.waitFor(() => expect(pushes.has('ada')).toBe(true));
    act(() => pushes.get('ada')?.({ status: 'ready', username: 'ada_l' }));

    rerender(tree({ status: 'signed-in', user: GRACE }));
    expect(screen.getByTestId('probe')).toHaveTextContent('unknown:none');
    await vi.waitFor(() => expect(pushes.has('grace')).toBe(true));
    act(() => pushes.get('grace')?.({ status: 'ready', username: null }));
    expect(screen.getByTestId('probe')).toHaveTextContent('ready:none');
  });

  it('stays unknown when the profile can not be read', async () => {
    world.watchProfile.mockImplementation((_uid: string, onChange: (state: ProfileState) => void) => {
      onChange({ status: 'unknown', username: null });
      return vi.fn();
    });
    render(tree({ status: 'signed-in', user: ADA }));
    await act(async () => undefined);
    expect(screen.getByTestId('probe')).toHaveTextContent('unknown:none');
  });

  it('does nothing at all in a build without cloud features', async () => {
    world.cloud = false;
    render(tree({ status: 'signed-in', user: ADA }));
    await act(async () => undefined);
    expect(world.watchProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId('probe')).toHaveTextContent('unknown:none');
  });
});

describe('needsUsername', () => {
  it('is true only for a signed-in person the server says has no username', () => {
    expect(needsUsername({ status: 'signed-in' }, { status: 'ready', username: null })).toBe(true);
    expect(needsUsername({ status: 'signed-in' }, { status: 'ready', username: 'ada_l' })).toBe(false);
    expect(needsUsername({ status: 'signed-in' }, { status: 'unknown', username: null })).toBe(false);
    expect(needsUsername({ status: 'signed-out' }, { status: 'ready', username: null })).toBe(false);
    expect(needsUsername({ status: 'disabled' }, { status: 'unknown', username: null })).toBe(false);
  });
});
