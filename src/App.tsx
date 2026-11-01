import AppShell from '@/app/AppShell';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AccountProvider } from '@/cloud/AccountProvider';

export default function App() {
  return (
    <ErrorBoundary>
      {/* Accounts. Where the build has no Firebase config this renders its children and does nothing else. */}
      <AccountProvider>
        <AppShell />
      </AccountProvider>
    </ErrorBoundary>
  );
}
