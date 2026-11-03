import { AppleMark } from './AppleMark';
import { appleSignInAvailable } from './config';
import { GoogleMark } from './GoogleMark';

export type ProviderId = 'google' | 'apple';

/**
 * "Continue with Google" and, where Apple sign-in is switched on for the build
 * (VITE_AUTH_APPLE=1), "Continue with Apple". The two are the same size and sit in
 * the same stack, so neither is the lesser choice, and each is drawn the way its
 * owner asks (Google's dark button with their four-colour G, Apple's white button
 * with their black logo, which is Apple's own style for a dark screen).
 */
export function ProviderButtons({
  busy,
  disabled,
  onChoose,
}: {
  /** The provider whose window is open. */
  busy: ProviderId | null;
  disabled: boolean;
  onChoose: (provider: ProviderId) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-testid="provider-buttons">
      <button
        type="button"
        onClick={() => onChoose('google')}
        disabled={disabled}
        data-testid="google-sign-in"
        className="press flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#8e918f] bg-[#131314] px-4 text-[15px] font-medium text-[#e3e3e3] [font-family:Roboto,ui-sans-serif,system-ui,sans-serif] disabled:opacity-60"
      >
        <GoogleMark size={20} />
        {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {appleSignInAvailable() && (
        <button
          type="button"
          onClick={() => onChoose('apple')}
          disabled={disabled}
          data-testid="apple-sign-in"
          className="press flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-white bg-white px-4 text-[17px] font-semibold text-black [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',ui-sans-serif,system-ui,sans-serif] disabled:opacity-60"
        >
          <AppleMark size={20} className="-mt-0.5" />
          {busy === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
        </button>
      )}
    </div>
  );
}
