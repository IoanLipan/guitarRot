import AppShell from '@/app/AppShell';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AccountProvider } from '@/cloud/AccountProvider';
import { ProfileProvider } from '@/cloud/ProfileProvider';

export default function App() {
  return (
    <ErrorBoundary>
      {/* Accounts. Where the build has no Firebase config this renders its children and does nothing else. */}
      <AccountProvider>
        {/* The signed-in person's username. Fetches nothing until somebody is signed in. */}
        <ProfileProvider>
          <AppShell />
        </ProfileProvider>
      </AccountProvider>
    </ErrorBoundary>
  );
}
