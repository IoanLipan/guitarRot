import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { AccountApi, AccountState } from './types';

// Counts what gets loaded. A mock factory runs only when its module is first imported.
const loaded = vi.hoisted(() => ({ firebaseApp: 0, firebaseAuth: 0, firebaseFirestore: 0 }));
vi.mock('firebase/app', () => {
  loaded.firebaseApp += 1;
  return {};
});
vi.mock('firebase/auth', () => {
  loaded.firebaseAuth += 1;
  return {};
});
vi.mock('firebase/firestore', () => {
  loaded.firebaseFirestore += 1;
  return {};
});

afterEach(() => {
  vi.doUnmock('./config');
  vi.doUnmock('./auth');
  vi.resetModules();
  vi.useRealTimers();
});

/** A fresh copy of the provider, built for a project that has cloud features on or off. */
async function providerWith(cloudEnabled: boolean, service?: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock('./config', () => ({ cloudEnabled }));
  if (service !== undefined) vi.doMock('./auth', () => service);
  return import('./AccountProvider');
}

function Probe({ useAccount }: { useAccount: () => AccountApi }) {
  const account = useAccount();
  return (
    <p data-testid="probe">
      {account.status}:{account.user?.email ?? 'nobody'}
    </p>
  );
}

describe('with cloud features off', () => {
  it('is disabled, loads no Firebase and not even the account service', async () => {
    const watchAccount = vi.fn();
    const { AccountProvider, useAccount } = await providerWith(false, { watchAccount });
    render(
      <AccountProvider>
        <Probe useAccount={useAccount} />
      </AccountProvider>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(screen.getByTestId('probe')).toHaveTextContent('disabled:nobody');
    expect(watchAccount).not.toHaveBeenCalled();
    expect(loaded).toEqual({ firebaseApp: 0, firebaseAuth: 0, firebaseFirestore: 0 });
  });

  it('is disabled with no provider at all, and every action refuses in plain words', async () => {
    const { useAccount } = await providerWith(false);
    let account: AccountApi | undefined;
    function Grab() {
      account = useAccount();
      return null;
    }
    render(<Grab />);

    expect(account?.status).toBe('disabled');
    await expect(account?.signInWithGoogle()).rejects.toMatchObject({ code: 'cloud-disabled' });
    await expect(account?.deleteAccount()).rejects.toMatchObject({ code: 'cloud-disabled' });
  });
});

describe('with cloud features on', () => {
  it('starts loading, waits until the page is quiet, then follows the service', async () => {
    vi.useFakeTimers();
    let push: (state: AccountState) => void = () => undefined;
    const stop = vi.fn();
    const watchAccount = vi.fn((onState: (state: AccountState) => void) => {
      push = onState;
      return stop;
    });
    const { AccountProvider, useAccount } = await providerWith(true, { watchAccount });

    const view = render(
      <AccountProvider>
        <Probe useAccount={useAccount} />
      </AccountProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('loading:nobody');
    // Nothing is fetched while the first screen is being drawn.
    expect(watchAccount).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(watchAccount).toHaveBeenCalledTimes(1);

    act(() => push({ status: 'signed-out', user: null }));
    expect(screen.getByTestId('probe')).toHaveTextContent('signed-out:nobody');

    act(() =>
      push({
        status: 'signed-in',
        user: { uid: 'u1', email: 'ada@example.com', displayName: 'Ada', providers: ['password'], emailVerified: false },
      }),
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('signed-in:ada@example.com');

    view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('shows the sign-in card rather than loading forever when the service cannot be fetched', async () => {
    vi.useFakeTimers();
    const { AccountProvider, useAccount } = await providerWith(true, {
      get watchAccount() {
        throw new Error('Failed to fetch dynamically imported module');
      },
    });
    render(
      <AccountProvider>
        <Probe useAccount={useAccount} />
      </AccountProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('signed-out:nobody');
  });

  it('hands an action to the service and turns its failure into a sentence', async () => {
    const signOut = vi.fn(async () => undefined);
    const signInWithEmail = vi.fn(async () => {
      throw Object.assign(new Error('x'), { code: 'auth/too-many-requests' });
    });
    const { AccountProvider, useAccount } = await providerWith(true, {
      watchAccount: () => () => undefined,
      signOut,
      signInWithEmail,
    });
    let account: AccountApi | undefined;
    function Grab() {
      account = useAccount();
      return null;
    }
    render(
      <AccountProvider>
        <Grab />
      </AccountProvider>,
    );

    await account?.signOut();
    expect(signOut).toHaveBeenCalledTimes(1);
    await expect(account?.signInWithEmail({ email: 'a@b.co', password: 'secret1' })).rejects.toMatchObject({
      code: 'auth/too-many-requests',
      message: expect.stringMatching(/Too many tries/),
    });
    await waitFor(() => expect(signInWithEmail).toHaveBeenCalledTimes(1));
  });
});
