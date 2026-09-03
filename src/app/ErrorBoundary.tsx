import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence against a blank screen.
 *
 * React unmounts the entire tree on an uncaught error — including one thrown
 * from an effect cleanup, which is how a Tone.js timing error during feed
 * teardown used to wipe the whole app. Anything that still gets through
 * lands here and offers a way back instead of a black rectangle.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('guitarRot crashed:', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-ground p-8 text-center">
        <h1 className="text-2xl font-black">That went sideways.</h1>
        <p className="max-w-xs text-sm text-ink-dim">
          Something broke mid-session. Your progress is saved — picking up where you left off
          should work.
        </p>
        <p className="max-w-xs font-mono text-xs break-words text-[#5f5f6b]">{error.message}</p>
        <button
          type="button"
          onClick={this.handleReset}
          className="rounded-full bg-accent px-8 py-4 text-lg font-extrabold text-ground active:scale-95"
        >
          Keep going
        </button>
      </main>
    );
  }
}

export default ErrorBoundary;
