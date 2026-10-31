import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, toneProfilesFor, type AudioEngine } from '@/audio';
import { fakeProgressHandle } from './testkit';
import type { ProgressHandle } from './useProgress';

const isNative = vi.hoisted(() => vi.fn(() => false));

// Only `Capacitor.isNativePlatform` is swapped; the rest of core stays real.
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: isNative } };
});

const { SettingsSheet } = await import('./SettingsSheet');

const PRIVACY_URL = 'https://guitar-rot.vercel.app/privacy.html';
const APK_URL = 'https://github.com/IoanLipan/guitarRot/releases/latest/download/guitarRot.apk';

function fakeEngine(): AudioEngine {
  return {
    backend: 'sampled',
    unlocked: true,
    tone: getToneProfile('acoustic'),
    setTone: vi.fn(),
    init: vi.fn(() => Promise.resolve()),
    unlock: vi.fn(() => Promise.resolve()),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

function fakeProgress(): ProgressHandle {
  return fakeProgressHandle();
}

function renderSheet(progress = fakeProgress(), engine = fakeEngine()) {
  render(<SettingsSheet open onClose={vi.fn()} engine={engine} progress={progress} />);
  return { progress, engine };
}

beforeEach(() => {
  isNative.mockReturnValue(false);
});

describe('SettingsSheet', () => {
  it('renders nothing while closed', () => {
    render(
      <SettingsSheet open={false} onClose={vi.fn()} engine={fakeEngine()} progress={fakeProgress()} />,
    );
    expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
  });

  it('draws the chosen tone\'s check and the About links\' arrow as SVG icons, not text glyphs', () => {
    renderSheet();
    expect(screen.getByTestId('tone-acoustic').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('tone-acoustic').textContent).not.toMatch(/[♪✓]/);
    expect(screen.getByTestId('privacy-link').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('privacy-link').textContent).not.toContain('↗');
    expect(screen.getByRole('button', { name: 'Close settings' })).toBeInTheDocument();
  });

  it('still lets you pick a tone and hear it', async () => {
    const { progress, engine } = renderSheet();

    await userEvent.click(screen.getByTestId('tone-clean'));

    expect(progress.updateSettings).toHaveBeenCalledWith({ toneId: 'clean' });
    expect(engine.setTone).toHaveBeenCalled();
    expect(engine.strum).toHaveBeenCalled();
  });
});

describe('SettingsSheet About section', () => {
  it('shows the app version, taken from package.json at build time', () => {
    renderSheet();
    const about = screen.getByTestId('about-section');

    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/);
    expect(within(about).getByTestId('app-version')).toHaveTextContent(`v${__APP_VERSION__}`);
  });

  it('links to the privacy policy and opens it outside the app', () => {
    renderSheet();
    const link = screen.getByTestId('privacy-link');

    expect(link).toHaveAttribute('href', PRIVACY_URL);
    // target=_blank is what keeps the Android WebView from navigating away: Capacitor
    // hands any address that is not the app's own to the system browser.
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('keeps the sample credit, inside About', () => {
    renderSheet();

    const credit = screen.getByTestId('sample-credit');
    expect(credit).toHaveTextContent('tonejs-instruments');
    expect(credit).toHaveTextContent('Ukulele samples: FreePats Ukulele, recorded by Mateusz Dąbrowski, CC0.');
    expect(within(screen.getByTestId('about-section')).getByTestId('sample-credit')).toBe(credit);
  });

  it('credits the CC BY song edition, inside About, next to the sample credit', () => {
    renderSheet();

    const credit = screen.getByTestId('edition-credit');
    expect(credit).toHaveTextContent(
      'Canon in D edition: Michael Fischer v. Mollard, Mutopia Project, CC BY 4.0.',
    );
    expect(within(screen.getByTestId('about-section')).getByTestId('edition-credit')).toBe(credit);
    expect(screen.getByTestId('sample-credit').nextElementSibling).toBe(credit);
  });

  it('offers the Android app on the web', () => {
    renderSheet();

    const link = screen.getByTestId('android-app-link');
    expect(link).toHaveAttribute('href', APK_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not offer the Android app inside the Android app, but keeps the privacy link', () => {
    isNative.mockReturnValue(true);
    renderSheet();

    expect(screen.queryByTestId('android-app-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('privacy-link')).toHaveAttribute('href', PRIVACY_URL);
  });
});

describe('SettingsSheet as a dialog', () => {
  it('is a modal dialog named by its heading', () => {
    renderSheet();

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toBe(screen.getByTestId('settings-sheet'));
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();
  });

  it('puts the cursor on Done when it opens, and keeps the dimmed screen out of the Tab order', () => {
    renderSheet();

    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Close settings' })).toHaveAttribute('tabindex', '-1');
  });

  it('has a 36 by 4 grab handle, and a panel whose scroll does not carry on into the page behind', () => {
    renderSheet();

    const handle = screen.getByTestId('sheet-handle');
    expect(handle).toHaveClass('h-1', 'w-9');
    expect(handle).toHaveAttribute('aria-hidden', 'true');
    expect(handle.parentElement?.parentElement).toHaveClass('overscroll-contain', 'overflow-y-auto');
  });

  it('heads its sections in the quiet label style, in sentence case', () => {
    renderSheet();

    for (const name of ['Guitar tone', 'Sound', 'About']) {
      const head = screen.getByRole('heading', { level: 3, name });
      expect(head).toHaveClass('label');
      expect(head.className).not.toMatch(/uppercase|tracking-/);
    }
  });

  /** The app shell in miniature: the things the sheet must shut out, and the gear that opens it. */
  function Shell({ open }: { open: boolean }) {
    return (
      <div>
        <aside data-testid="banner">Get the app</aside>
        <main data-testid="main">
          <button type="button" aria-label="Settings">
            Gear
          </button>
        </main>
        <nav data-testid="nav">
          <button type="button">Feed</button>
        </nav>
        <SettingsSheet open={open} onClose={vi.fn()} engine={fakeEngine()} progress={fakeProgress()} />
      </div>
    );
  }

  it('shuts the app behind it out while it is open (inert), and gives it back when it closes', () => {
    const { rerender } = render(<Shell open={false} />);
    for (const id of ['banner', 'main', 'nav']) expect(screen.getByTestId(id)).not.toHaveAttribute('inert');

    rerender(<Shell open />);
    for (const id of ['banner', 'main', 'nav']) expect(screen.getByTestId(id)).toHaveAttribute('inert');
    expect(screen.getByTestId('settings-sheet')).not.toHaveAttribute('inert');

    rerender(<Shell open={false} />);
    for (const id of ['banner', 'main', 'nav']) expect(screen.getByTestId(id)).not.toHaveAttribute('inert');
  });

  it('takes the cursor in on Done, and puts it back on the gear that opened it', () => {
    const { rerender } = render(<Shell open={false} />);
    const gear = screen.getByRole('button', { name: 'Settings' });
    gear.focus();

    rerender(<Shell open />);
    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();

    rerender(<Shell open={false} />);
    expect(gear).toHaveFocus();
  });

  it('finds the gear again when the tap that opened it never focused it (Safari does not focus a tapped button)', () => {
    const { rerender } = render(<Shell open={false} />);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.body).toHaveFocus();

    rerender(<Shell open />);
    rerender(<Shell open={false} />);

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('leaves what it did not shut alone: an element that was already inert stays so', () => {
    const { rerender } = render(<Shell open={false} />);
    screen.getByTestId('banner').setAttribute('inert', '');

    rerender(<Shell open />);
    rerender(<Shell open={false} />);

    expect(screen.getByTestId('banner')).toHaveAttribute('inert');
    expect(screen.getByTestId('main')).not.toHaveAttribute('inert');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<SettingsSheet open onClose={onClose} engine={fakeEngine()} progress={fakeProgress()} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab on its own controls', async () => {
    renderSheet();
    const done = screen.getByRole('button', { name: 'Done' });
    expect(done).toHaveFocus();

    await userEvent.tab({ shift: true });
    // Shift+Tab from the first stop wraps to the last control in the sheet, not out of it.
    expect(screen.getByTestId('settings-sheet')).toContainElement(document.activeElement as HTMLElement);
  });
});

describe('SettingsSheet tone choice', () => {
  const ids = toneProfilesFor('guitar').map((profile) => profile.id);

  it('is a radio group named for the tone, with one radio per tone and the current one checked', () => {
    renderSheet();

    const group = screen.getByRole('radiogroup', { name: 'Guitar tone' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('data-testid'))).toEqual(ids.map((id) => `tone-${id}`));
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(
      ids.map((id) => (id === 'acoustic' ? 'true' : 'false')),
    );
    // They are not toggle buttons any more.
    for (const radio of radios) expect(radio).not.toHaveAttribute('aria-pressed');
  });

  it('marks the chosen row with a check, and does not repeat an icon on every row', () => {
    renderSheet();

    expect(screen.getAllByTestId('tone-check')).toHaveLength(1);
    expect(within(screen.getByTestId('tone-acoustic')).getByTestId('tone-check').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('tone-clean').querySelector('svg')).toBeNull();
  });

  it('is one Tab stop: the chosen tone', () => {
    renderSheet();

    const tones = within(screen.getByRole('radiogroup', { name: 'Guitar tone' }));
    const stops = tones.getAllByRole('radio').filter((radio) => radio.tabIndex === 0);
    expect(stops).toEqual([screen.getByTestId('tone-acoustic')]);
  });

  it('moves with the arrow keys: the next tone is chosen, heard, and holds the cursor', async () => {
    const { progress, engine } = renderSheet();
    screen.getByTestId('tone-acoustic').focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(progress.updateSettings).toHaveBeenCalledWith({ toneId: ids[1] });
    expect(engine.setTone).toHaveBeenCalled();
    expect(engine.strum).toHaveBeenCalled();
    expect(screen.getByTestId(`tone-${ids[1]}`)).toHaveFocus();
  });

  it('wraps round at either end', async () => {
    const { progress } = renderSheet();
    screen.getByTestId('tone-acoustic').focus();

    await userEvent.keyboard('{ArrowUp}');

    expect(progress.updateSettings).toHaveBeenLastCalledWith({ toneId: ids[ids.length - 1] });
    expect(screen.getByTestId(`tone-${ids[ids.length - 1]}`)).toHaveFocus();
  });

  it('follows the stored tone', () => {
    const progress = fakeProgress();
    progress.state.settings.toneId = 'clean';
    renderSheet(progress);

    expect(screen.getByTestId('tone-clean')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('tone-acoustic')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('tone-clean').tabIndex).toBe(0);
  });
});
